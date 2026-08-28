# Technical Documentation

Implementation reference: repository layout, module responsibilities, key algorithms in runnable form,
setup, and the runbook. [`Architecture.md`](./Architecture.md) says *why*; this document says *how*.

---

## 1. Repository layout

```
loom/
├── backend/
│   ├── loom/
│   │   ├── api/
│   │   │   ├── main.py                 FastAPI app, lifespan, CORS, exception handlers
│   │   │   ├── deps.py                 DI: Settings, ModelBundle, repositories, Clock
│   │   │   ├── schemas/                Pydantic request/response models
│   │   │   └── routers/                sessions.py content.py experiments.py models.py ws.py
│   │   ├── services/                   session.py decision.py experiment.py content.py
│   │   │                               calibration.py narrative.py
│   │   ├── agent/                      PURE — no I/O
│   │   │   ├── controller.py           AgentController: the loop
│   │   │   ├── state_engine.py         StateEngine: observation -> new LearnerState
│   │   │   ├── actions.py              ActionGenerator + legality rules
│   │   │   ├── scorer.py               U(a) and its components
│   │   │   ├── planner.py              depth-2 Monte Carlo rollout
│   │   │   ├── forward.py              the agent's own learning-dynamics model
│   │   │   ├── replanner.py            triggers T1..T5
│   │   │   ├── rationale.py            explanation construction
│   │   │   └── policies/               loom.py b0_fixed.py b1_random.py
│   │   │                               b2_threshold.py b3_greedy.py b4_llm_fixture.py
│   │   ├── ml/                         PURE at inference
│   │   │   ├── bundle.py               ModelBundle: load, version, batch predict
│   │   │   ├── m1_kse.py ... m8_lac.py
│   │   │   ├── features/               concept.py action.py sequence.py response.py
│   │   │   ├── train_all.py            trains all 8, registers versions + metrics
│   │   │   └── irt.py                  2PL EM fit + online theta update
│   │   ├── domain/                     PURE — the shared vocabulary
│   │   │   ├── concept_graph.py        graph, tau matrix, topological order
│   │   │   ├── item_bank.py            items, options, difficulty index
│   │   │   ├── state.py                LearnerState, Belief, EngagementState
│   │   │   ├── actions.py              Action types, costs
│   │   │   ├── observation.py          Observation — the ONLY type sim and agent share
│   │   │   └── budget.py
│   │   ├── sim/                        may NOT import agent/ or ml/
│   │   │   ├── simulator.py            the generative learner
│   │   │   ├── profiles.py             the 7 profiles
│   │   │   └── cohort.py               cohort generation, seed discipline
│   │   ├── experiments/                runner.py metrics.py ablations.py
│   │   ├── content/                    loader.py validate.py seed.py
│   │   ├── repo/                       ALL SQL lives here
│   │   │   ├── engine.py               async engine, pooling
│   │   │   ├── models.py               SQLAlchemy tables
│   │   │   └── session_repo.py decision_repo.py experiment_repo.py content_repo.py
│   │   └── core/                       settings.py log.py clock.py rng.py errors.py
│   ├── alembic/versions/               001..009
│   ├── tests/
│   ├── configs/                        headline.yaml ablations.yaml dev.yaml
│   └── requirements.txt
├── frontend/                           see Architecture §8
├── content/                            the authored YAML (Data.md §1.1)
├── models/artifacts/                   M1..M8 .joblib (gitignored; regenerable)
├── snapshots/demo.dump                 the offline demo database
└── docs/                               this documentation
```

**The import-boundary test.** `tests/test_import_boundaries.py` walks the AST of every module and
asserts:

| Module | May not import |
|---|---|
| `loom/agent/**` | `loom.sim`, `loom.repo`, `httpx`, `requests`, `openai`, `anthropic` |
| `loom/ml/**` | `loom.sim`, `loom.repo`, any network client |
| `loom/sim/**` | `loom.agent`, `loom.ml` |
| `loom/domain/**` | anything above it |

This is [`Contract.md`](./Contract.md) C4.1 and C3.1 made mechanical. It runs in `make check` and
takes under a second.

---

