# Rubric Mapping

Every scoring line from the problem statement mapped to the artefact that satisfies it. **Print this
and hand it to the judges at the start of the presentation.** It costs nothing and it changes how they
watch the demo — instead of hunting for what you built, they are checking off what you told them you
built.

---

## 1. Mandatory AI architecture (PDF page 1)

| Requirement | How LOOM satisfies it | Evidence on screen |
|---|---|---|
| At least 5 meaningful AI/ML or intelligent components | **8 components** — M1–M6 required, M7–M8 bonus | Panel P11 Model Health |
| At least 4 must produce independently evaluable outputs | **All 8** have held-out metrics with stated baselines in `app.model_metrics` | P11, each card |
| A team-built state engine representing the current problem state | `StateEngine` → immutable `LearnerState`, snapshotted every step | P1 Mastery Graph, P2 Misconception Map |
| A team-built agent/controller choosing what to do next | `AgentController`: observe → update → generate → simulate → score → select | P12 Agent Console |
| Multiple candidate actions, strategies, or remediation options | 9 action families; 3–12 candidates every step, all persisted | P4 Tier 3 candidate table |
| Simulation / evaluation / outcome prediction before committing | Depth-2 Monte Carlo rollout + M5 gain prediction, per candidate | P4 `gain(rollout)` column |
| A feedback / re-planning loop for changing conditions | Re-plan every response, plus 5 event triggers T1–T5 | P3 trigger markers, P12 |
| A dashboard exposing the final decision, evidence, and measurable impact | 12 panels | The whole dashboard |

---

## 2. AI API policy

| Rule | Compliance |
|---|---|
| Hosted LLMs only for auxiliary functions | No hosted LLM anywhere in the request path ([`Contract.md`](./Contract.md) §3) |
| LLM may not be the primary reasoning / prediction / planning / decision engine | All eight components are team-implemented sklearn/xgboost/numpy. The agent loop is team-written. |
| Core intelligence, state management, agentic workflow, decision policy team-implemented | [`Agent_Policy.md`](./Agent_Policy.md) is the full specification |
| **Verification available to judges** | `llm_calls: 0` tile on P11 · `tests/test_policy_compliance.py` asserts no network client is imported anywhere in the decision path |

---

## 3. PS 6 required AI/ML components

| Required component | Ours | Held-out metric | Baseline it beats |
|---|---|---|---|
| Knowledge-state estimation model | **M1 KSE** — BKT + graph propagation | Next-response AUC ≥ 0.78 | Class rate 0.62 |
| Concept-mastery prediction model | **M2 CMP** — gradient-boosted trees | AUC on unattempted concepts ≥ 0.74 | Prerequisite heuristic 0.66 |
| Misconception detection model | **M3 MCD** — classifier + Bayesian accumulator | Macro-F1 ≥ 0.70 | Majority class 0.31 |
| Difficulty estimation model | **M4 DEM** — 2PL IRT, EM + online | `theta` recovery r ≥ 0.85 | Authored priors r = 0.80 |
| Learning-gain prediction model | **M5 LGP** — gradient-boosted regressor | Spearman ≥ 0.55 | Action-type mean 0.31 |
| Content/branch ranking component | **M6 ABR** — pairwise ranker | NDCG@3 ≥ 0.72 | Random 0.44 |
| *(bonus)* | **M7 EGD** engagement/gaming | Macro-F1 ≥ 0.68 | |
| *(bonus)* | **M8 LAC** archetype | Step-3 accuracy ≥ 0.55 | Random 0.14 |

---

## 4. PS 6 agentic requirements

| Requirement | Implementation | Panel |
|---|---|---|
| Maintain learner state after every response | `StateEngine.observe()` → `app.session_state_snapshots`, every step | P1, P2 |
| Choose next action from revision / new concept / hint / explanation / easier / harder / scenario branch | **All 9 covered:** `REVISE` `TEACH` `HINT` `EXPLAIN` `EASIER` `HARDER` `BRANCH` — plus `ASSESS` and `CONSOLIDATE` | P4 action mix |
| Consider a limited learning budget | 100 energy + 25 interactions; `Cost^alpha` in the utility; trigger T4 at 20% | Budget meter, P3 cost-as-width |
| Predict expected gain before selecting an action | M5 + depth-2 rollout, blended, for every candidate | P4 `gain` columns |
| Observe the learner response and re-plan | Every response, plus 5 event triggers | P12, P3 markers |

---

## 5. PS 6 detailed requirements

| Requirement | Ours |
|---|---|
| Choose one focused academic topic | Linear Equations in One Variable ([`Concept_Graph.md`](./Concept_Graph.md)) |
| Create 5–10 decision points | **8 story beats** ([`Narrative_Design.md`](./Narrative_Design.md) §2) |
| Track correctness, response time, repeated errors | `app.interactions` + `LearnerState.per_concept_errors`; all three feed M1, M3, M7 |
| Use a structured concept graph | 10 concepts, 15 prerequisite edges with transfer weights, acyclic, validated at seed |
| Provide simulated learner profiles for evaluation | **7 profiles** ([`Simulation.md`](./Simulation.md) §3), stratified cohorts |

