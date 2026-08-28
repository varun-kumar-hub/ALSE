# Testing Strategy

Testing has one job in a 48-hour build: **make sure the thing you show a judge is the thing you
think you built.** Everything here is chosen because a failure would either corrupt a reported number
or break the demo.

The full suite must run in **under 60 seconds**. A suite nobody runs is worse than no suite, because
it creates false confidence.

---

## 1. The `make check` gate

```bash
make check
```

Runs, in order, failing fast:

| # | Stage | Time |
|---|---|---|
| 1 | `ruff check` + `ruff format --check` | 2 s |
| 2 | `mypy loom/` (strict on `domain/`, `agent/`, `ml/`) | 8 s |
| 3 | **Boundary tests** (§2) | 1 s |
| 4 | Unit tests (§3) | 20 s |
| 5 | Contract tests (§4) | 10 s |
| 6 | One end-to-end simulated session (§5) | 8 s |
| 7 | Content validation against the YAML | 3 s |

Nothing merges to `main` that breaks it ([`Contract.md`](./Contract.md) §Team conventions).

---

## 2. Boundary tests — the ones that protect the claims

These are the highest-value tests in the project. Each one guards a statement we make to judges.

### `test_import_boundaries.py`
Walks the AST of every module and asserts the dependency rules from
[`Technical_Documentation.md`](./Technical_Documentation.md) §1.

```python
FORBIDDEN = {
    "loom.agent": {"loom.sim", "loom.repo", "httpx", "requests", "aiohttp",
                   "openai", "anthropic", "google.generativeai"},
    "loom.ml":    {"loom.sim", "loom.repo", "httpx", "requests", "aiohttp",
                   "openai", "anthropic", "google.generativeai"},
    "loom.sim":   {"loom.agent", "loom.ml"},
    "loom.domain":{"loom.agent", "loom.ml", "loom.sim", "loom.repo", "loom.api"},
}
```

**Guards:** the anti-circularity claim ([`Contract.md`](./Contract.md) C4.1) *and* the AI-policy claim
(C3.1), in one test, in under a second.

### `test_permission_boundary.py`
Connects as `loom_app` and asserts that reading `sim` raises.

```python
def test_app_role_cannot_read_sim(app_conn):
    with pytest.raises(ProgrammingError, match="permission denied for schema sim"):
        app_conn.execute(text("SELECT 1 FROM sim.learner_truth LIMIT 1"))
```

**Guards:** C4.3, and it means a future migration cannot silently loosen the grant. This is the test
behind the eight-second demo moment.

### `test_policy_compliance.py`
Runs a full simulated session with outbound HTTP monkeypatched to raise, and asserts it completes.

**Guards:** "no hosted LLM participates in reasoning, prediction, planning, or decision-making" — as a
*property of the running system*, not a promise.

### `test_seed_discipline.py`
Asserts the cohort generator raises when a seed from the evaluation range is requested for training,
and vice versa.

**Guards:** C6.6, and risk R13.

---

## 3. Unit tests

### Domain
| Test | Asserts |
|---|---|
| `test_concept_graph` | Acyclic; weights sum to 1.0; every `tau` in (0,1); topological order stable |
| `test_item_bank` | Every invariant I1–I8 from [`Concept_Graph.md`](./Concept_Graph.md) §4.2 |
| `test_learner_state` | Immutability; JSON round-trip is bit-identical (replay depends on this) |
| `test_budget` | Never negative; the open item always completes |

### Models
| Test | Asserts |
|---|---|
| `test_m1_bkt` | Correct answer raises mastery, incorrect lowers it; hints reduce the credit; graph propagation moves prerequisites in the right direction and by less than `rho` |
| `test_m1_forgetting` | Mastery decays toward the floor, never below it |
| `test_m3_accumulator` | Repeated distractor matches raise the posterior monotonically; **a correct answer on a detecting item lowers it** (the negative-evidence branch) |
| `test_m4_irt` | `P(correct)` monotone in `theta`; the Newton step converges; `theta` stays in bounds |
| `test_feature_parity` | **Training and inference call the same builder and produce identical vectors for identical inputs.** The single most valuable ML test in the suite. |
| `test_model_determinism` | Same inputs plus same seed produce identical outputs (C2.5) |

### Agent
| Test | Asserts |
|---|---|
| `test_action_legality` | Each rule in [`Agent_Policy.md`](./Agent_Policy.md) §2.1 admits and rejects correctly |
| `test_candidate_minimum` | Never fewer than 3 candidates across 1,000 randomly sampled states (C5.2) |
| `test_utility_monotonicity` | Higher gain raises utility; higher cost and higher risk lower it |
| `test_triggers` | Each of T1–T5 fires on a hand-constructed state and does not fire on its negation |
| `test_thompson_determinism` | Same seed produces the same tie-break selection |
| `test_rationale_has_numbers` | Every `because` bullet contains at least one numeral (C5.7) |

