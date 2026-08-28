# Data — Sources, Provenance, and Generation

Every byte of data in LOOM comes from one of exactly **three** origins. There is no fourth, and no
scraped, licensed, or personal data anywhere in the system.

| # | Origin | What it is | Where it lives | Licence |
|---|---|---|---|---|
| **D1** | **Team-authored content** | Concepts, prerequisite edges, misconceptions, 28 items, hints, explanations, story | `content/*.yaml` → `content` schema | Ours. MIT with the repo. |
| **D2** | **Simulator-generated learner behaviour** | Learner parameters, response transcripts, ground-truth trajectories | Generated at runtime → `sim` + `app` schemas | Ours. Fully synthetic. |
| **D3** | **Derived artefacts** | Trained model files, IRT parameter estimates, experiment metrics | `models/artifacts/`, `app.model_*`, `app.run_metrics` | Ours. Reproducible from D1 + D2. |

**No human subject data. No PII. Ever.** ([`Contract.md`](./Contract.md) C6.2.) This is a deliberate
choice, not an omission — it is also the honest answer to "where did your training data come from?"

---

## 1. D1 — Team-authored content

### 1.1 Files

```
content/
  concepts.yaml            10 concepts + curriculum weights + explanations + revision cards
  concept_edges.yaml       15 prerequisite edges with transfer weights (tau)
  misconceptions.yaml      8 misconceptions + contrast-case remedies + persistence parameters
  items/
    c01.yaml ... c10.yaml  28 items: stems, 4 options each, misconception maps, 3-level hints
  story/
    beats.yaml             8 story beats x 3 branch framings
    branches.yaml          branch graph and switch conditions
  config/
    action_costs.yaml      the 9 action costs (frozen at Hour 6)
    policy_params.yaml     alpha, beta, gamma, kappa, delta + trigger thresholds
```

### 1.2 Authoring provenance

| Asset | How it was produced | Grounding |
|---|---|---|
| Concept list and DAG | Authored by the team against the standard Class 8 sequence for linear equations. | Ordinary curriculum structure; nothing copied. |
| Curriculum weights `w_c` | Authored: share of the topic plus downstream dependency count. | A declared modelling assumption, stated as such on the dashboard. |
| Transfer weights `tau` | Authored, then sanity-checked against the observed conditional accuracy structure in the pretraining cohort. | Authored priors, empirically sanity-checked — we say both parts. |
| Misconception taxonomy | Authored from well-known documented algebra error patterns (letter-as-object, reversal error, partial distribution, one-sided operation). | Described in our own words. No text reproduced from any source. |
| Item stems | Written by the team in the Kepler Station setting. | Original. |
| Distractors | Each is the *computed output* of applying a specific faulty rule to the stem. This is why the misconception mapping is exact rather than guessed. | Original, derived mechanically. |
| Hints | 3-level ladder authored per item. | Original. |
| Contrast-case remedies | Authored per misconception. | Original. |
| Difficulty priors | Authored on a −2 to +2 logit scale from step count and operation type. | Priors only; M4 estimates the real values. |

**The distractor authoring method is worth stating aloud in the demo.** For `3(x+4)=27`, we do not
invent plausible wrong answers — we *execute* misconception M3 (multiply only the first term) and get
`3x+4=27 → x=7.67`. That is why every wrong answer is diagnostic, and it is the foundation the whole
misconception model rests on.

### 1.3 Volume

| Asset | Count |
|---|---|
| Concepts | 10 |
| Prerequisite edges | 15 |
| Misconceptions | 8 |
| Items | 28 (22 `teach`, 6 `probe`) |
| Options | 112 |
| Misconception-tagged distractors | 40 |
| Hints | 84 |
| Concept explanations / revision cards | 10 / 10 |
| Misconception remedies | 8 |
| Story beats | 8 x 3 branch framings = 24 nodes |
| **Total authored assets** | **~250** |

