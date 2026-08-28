# Spec — Agents, Models, and Services

For each unit: what it is, what it does, what it consumes and emits, which user flow it serves, and
which rubric line it earns. This is the "who does what" document — when two people are building at
3 a.m., this is the file that stops them building the same thing twice.

Flow IDs (`F1`–`F8`) are defined in [`User_Flow.md`](./User_Flow.md).

---

## Part A — The Agent (team-built, no external service)

### A1 · `StateEngine` — the team-built state engine
`loom/agent/state_engine.py`

**Does:** folds one `Observation` into a new immutable `LearnerState` by invoking M1, M3, M4, and M7,
applying inter-step decay, and recomputing weighted mastery.

| | |
|---|---|
| **In** | `LearnerState`, `Observation`, `ConceptGraph`, `ModelBundle` |
| **Out** | `LearnerState'` (new instance — never mutated) |
| **Calls** | M1 (mastery), M3 (misconceptions), M4 (`theta`), M7 (engagement) |
| **Flows** | F1, F4, F6 |
| **Rubric** | *A team-built state engine representing the current problem state* |
| **Persists** | `app.session_state_snapshots`, `app.mastery_estimates`, `app.misconception_beliefs` |

**Invariants:** pure function; deterministic given `(state, obs, models, seed)`; every returned state
is snapshot-serialisable to JSON and back with bit-identical results (round-trip tested).

---

### A2 · `ActionGenerator`
`loom/agent/actions.py`

**Does:** enumerates every legal candidate action given the state, budget, and story position.
Applies the legality rules and the relaxation ladder in [`Agent_Policy.md`](./Agent_Policy.md) §2.1.

| | |
|---|---|
| **In** | `LearnerState`, `Budget`, `StoryPosition`, `ItemBank` |
| **Out** | `list[CandidateAction]`, length 3–12 |
| **Flows** | F1, F4, F6 |
| **Rubric** | *Multiple candidate actions, strategies, or remediation options* |

**Guarantee:** raises `InsufficientCandidatesError` if fewer than 3 survive after full relaxation.
That is a bug, not a state we tolerate ([`Contract.md`](./Contract.md) C5.2).

---

### A3 · `Planner` — the simulation-before-committing component
`loom/agent/planner.py`

**Does:** depth-2 Monte Carlo rollout per candidate using the agent's own forward model
([`Agent_Policy.md`](./Agent_Policy.md) §5). This is the "simulate before you act" requirement.

| | |
|---|---|
| **In** | `LearnerState`, `CandidateAction`, `rng`, `N=32` |
| **Out** | `expected_delta_wm: float` per candidate |
| **Calls** | M1 forward update, M2 (post-action projection), M4 (response probability), M5 (depth-2 greedy) |
| **Flows** | F1, F4 |
| **Rubric** | *Simulation, evaluation, or outcome prediction before committing to a decision* |
| **Budget** | 80 ms for all candidates combined |

**Note:** the planner's forward model is deliberately *not* the simulator. It is the agent's belief
about how learning works, and its inaccuracy is a real and measured source of suboptimality.

---

### A4 · `Scorer`
`loom/agent/scorer.py`

**Does:** computes `U(a) = [Gain + beta*Explore - gamma*Risk] / Cost^alpha` for every candidate,
including the sub-terms so each can be displayed separately.

| | |
|---|---|
| **In** | candidates + `LearnerState` + planner output |
| **Out** | `list[ScoredAction]` with every component exposed |
| **Calls** | M5 (batched), M2, M4, M6 |
| **Flows** | F1, F2, F4 |
| **Persists** | `app.actions_considered` — one row per candidate, always |

---

### A5 · `Replanner`
`loom/agent/replanner.py`

**Does:** evaluates the five event triggers T1–T5 and returns a temporary reweighting of the utility
parameters ([`Agent_Policy.md`](./Agent_Policy.md) §6).

| | |
|---|---|
| **In** | `LearnerState`, history window, `Budget` |
| **Out** | `PolicyModulation{alpha, beta, gamma, action_bonuses, restricted_action_set}` + `trigger_id` |
| **Flows** | F1, F6 |
| **Rubric** | *A feedback/re-planning loop for changing conditions* |
| **Persists** | `app.decisions.trigger_fired` |