---

## 6. PS 6 dashboard requirements

| Required panel | Ours | Route |
|---|---|---|
| Mastery graph | **P1** — concept DAG with mastery fill and uncertainty rings, plus mastery-over-time | `/session/:id` |
| Misconception map | **P2** — 8 belief bands with evidence drawer and resolution markers | `/session/:id` |
| Learning trajectory | **P3** — step timeline, action colour, cost width, trigger markers | `/session/:id` |
| Chosen interventions | **P4** — action mix + three-tier decision detail + counterfactual | `/session/:id` |
| Difficulty progression | **P5** — item `b` vs learner `theta` with productive-zone shading | `/session/:id` |
| Predicted final mastery | **P6** — projection with confidence band vs remaining budget | `/session/:id` |
| Before/after learning outcome | **P7** — pre-test vs post-test on held-out probe items | `/session/:id` |
| *(bonus)* | **P8** Baseline comparison · **P9** Calibration · **P10** Policy sensitivity · **P11** Model health · **P12** Agent console | `/lab`, `/session/:id` |

---

## 7. Round-by-round evaluation criteria

### Round 1 — Minimum expectations

| Criterion | Status | Evidence |
|---|---|---|
| Five intelligence components connected to learner state | **Exceeded — 8** | P11; every component's output visibly feeds `LearnerState` |
| Adaptive next-action selection | **Met** | P4 candidate table; P12 live trace |
| Mastery dashboard | **Met** | P1 |

### Round 2 — Quality check

| Criterion | Status | Evidence |
|---|---|---|
| Budget-aware learning strategy | **Met** | Diegetic energy budget; `Cost^alpha`; trigger T4; efficiency is the *primary* metric, not a side note |
| Multiple learner profiles | **Exceeded — 7** | P8 per-profile small multiples |
| Compare adaptive strategy with fixed sequence baseline | **Exceeded — 4 baselines** | P8; B0 fixed, B1 random, B2 threshold, B3 ablation |

### Round 3 — Final (future-ready)

| Criterion | Status | Evidence |
|---|---|---|
| Demonstrate measurable improvement in simulated learning gain | **Met with statistics** | P8: 4,500 paired runs per policy, 95% CI, Cohen's d, pre-registered protocol ([`Evaluation.md`](./Evaluation.md) §1) |
| Show how the policy changes for different learner states | **Met directly** | **P10 Policy Sensitivity heatmap** — 9 actions x 7 profiles with a chi-square test. This panel exists specifically for this criterion. |

---

## 8. Suggested overall evaluation weights

| Weight | Criterion | Where we earn it | Self-assessment |
|---|---|---|---|
| **10%** | Problem understanding and business relevance | [`PRD.md`](./PRD.md) — 7 stakeholders, explicit non-goals, "a tutor that budgets its own attention" | Strong. The budget framing is a real business argument (S6), not a decorative one. |
| **20%** | AI/ML quality and correctness | 8 model cards with metrics, baselines, and **documented failure modes**; ablation table; **calibration panel** | Strong. The failure modes and calibration are what distinguish this from a metrics table. |
| **20%** | Agent architecture and decision logic | [`Agent_Policy.md`](./Agent_Policy.md); persisted candidate sets; 5 re-planning triggers; utility with explicit gain/explore/risk/cost terms | Strong. Every term is separately visible on screen. |
| **15%** | Simulation / planning / feedback loop | Depth-2 rollout; 7-profile simulator; trigger-driven re-planning; the counterfactual view | Strong. |
| **15%** | Dashboard, explainability, and UX | 12 panels; 2-click depth to any candidate table; every AI number traceable to a model | Strong, and the most schedule-sensitive. Protected by the Hour-42 feature freeze. |
| **15%** | Measured outcome improvement | Pre-registered protocol, 4 baselines, paired design, CIs, per-profile breakdown, honest losses reported | Strong. The pre-registration and the reported losses are the credibility multiplier. |
| **5%** | Innovation and demo quality | Diegetic budget; the T3 backwards-walk moment; the `sim` permission-denied demo; the calibration panel | Strong. The permission-denied moment is unusual enough to be memorable. |

---

## 9. Three claims a judge can verify in 60 seconds

If time is short, these are the three things to point at:

1. **"The agent never sees the answer key."**
   `psql` as `loom_app` → `SELECT * FROM sim.learner_truth` → **permission denied for schema sim**.

2. **"No LLM is doing the thinking."**
   Panel P11 → `llm_calls: 0`, eight team-built components with versions and held-out metrics.

3. **"Adaptive genuinely beat the fixed sequence, and here is how wrong we still are."**
   Panel P8 (baselines with CIs) beside Panel P9 (our own calibration error).

Each takes under twenty seconds and each answers a different kind of scepticism.