**Authoring time budget: 4 hours, two people, Hours 2–6.** Frozen at Hour 8
([`Contract.md`](./Contract.md) C1.5). This is the single most schedule-critical block in the project
and the most common place adaptive-learning teams lose their build.

### 1.4 Validation at seed time

`loom/content/validate.py` enforces every invariant in [`Concept_Graph.md`](./Concept_Graph.md) §4.2
and fails the seeder loudly on violation. Additional structural checks:

- Graph is acyclic; `w_c` sums to 1.0; every `tau` in `(0,1)`.
- Every misconception is reachable from ≥ 3 items (else M3 is untrainable).
- Every concept has ≥ 2 `teach` items (else `EASIER`/`HARDER` can be illegal).
- Every item binds to a `narrative_slot` that exists in `story/beats.yaml`.
- No hint at level 1 contains the correct numeric answer (regex check against the correct option).

---

## 2. D2 — Simulator-generated learner data

Fully specified in [`Simulation.md`](./Simulation.md). Summarised here as a data source.

### 2.1 The three cohorts

| Cohort | Seeds | Learners | Purpose | May be looked at during development? |
|---|---|---|---|---|
| **Pretraining** | 1000–1999 | 4,000 | Train M1–M8; fit IRT; tune `alpha..delta`; train M6's ranker | Yes, freely |
| **Development** | 5000–5099 | 100 | Debugging, UI work, smoke tests | Yes, freely |
| **Evaluation** | 9000–9999 | 900 per seed x 5 seeds | **Every reported number** | **No — first touched at Hour 30** |

Disjoint by construction ([`Contract.md`](./Contract.md) C6.6). Enforced by an assertion in the
cohort generator: a seed outside the declared range for a given purpose raises.

### 2.2 What the simulator produces

| Artefact | Table | Volume (pretraining) |
|---|---|---|
| Learner parameters | `sim.learner_truth` | 4,000 rows |
| Injected misconceptions | `sim.learner_misconceptions` | ~5,200 rows |
| True item parameters | `sim.sim_item_params` | 28 rows per cohort |
| Response transcripts | `app.interactions` | ~85,000 rows |
| True trajectories | `sim.learner_truth_trajectory` | ~85,000 rows |

Pretraining transcripts are generated under a **mixed policy** — 40% B0 fixed sequence, 30% B1 random,
30% an early heuristic — deliberately, so the training data covers state-action pairs the final policy
would never visit on its own. Training only on a single policy's trajectories is the classic
off-policy trap that makes M5 and M6 useless outside their own comfort zone
([`Model_Cards.md`](./Model_Cards.md), M6 failure modes).

### 2.3 Training label discipline

The rule that keeps the whole project honest ([`Contract.md`](./Contract.md) C4.7):

| Model | Label | Comes from |
|---|---|---|
| M1 | next-response correctness | Observable ✓ |
| M2 | correctness on first attempt at a new concept | Observable ✓ |
| M3 | misconception attached to the chosen distractor | Observable ✓ (it is in the content, not the simulator) |
| M4 | response correctness | Observable ✓ |
| M5 | change in the **agent's estimated** weighted mastery over 2 steps | Observable ✓ — deliberately not the true delta |
| M6 | 3-step forward realised estimated gain, graded | Observable ✓ |
| M7 | behavioural sequence pattern (hint-before-attempt, near-instant clicks) | Observable ✓ |
| M8 | archetype — **the one exception** | See below |

**M8 is the single exception and we flag it.** Its training labels are the simulator's profile IDs,
which are latent. The justification: the archetype is only ever used to set a *prior*, and the
alternative (unsupervised clustering with no label) was tried and produced clusters that did not
correspond to anything useful. We state this openly in M8's model card and on the Model Health panel,
and M8 is a **bonus** component precisely so the six required models are entirely free of the caveat.
Ablating M8 costs 2–5% — the headline result does not depend on it.