### Simulator
| Test | Asserts |
|---|---|
| `test_response_process` | `P(correct)` rises with `theta`, falls with difficulty and with active misconception interference |
| `test_misconception_distractors` | A learner with a strong misconception picks its distractor more often than chance |
| `test_profiles_distinct` | The 7 profiles produce statistically different observable behaviour |
| `test_teaching_effects` | `TEACH` on an unready learner produces materially less gain than on a ready one |

---

## 4. Contract tests

One test per rule that a bug could silently violate.

| Rule | Test |
|---|---|
| C2.5 determinism | Two identical runs produce identical decision sequences |
| C4.4 observation shape | `Observation` has exactly the six declared fields; a schema change fails the test |
| C5.2 candidate minimum | See above |
| C5.3 candidate persistence | Every `decisions` row has ≥ 3 `actions_considered` rows |
| C5.8 latency | p95 of 200 decisions on the CI machine is under 150 ms |
| C6.4 distractor mapping | No option maps to more than one misconception |
| C7.1 reproducibility | `(experiment_id, seed)` replays byte-identically |
| C8.3 no client-side computation | A lint rule forbids arithmetic on mastery values in `frontend/src/features/**` |

---

## 5. End-to-end tests

### `test_full_session.py` (in `make check`)
Runs one simulated learner (profile P5, policy LOOM) through a complete session against a test
database, and asserts:

- The session reaches a terminal status.
- Budget lands at exactly 0 or the mastery target was reached.
- Every step has a snapshot, a decision, and ≥ 3 candidates.
- Weighted mastery increased.
- At least one trigger fired.
- No exceptions logged at ERROR.

### `test_all_policies.py` (nightly-equivalent, run at Hours 26 and 34)
The same for all five policies. Asserts each completes and that LOOM's true mastery gain exceeds B1's
— a smoke check, not the headline claim.

### `test_replay.py`
Runs a session, persists it, replays it from snapshots, and asserts the replay is identical. **Demo
mode depends entirely on this**, so a failure here is a demo-breaking failure.

---

## 6. Frontend testing

Deliberately light. UI unit tests are poor value in a 48-hour build; the failures that matter are
"the panel crashes" and "the number is wrong", and those are caught more cheaply.

| Layer | Approach |
|---|---|
| Types | `openapi-typescript` generation is the contract. A backend schema change breaks the build, which is the test. |
| Panels | One render smoke test per panel with three fixtures: **loaded**, **loading**, **empty**. This directly enforces C8.5 and is where a judge's stray click would otherwise find a stack trace. |
| Critical path | One Playwright test: start a session, answer three questions, assert the trajectory shows three steps and the console shows three decisions. |
| Visual | Manual, at Hour 43, projected onto an actual screen. Legibility at distance is not testable and it matters. |

---

## 7. Manual pre-demo checklist (Hour 44)

Run in order, with **wifi disabled**.

| # | Check |
|---|---|
| 1 | `make check` passes |
| 2 | Local Postgres restored from `snapshots/demo.dump` |
| 3 | Backend starts and answers `/health` |
| 4 | Frontend builds and serves |
| 5 | SHOWCASE-A loads and replays to the T3 trigger |
| 6 | SHOWCASE-B loads and shows the M3 rise-remediate-fall shape |
| 7 | A/B split view (A vs C) renders both trajectories |
| 8 | `/lab` loads with the frozen headline results |
| 9 | All 12 panels render — **click every one** |
| 10 | Click into a candidate table from three different steps |
| 11 | The counterfactual toggle works |
| 12 | P9 calibration shows real numbers, not placeholders |
| 13 | P11 shows `llm_calls: 0` |
| 14 | The `psql` permission-denied command produces the expected error |
| 15 | Every panel's empty state renders (open a fresh session and click around before answering) |
| 16 | Nothing in the console logs an error |
| 17 | Fallback video plays |
| 18 | USB stick contains repo, snapshot, and video |
| 19 | Second machine set up and verified |
| 20 | Full run-through under 5 minutes |

**Any failure here is fixed before anything else.** At Hour 44 the demo outranks every remaining
feature.

---

## 8. What we deliberately do not test

Stated so nobody spends time on it at Hour 38:

| Not tested | Why |
|---|---|
| Load and concurrency | Single-learner prototype. No user will ever be the second one. |
| Browser matrix | The demo runs on one known machine in one known browser. |
| Security beyond the role boundary | No auth, no PII, no untrusted input ([`PRD.md`](./PRD.md) N2, N6). |
| Migration rollback | Forward-only by policy ([`DB.md`](./DB.md) §10). Untested downgrades are worse than none. |
| Exhaustive UI states | Three fixtures per panel — loaded, loading, empty — is the right depth here. |

If a judge asks about test coverage, the honest answer is the useful one: *"We tested the things that
could make a number on that dashboard wrong, and the things that could break the demo. We did not test
concurrency, because nothing here is concurrent."*