## 2. Key algorithms

### 2.1 M1 — BKT update with graph propagation

```python
def observe(self, state: LearnerState, obs: Observation, item: Item) -> LearnerState:
    c = item.concept_id
    p = self.params[c]
    m = state.mastery[c].mean

    # Hinted successes are weaker evidence — model it, do not ignore it.
    slip = min(0.45, p.slip + 0.10 * obs.hints_used)

    if obs.is_correct:
        like = m * (1 - slip) + (1 - m) * p.guess
        post = m * (1 - slip) / like
    else:
        like = m * slip + (1 - m) * (1 - p.guess)
        post = m * slip / like

    m_new = post + (1 - post) * p.learn                      # transition
    n_new = state.mastery[c].n_evidence + 1
    var   = m_new * (1 - m_new) / (n_new + 1)

    mastery = dict(state.mastery)
    mastery[c] = Belief(m_new, var, n_new)

    # Graph credit propagation to prerequisites (rho damps over-crediting)
    for parent, tau in self.graph.parents_of(c):
        b = mastery[parent]
        shifted = b.mean + tau * RHO * (m_new - b.mean)
        mastery[parent] = Belief(shifted, b.variance, b.n_evidence)

    return replace(state, mastery=mastery, step=state.step + 1)
```

### 2.2 M3 — two-stage misconception belief

```python
def update(self, beliefs: dict[str, float], obs: Observation, item: Item,
           features: np.ndarray) -> dict[str, float]:
    scores = self.classifier.predict_proba(features.reshape(1, -1))[0]   # over M1..M8, none
    out = {}
    for i, mid in enumerate(self.misconception_ids):
        lo = logit(beliefs[mid])
        if item.can_detect(mid):
            if obs.is_correct:
                lo -= NEG_EVIDENCE_WEIGHT          # negative evidence: most systems ignore this
            else:
                lo += W_EVIDENCE * (scores[i] - self.prior[mid])
        out[mid] = sigmoid(lo)
    return out
```

The negative-evidence branch is what stops a belief from ratcheting upward forever. It is three lines
and it is the difference between a detector and a counter.

### 2.3 M4 — online theta update (single Newton step)

```python
def update_theta(theta: float, item: ItemParams, correct: bool) -> tuple[float, float]:
    p  = 1.0 / (1.0 + math.exp(-item.a * (theta - item.b)))
    d1 = item.a * ((1.0 if correct else 0.0) - p)      # score
    d2 = -(item.a ** 2) * p * (1 - p)                  # Fisher information (negated)
    theta_new = theta - d1 / min(d2, -1e-6)            # guard against division by ~0
    se = 1.0 / math.sqrt(max(1e-6, -d2))
    return clamp(theta_new, -3.5, 3.5), se
```

### 2.4 Scorer — the utility function

```python
def score(self, state, candidates, modulation) -> list[ScoredAction]:
    feats = np.vstack([self.fb.build(state, a) for a in candidates])
    gains_model = self.m5.predict(feats)                    # ONE batched call

    out = []
    for a, g_model in zip(candidates, gains_model):
        g_roll  = self.planner.rollout(state, a)
        gain    = (1 - DELTA) * g_model + DELTA * g_roll
        explore = self.information_gain(state, a)
        risk    = self.risk(state, a)
        bonus   = modulation.action_bonuses.get(a.type, 0.0)

        u = ((gain + modulation.beta * explore
                   - modulation.gamma * risk + bonus)
             / (a.cost ** modulation.alpha))

        out.append(ScoredAction(a, gain, g_model, g_roll, explore, risk, u))
    return sorted(out, key=lambda s: -s.utility)
```

### 2.5 AgentController — the loop