That is a real limitation, disclosed. A judge who finds a disclosed limitation trusts everything else
more; a judge who finds an undisclosed one trusts nothing.

---

## 3. D3 — Derived artefacts

| Artefact | Produced by | Stored | Reproducible from |
|---|---|---|---|
| `models/artifacts/M1..M8.joblib` | `loom.ml.train_all` | Filesystem, path in `app.model_registry` | D1 + pretraining seeds + config hash |
| IRT item parameters | M4's EM fit | `app.model_registry` payload | Same |
| Model metrics | Training harness | `app.model_metrics` | Same |
| Experiment results | `loom.experiments.run` | `app.run_metrics` | D1 + evaluation seeds + model versions |
| Calibration metrics | `CalibrationService` | `app.run_metrics` (materialised) | Post-run join, role `loom_eval` |
| Demo snapshot | `pg_dump` | `snapshots/demo.dump` | Everything above |

Every artefact is reproducible from version-controlled inputs plus a seed. Nothing in the demo exists
only as a file someone generated once and cannot recreate ([`Contract.md`](./Contract.md) C7.1).

---

## 4. What we explicitly did not use, and why

| Not used | Why |
|---|---|
| Public education datasets (ASSISTments, EdNet, KDD Cup) | Tempting, but they carry another curriculum's concept structure and no misconception labels, so we would have to author the taxonomy anyway. Adopting one would cost half a day of schema mapping and would *not* give us the ground-truth latent state the calibration panel needs. We can honestly say we considered them and why we chose otherwise. |
| Scraped textbook problems | Copyright, and the distractors would not be misconception-derived. |
| Real student data | Ethics, consent, and time. Also unnecessary. |
| LLM-generated items | The distractor-to-misconception mapping must be exact and verified. An LLM would produce plausible-looking distractors that do not correspond to a specific faulty rule, which would silently destroy M3. This is a case where hand-authoring 28 items is *faster and better* than generating 500. |
| LLM-generated learner behaviour | It would not have latent ground-truth parameters, so calibration would be impossible — and it would put a hosted model in the evaluation loop. |

If a judge asks "why not use a real dataset?", the answer is one sentence: *"Because no public dataset
carries per-response misconception labels and latent ground-truth mastery, and without ground truth we
could not have shown you the calibration plot."*

---

## 5. Data flow summary

```
content/*.yaml
   │ seed (validated)
   ▼
content schema ────────────────┐
   │                           │
   │ simulator reads items     │  agent reads items
   ▼                           ▼
sim.learner_truth ──▶ Observation (6 fields) ──▶ app.interactions
   │                                                    │
   │ true trajectory                                    │ features
   ▼                                                    ▼
sim.learner_truth_trajectory              models/artifacts/M1..M8.joblib
   │                                                    │
   │        ┌───────────────────────────────────────────┘
   │        │  agent inference
   │        ▼
   │   app.mastery_estimates, misconception_beliefs, decisions, actions_considered
   │        │
   └────────┴──▶ [loom_eval, post-run only] ──▶ calibration ──▶ app.run_metrics ──▶ dashboard
```

The only arrow that crosses from `sim` to `app` during a run is the six-field `Observation`. Every
other crossing happens after the run, under a different database role.

---

## 6. Retention and reset

| Operation | Command | When |
|---|---|---|
| Reset content only | `python -m loom.content.seed --force` | After editing YAML |
| Reset a cohort | `python -m loom.sim.reset --cohort <id>` | Re-running a spoiled experiment |
| Full rebuild | `alembic downgrade base && alembic upgrade head && seed && train_all` | Never during the hackathon after Hour 30 |
| Demo snapshot | `pg_dump ... -f snapshots/demo.dump` | Hour 44, then again after any fix |

**Freeze rule:** after Hour 30, the evaluation cohort and the trained artefacts are frozen. Anything
requiring a retrain after that point requires re-running the headline experiment and re-recording
every number on the dashboard — a two-hour cost. Plan around it.