**Demo value:** T3 (prerequisite gap) is the trigger that makes the agent visibly walk backwards down
the concept graph. It is the single most persuasive five seconds of the demo.

---

### A6 · `AgentController` — the controller
`loom/agent/controller.py`

**Does:** the loop. `observe → update → modulate → generate → plan → score → select → explain`.
Selection includes Thompson tie-breaking and records M6 disagreement.

| | |
|---|---|
| **In** | `LearnerState`, `Observation`, `Budget`, `Policy` |
| **Out** | `Decision{selected, candidates, rationale, trigger, timings}` |
| **Flows** | F1, F4, F6 |
| **Rubric** | *A team-built agent/controller that chooses what to investigate, simulate, or do next* |
| **Persists** | `app.decisions` |

**The swap point:** `AgentController` takes a `Policy` object. Baselines B0–B4 implement the same
`Policy` interface, which is why the comparison in [`Evaluation.md`](./Evaluation.md) is honest — same
harness, same state engine, same items, only the selection rule differs.

---

### A7 · `RationaleBuilder`
`loom/agent/rationale.py`

**Does:** turns the scored candidate set and the fired trigger into the structured explanation object
in [`Agent_Policy.md`](./Agent_Policy.md) §7, including the runner-up counterfactual.

| | |
|---|---|
| **In** | `list[ScoredAction]`, `trigger`, state delta |
| **Out** | `Rationale{headline, because[], counterfactual, models_consulted}` |
| **Flows** | F1, F2 |
| **Rubric** | *Dashboard, explainability, and UX* |

**Rule:** every sentence contains a number that came from a model. No decorative prose
([`Contract.md`](./Contract.md) C5.7).

---

## Part B — The Intelligence Components

Full cards in [`Model_Cards.md`](./Model_Cards.md). Summary of role and flow contribution:

| ID | Component | Consumed by | Primary flows | Independently evaluable output |
|---|---|---|---|---|
| **M1** | Knowledge-State Estimator | StateEngine, Planner, Scorer | F1, F4, F6 | Next-response AUC ≥ 0.78 |
| **M2** | Concept-Mastery Predictor | Scorer (risk), ActionGenerator (readiness gate), Projection panel | F1, F4 | AUC on unattempted concepts ≥ 0.74 |
| **M3** | Misconception Detector | StateEngine, ActionGenerator (`EXPLAIN`), Replanner (T1) | F1, F3, F6 | Macro-F1 ≥ 0.70 |
| **M4** | Difficulty Estimator | Scorer (risk), ActionGenerator (`EASIER`/`HARDER`), Difficulty panel | F1, F3, F4 | `theta` recovery r ≥ 0.85 |
| **M5** | Learning-Gain Predictor | Scorer (`Gain_model`), Planner (depth-2 greedy) | F1, F4 | Spearman ≥ 0.55 |
| **M6** | Action/Branch Ranker | Scorer (tie-break, disagreement diagnostic) | F1, F4 | NDCG@3 ≥ 0.72 |
| **M7** | Engagement & Gaming Detector *(bonus)* | StateEngine, Scorer (`r_waste`), Replanner (T5) | F1, F6 | Macro-F1 ≥ 0.68 |
| **M8** | Learner Archetype Classifier *(bonus)* | StateEngine cold start (priors) | F1, F5 | Step-3 accuracy ≥ 0.55 |

**Meeting the mandate.** PS 6 requires at least five meaningful components, four of which produce
independently evaluable outputs. We ship eight, and **all eight** have a held-out metric persisted in
`app.model_metrics` and rendered on the Model Health panel.

---

## Part C — Application Services

### C1 · `SessionService`
`loom/services/session.py`

**Does:** the transaction boundary for one learner step. Loads state, invokes `StateEngine` and
`AgentController`, applies budget arithmetic, resolves the next story beat, persists everything in one
transaction, and returns the next beat.

| | |
|---|---|
| **API** | `start_session`, `handle_response`, `get_state`, `get_trace`, `request_hint`, `end_session` |
| **Flows** | F1, F5, F6, F7 |
| **Guarantee** | Interaction, snapshot, estimates, decision, and candidates commit atomically. A half-written step cannot exist. |

---