```python
def step(self, state: LearnerState, obs: Observation | None) -> Decision:
    t0 = perf_counter()

    if obs is not None:
        state = self.state_engine.observe(state, obs)        # OBSERVE + UPDATE

    modulation, trigger = self.replanner.evaluate(state)     # RE-PLAN
    candidates = self.generator.generate(state, modulation)  # GENERATE
    if len(candidates) < 3:
        raise InsufficientCandidatesError(state.step)

    scored = self.scorer.score(state, candidates, modulation)  # SIMULATE + SCORE
    ranked = self.m6.rank(state, scored)                       # learned ranking

    selected = self.select(scored, ranked)                     # SELECT
    rationale = self.rationale.build(scored, selected, trigger, state)

    return Decision(state=state, selected=selected, candidates=scored,
                    rationale=rationale, trigger=trigger,
                    ranker_disagreement=(ranked[0].action != selected.action),
                    decision_ms=int((perf_counter() - t0) * 1000))
```

### 2.6 Thompson tie-breaking (deterministic per seed)

```python
def select(self, scored, ranked):
    top = scored[0]
    close = [s for s in scored if s.utility >= top.utility * (1 - TIE_BAND)]  # 3%
    if len(close) == 1:
        return top
    w = np.exp(np.array([s.utility for s in close]) / TAU)   # tau = 0.02
    return close[self.rng.choice(len(close), p=w / w.sum())]
```

`self.rng` is derived from the run seed, so the choice is random across learners but identical on
replay ([`Contract.md`](./Contract.md) C7.1).

---

## 3. Feature builders

One module per feature family; each returns a named `np.ndarray` and exposes `feature_names()` so
model explanations name real columns rather than `f_17`.

| Builder | Features | Consumers |
|---|---|---|
| `features/concept.py` | 12 — depth, weight, prerequisite mastery aggregates, evidence counts | M2, M5 |
| `features/sequence.py` | 10 — accuracy trend, response-time z-scores, hint rate, streaks | M2, M5, M7, M8 |
| `features/response.py` | 17 — distractor identity, distractor ambiguity, timing, error consistency | M3 |
| `features/action.py` | 10 — action one-hot, cost, target-concept state, difficulty gap, budget fraction | M5, M6 |

**Feature parity rule:** training and inference call the *same* builder function. There is no separate
training-time feature pipeline. This eliminates the most common and most invisible ML bug in a
hackathon build.

---

## 4. ModelBundle

```python
class ModelBundle:
    """Loaded once at startup. Immutable. Reports its own versions."""
    m1: KnowledgeStateEstimator
    # ... m2..m8
    versions: dict[str, str]

    @classmethod
    def load(cls, path: Path) -> "ModelBundle": ...
    def version_set(self) -> dict[str, str]: ...
```

Every session records `model_version_set` at creation ([`DB.md`](./DB.md) §4). If a model is retrained
mid-hackathon, existing sessions remain interpretable because their version set is stamped on them.

---

## 5. Frontend implementation notes

| Concern | Approach |
|---|---|
| API client | `openapi-typescript` + `openapi-fetch`, regenerated by `npm run gen:api`. Types come from the backend; no hand-written interfaces. |
| Server state | TanStack Query. Query keys `['session', id, 'state']` etc. Loading and error states come free, satisfying C8.5. |
| Live trace | `useAgentTrace(sessionId)` — WebSocket into a Zustand store, with automatic fallback to 1 s polling if the socket drops. The console never goes blank. |
| Concept graph | React Flow. Nodes laid out by `dag_depth` (x) and `display_order` (y). Fill = mastery, ring width = variance, red halo = active blocking misconception. |
| Charts | Recharts, wrapped in `lib/charts/` with one shared theme so all 12 panels look like one system. |
| Maths rendering | KaTeX, with a plain-text fallback attribute on every expression. |
| Animation | Framer Motion, restricted to mastery-ring transitions and beat entries. Nothing animates for longer than 300 ms — a judge should never wait for the UI. |

---

## 6. Configuration

```python
class Settings(BaseSettings):
    database_url: str
    migration_url: str
    sim_database_url: str | None = None
    eval_database_url: str | None = None

    model_artifacts_path: Path = Path("models/artifacts")
    narrative_llm: Literal["on", "off"] = "off"       # Contract C3.2
    demo_mode: bool = False
    rollout_samples: int = 32
    tie_band: float = 0.03

    model_config = SettingsConfigDict(env_prefix="LOOM_", env_file=".env")
```

One `Settings` instance, injected via `deps.py`. No module-level `os.environ` reads anywhere.

---

## 7. Error handling

```python
class LoomError(Exception): ...
class SessionNotActiveError(LoomError): ...
class InsufficientCandidatesError(LoomError): ...   # a defect, alerts loudly
class BudgetExhaustedError(LoomError): ...
class ContentValidationError(LoomError): ...        # fails the seeder, never silent
class ModelNotLoadedError(LoomError): ...
```

One FastAPI exception handler maps each to an RFC 7807 response. `InsufficientCandidatesError` is
logged at ERROR with the full state blob attached, because it should never happen and we want the
evidence if it does.

---

## 8. Performance notes

| Technique | Where | Effect |
|---|---|---|
| Batch M5 across all candidates in one `predict` | `Scorer.score` | 12 calls → 1; ~20 ms saved per decision |
| Vectorised rollout — all samples for one candidate as an array | `Planner.rollout` | ~3x over a Python loop |
| Concept graph and item bank loaded once into memory | `ContentService` | Zero DB round-trips in the decision path |
| Dashboard reads from views, not live aggregation | `v_*` views | First paint under 1.5 s |
| Harness buffers 2,000 rows before writing | `ExperimentRunner` | 90 min → 12 min |
| Multiprocess over seeds | `ExperimentRunner` | Near-linear on 5 cores |

**Benchmark and pin `rollout_samples` at Hour 26.** It is the one knob that trades demo smoothness
against planning quality, and it should be set by measurement, not by preference.

---

## 9. Setup

### Prerequisites
Python 3.11+, Node 20+, a Neon project (or local Postgres 16), `psql` on `PATH`.

### Backend

```bash
cd backend && python -m venv .venv && . .venv/Scripts/activate && pip install -r requirements.txt
```

Create `.env` from the template and paste your Neon connection strings:

```bash
cp .env.example .env
```

Apply migrations (against the **direct**, non-pooled endpoint):

```bash
alembic upgrade head
```

Seed the authored content (validates every invariant first):

```bash
python -m loom.content.seed
```

Generate the pretraining cohort and train all eight components:

```bash
python -m loom.ml.train_all --cohort 4000 --seed-range 1000-1999
```

Run the API:

```bash
uvicorn loom.api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend && npm install && npm run gen:api && npm run dev
```

### Verify the install

```bash
make check
```

Runs ruff, mypy, unit tests, the import-boundary test, the permission-boundary test, and one
end-to-end simulated session. If this passes, the system is wired correctly.

---

## 10. Runbook

| Task | Command |
|---|---|
| Full check | `make check` |
| Run the headline experiment | `python -m loom.experiments.run --config configs/headline.yaml` |
| Run ablations | `python -m loom.experiments.run --config configs/ablations.yaml` |
| Compute calibration (role `loom_eval`) | `python -m loom.services.calibration --experiment <id>` |
| One smoke session | `python -m loom.experiments.smoke --profile P5 --policy LOOM` |
| Re-seed content after a YAML edit | `python -m loom.content.seed --force` |
| Snapshot for the demo | `make snapshot` |
| Restore the demo snapshot locally | `make demo-db` |
| Start demo mode | `LOOM_DEMO_MODE=true make demo` |

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `permission denied for schema sim` from the app | **Working as designed** ([`Contract.md`](./Contract.md) C4.3) | Nothing. If you need this join, use the `loom_eval` role in the harness. |
| Alembic hangs or errors on DDL | Running against the pooled Neon endpoint | Use `LOOM_MIGRATION_URL` (direct endpoint). |
| First request takes 4 seconds | Neon cold start | Expected. The startup warm-up ping covers it; for the demo use the local snapshot. |
| `InsufficientCandidatesError` | Legality rules too strict for this state | A real defect. Read the attached state blob; check the relaxation ladder in `actions.py`. |
| Decision latency > 150 ms | `rollout_samples` too high for this machine | Lower it in `.env`; never disable scoring. |
| Model metrics missing from the dashboard | `train_all` did not finish registering | Re-run `train_all`; it is idempotent. |
| Frontend types out of date | Backend schema changed | `npm run gen:api`. |