### C2 · `DecisionService`
`loom/services/decision.py`

**Does:** read-side service for explainability. Fetches a decision with its full candidate set,
rationale, and counterfactual; formats the models-consulted list.

| | |
|---|---|
| **API** | `get_decision(session, step)`, `list_decisions(session)`, `get_candidate_table(decision_id)` |
| **Flows** | F2 (judge inspection), F3 |
| **Rubric** | *Explainability* — this service exists purely to earn it |

---

### C3 · `ExperimentService`
`loom/services/experiment.py`

**Does:** launches cohort simulations across policies and seeds, tracks progress, and serves
aggregated results, confidence intervals, and the ablation table.

| | |
|---|---|
| **API** | `launch(config)`, `status(experiment_id)`, `results(experiment_id)`, `ablations(experiment_id)`, `policy_action_mix(...)` |
| **Flows** | F4 |
| **Rubric** | *Measured outcome improvement* |
| **Note** | Long runs execute in a background task; the client polls or subscribes over WebSocket. |

---

### C4 · `ContentService`
`loom/services/content.py`

**Does:** serves the concept graph, item bank metadata, misconception taxonomy, and story structure.
Read-only, aggressively cached in memory at startup.

| | |
|---|---|
| **API** | `concept_graph()`, `item(id)`, `misconceptions()`, `story_graph()`, `item_diagnostics()` |
| **Flows** | F1, F3, F4 |

`item_diagnostics()` joins authored priors with M4's IRT estimates and M3's per-item detection rates —
this is the Curriculum Designer's (S4) view.

---

### C5 · `CalibrationService` *(evaluation only, role `loom_eval`)*
`loom/services/calibration.py`

**Does:** after a run completes, computes estimated-vs-true mastery error, ECE, and Brier score, and
**materialises them into `app.run_metrics`** so the dashboard can display them without `sim` access
([`DB.md`](./DB.md) §7).

| | |
|---|---|
| **Flows** | F2, F4 |
| **Rubric** | *AI/ML quality and correctness* — this is where we prove it rather than assert it |
| **Constraint** | Runs only after a run is complete ([`Contract.md`](./Contract.md) C4.5) |

---

### C6 · `NarrativeService`
`loom/services/narrative.py`

**Does:** maps an agent action onto the story. Resolves the next story node, selects branch-appropriate
framing, and assembles the beat payload the client renders.

| | |
|---|---|
| **In** | `Action`, current `StoryPosition`, `branch_id` |
| **Out** | `Beat{title, narrative_md, objective, payload}` |
| **Flows** | F1 |
| **LLM boundary** | If `LOOM_NARRATIVE_LLM=on`, this is the **only** service permitted to call a local model, and only to reword an already-selected pre-authored string ([`Contract.md`](./Contract.md) C3.2–C3.4). It never sees `LearnerState`. Off by default and off during the demo. |

---

## Part D — Harness Components

### D1 · `LearnerSimulator`
`loom/sim/simulator.py`

**Does:** the ground-truth generative learner. Full specification in
[`Simulation.md`](./Simulation.md).

| | |
|---|---|
| **In** | `TrueLearnerState`, `Action`, `rng` |
| **Out** | `Observation` + updated true state |
| **Flows** | F4 |
| **Boundary** | May not import `loom/agent/` or `loom/ml/`. Enforced by `tests/test_import_boundaries.py`. |

---

### D2 · `ExperimentRunner`
`loom/experiments/runner.py`

**Does:** the sweep. `for policy x seed x learner: run a full session, buffer rows, bulk write`.
Computes per-run metrics and per-policy aggregates.

| | |
|---|---|
| **In** | `ExperimentConfig` (YAML) |
| **Out** | `experiment_id`; rows in `app.experiment_runs`, `app.run_metrics` |
| **Flows** | F4 |
| **Performance** | 900 learners x 5 policies x 5 seeds under 12 minutes (multiprocess over seeds) |

---

### D3 · `ModelTrainer`
`loom/ml/train_all.py`

**Does:** generates the pretraining cohort, builds features, trains M1–M8, writes artefacts, registers
versions and metrics.

| | |
|---|---|
| **Out** | `models/artifacts/*.joblib`, rows in `app.model_registry` and `app.model_metrics` |
| **Constraint** | Labels from observable outcomes only ([`Contract.md`](./Contract.md) C4.7) |
| **Runtime** | Under 5 minutes (NFR-3) |

---

### D4 · `ContentSeeder`
`loom/content/seed.py`

**Does:** validates and loads `content/*.yaml` into the `content` schema. Asserts every invariant in
[`Concept_Graph.md`](./Concept_Graph.md) §4.2 and fails loudly on violation.

| | |
|---|---|
| **Idempotent** | `ON CONFLICT DO UPDATE` |
| **Flows** | setup |

---

## Part E — Frontend Modules

| Module | Renders | Flows | Data source |
|---|---|---|---|
| `StoryPlayer` | Narrative beat, challenge card, option buttons, hint ladder, budget meter | F1 | `POST /sessions/{id}/respond` |
| `MasteryGraphPanel` | Concept DAG with mastery colour and uncertainty ring + mastery-over-time lines | F1, F2, F3 | `GET /sessions/{id}/state` |
| `MisconceptionMapPanel` | Belief heat strip over time, evidence drill-down, resolution markers | F2, F3 | `GET /sessions/{id}/misconceptions` |
| `TrajectoryPanel` | Step timeline with action, correctness, cost, trigger markers | F1, F2 | `v_session_trajectory` |
| `InterventionsPanel` | Action-mix donut + per-step candidate table | F2 | `GET /decisions/{step}` |
| `DifficultyPanel` | Item `b` vs learner `theta` over steps | F1, F2 | `v_session_trajectory` |
| `ProjectionPanel` | Predicted final mastery with confidence band vs budget remaining | F1, F2 | `GET /sessions/{id}/projection` |
| `BeforeAfterPanel` | Pre-test vs post-test per concept | F1, F2, F6 | `GET /sessions/{id}/outcome` |
| `BaselinePanel` | Policy comparison, mean + 95% CI | F4 | `v_policy_outcomes` |
| `CalibrationPanel` | Estimated vs true mastery, ECE, Brier | F2, F4 | `run_metrics` (materialised) |
| `PolicySensitivityPanel` | Action-mix heatmap by learner profile | F2, F4 | `v_policy_action_mix` |
| `ModelHealthPanel` | 8 model cards with live metrics, versions, M6 disagreement rate, empty `llm_calls` | F2 | `GET /models` |
| `AgentConsole` | Live decision trace over WebSocket | F1, F2 | `WS /ws/sessions/{id}` |

---

## Part F — Traceability: every PS requirement to its owner

| PS requirement | Owner |
|---|---|
| Knowledge-state estimation model | **M1** |
| Concept-mastery prediction model | **M2** |
| Misconception detection model | **M3** |
| Difficulty estimation model | **M4** |
| Learning-gain prediction model | **M5** |
| Content/branch ranking component | **M6** |
| Maintain learner state after every response | **A1 StateEngine** + `session_state_snapshots` |
| Choose next action from revision / new concept / hint / explanation / easier / harder / branch | **A2 ActionGenerator** — all 9 action families |
| Consider a limited learning budget | Budget in state; `Cost^alpha` in **A4 Scorer**; trigger T4 in **A5** |
| Predict expected gain before selecting | **M5** + **A3 Planner** |
| Observe response and re-plan | **A1** then **A5** then **A6**, every step |
| One focused academic topic | Linear Equations in One Variable |
| 5–10 decision points | 8 story beats |
| Track correctness, response time, repeated errors | `app.interactions` + `LearnerState.per_concept_errors` |
| Structured concept graph | `content.concepts` + `concept_edges`, 10 nodes, 15 edges |
| Simulated learner profiles | **D1** + 7 profiles |
| Mastery graph | `MasteryGraphPanel` |
| Misconception map | `MisconceptionMapPanel` |
| Learning trajectory | `TrajectoryPanel` |
| Chosen interventions | `InterventionsPanel` |
| Difficulty progression | `DifficultyPanel` |
| Predicted final mastery | `ProjectionPanel` |
| Before/after learning outcome | `BeforeAfterPanel` + probe item set |
| Compare adaptive vs fixed sequence | **D2** + `BaselinePanel` + baseline B0 |
| Show policy changes for different learner states | `PolicySensitivityPanel` |
