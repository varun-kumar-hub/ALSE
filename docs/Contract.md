# Contract — The Locked Rules of LOOM

**Status:** RATIFIED · **Version:** 1.0 · **Owner:** whole team

This document is the project constitution. Everything in it is **locked**. If a rule here has to
change, it changes by an explicit amendment recorded in §12, agreed by the whole team, and mirrored
into [`Design_Decisions.md`](./Design_Decisions.md) — never silently in code.

The purpose of this document is speed. In a 48-hour build the expensive failures are not bugs, they
are *re-litigated decisions*. If a question is answered here, the answer is final and you keep moving.

---

## 1. Scope contract — what LOOM is and is not

| # | Rule |
|---|---|
| C1.1 | LOOM teaches **exactly one topic: Linear Equations in One Variable**. No second topic ships, ever, under any circumstances. |
| C1.2 | The concept graph is **exactly 10 concepts** (C1–C10) with the edges frozen in [`Concept_Graph.md`](./Concept_Graph.md) §2. Concepts are not added after Hour 8. |
| C1.3 | The misconception taxonomy is **exactly 8 misconceptions** (M1–M8), frozen at Hour 8. |
| C1.4 | The story has **exactly 8 decision points** (the spec allows 5–10). Not 9. Not 12. |
| C1.5 | The item bank is **28 items** at freeze. Items may be edited for quality after freeze; the count does not grow. |
| C1.6 | LOOM is a **single-learner, single-session** experience. No multiplayer, no classrooms, no accounts, no auth. |
| C1.7 | There is **no content authoring UI**. Content is seeded from version-controlled YAML. |
| C1.8 | There is **no user registration**. A "learner" is created by starting a session. |
| C1.9 | Every session — **including every baseline policy** — administers the same 6-item pre-test and post-test, in the same fixed order. A policy without a pre-test cannot be compared on learning gain. |
| C1.10 | The pre-test is **fixed, never agent-chosen**. The agent's first decision comes after it. Pre-test responses **do** feed the agent's state: probe items are held out from *teaching*, never from *evidence*. |

**Rationale:** Every hour spent broadening the domain is an hour not spent on the agent, and the agent
is 20% of the score while "problem understanding" is 10%. Narrow and deep wins this rubric.

---

## 2. Intelligence contract — what counts as a model

| # | Rule |
|---|---|
| C2.1 | LOOM ships **8 intelligence components**: 6 required by the PS, 2 bonus. They are M1–M8 in [`Model_Cards.md`](./Model_Cards.md). |
| C2.2 | Every component must produce an **independently evaluable output** with a held-out metric recorded in `app.model_metrics`. A component with no metric does not count and must be cut. |
| C2.3 | Every component must **materially change the agent's behaviour**. If ablating a component does not move the headline metric, it is decoration — say so honestly in [`Evaluation.md`](./Evaluation.md) rather than hiding it. |
| C2.4 | No component may read from the `sim` schema. See §4. |
| C2.5 | Every component is **deterministic given `(inputs, model_version, seed)`**. Any stochastic component takes an explicit `numpy.random.Generator`, never global random state. |
| C2.6 | Every trained artefact is versioned in `app.model_registry` with its training config hash. The API reports which version produced every prediction. |

---

## 3. AI-API policy contract — the hackathon's hard line

The organisers' rule (PDF, page 1): *hosted LLMs may be used only for auxiliary functions; they cannot
be the primary reasoning, prediction, planning, or decision engine.*

| # | Rule |
|---|---|
| C3.1 | **No hosted LLM API is called anywhere in the request path of a learner session.** Not for state estimation, not for scoring, not for ranking, not for action selection, not for hint choice. |
| C3.2 | An optional **local** Hugging Face model may reword *pre-authored* narrative text. It is behind the feature flag `LOOM_NARRATIVE_LLM=off`, which is **off by default and off during the demo**. |
| C3.3 | If the flag is ever on, the call is logged to `app.llm_calls` with `purpose='narrative_flavor'`, the input, and the output. The table is exposed read-only on the dashboard's Model Health panel so a judge can verify the log is empty. |
| C3.4 | The LLM **never selects, ranks, filters, or generates an action**. It never sees learner state. It receives only a pre-authored string and a tone parameter. |
| C3.5 | A hosted LLM baseline (`B4`) exists **only inside the offline evaluation harness** as a comparison arm, is generated ahead of time into a fixture file, and is never invoked live. See [`Evaluation.md`](./Evaluation.md) §3. |
| C3.6 | LLMs used by the *team* to write code or prose are out of scope for this rule and are fine. |

**Enforcement:** a unit test (`tests/test_policy_compliance.py`) asserts that no module under
`loom/agent/`, `loom/ml/`, or `loom/services/` imports any network client, and that the runtime
decision path makes zero outbound HTTP calls during a full simulated session.

---

## 4. Anti-circularity contract — the most important section in this document

The failure mode that kills adaptive-learning projects: **the simulator and the agent share a model,
so the agent is graded in a universe designed to make it win.** LOOM forecloses this structurally,
not by promise.

| # | Rule |
|---|---|
| C4.1 | The **simulator** (ground truth) and the **agent's estimator** use *different functional families*. Simulator: continuous latent ability with a compensatory logistic response process, Ebbinghaus forgetting, and misconception-conditioned distractor selection. Agent: discrete-state Bayesian Knowledge Tracing with graph credit propagation. Neither can be derived from the other. |
| C4.2 | Simulator parameters are **never passed to the agent**, in memory or over the wire. |
| C4.3 | Ground truth lives in the Postgres schema **`sim`**. The application role `loom_app` has **no `USAGE` grant on `sim`**. A `SELECT` from application code raises a permission error at the database. This is not a convention; it is enforced by the DBMS. |
| C4.4 | The agent's only observation per step is the tuple `(item_id, chosen_option_id, is_correct, response_time_ms, hints_used, timestamp)`. Nothing else crosses the boundary. |
| C4.5 | Only the **evaluation harness**, running as role `loom_eval`, may join `app` and `sim` — and only *after* a run has completed. Joining mid-run is forbidden. |
| C4.6 | The estimator's error against ground truth is **published, not hidden**: the Calibration panel is a required dashboard element, not a stretch goal. |
| C4.7 | Model **pretraining** may use simulator-generated transcripts, because that is exactly what real historical logs would be. It may **not** use simulator latent parameters as features or labels. Labels are derived from observable outcomes only. |

**Judge-facing statement (memorise this):** *"Our agent never sees the answer key. Ground truth lives in
a database schema our application role has no permission to read. Here is the calibration plot showing
how wrong we are."*

---

## 5. Agent contract — what "agentic" means here

| # | Rule |
|---|---|
| C5.1 | The agent runs a closed loop: **OBSERVE → UPDATE → GENERATE → SIMULATE → SCORE → SELECT → ACT**. Every step of the loop is team-implemented. |
| C5.2 | At every decision the agent must generate **at least 3 and at most 12 candidate actions**. A single-candidate decision is a bug. |
| C5.3 | Every candidate must be **scored before selection**, and every candidate's score must be persisted to `app.actions_considered`. A decision with no stored alternatives is a bug. |
| C5.4 | Selection is by **expected weighted mastery gain per unit budget cost**, with an exploration bonus and a risk penalty. The exact formula is frozen in [`Agent_Policy.md`](./Agent_Policy.md) §4. |
| C5.5 | The agent operates under a **hard budget of 100 energy units and 25 interactions**. It must reason about the budget, not merely stop when it runs out. |
| C5.6 | The agent must **re-plan on every learner response**, plus on the five event triggers in [`Agent_Policy.md`](./Agent_Policy.md) §6. |
| C5.7 | Every decision must produce a **human-readable rationale string** built from the numbers, not from a template chosen at random. |
| C5.8 | Decision latency budget: **p95 under 150 ms** on the demo machine. If lookahead breaches it, reduce rollout count — never remove scoring. |

---

## 6. Data contract

| # | Rule |
|---|---|
| C6.1 | All learning content (concepts, items, options, hints, explanations, story) is **hand-authored by the team** and version-controlled as YAML under `content/`. It is the ground truth; the database is a projection of it. |
| C6.2 | All learner data is **synthetic**. No human subject data, no PII, at any point. |
| C6.3 | Item difficulty has two values: an **authored prior** and an **IRT-estimated** value. The authored prior is never overwritten in the YAML; estimates live in the DB. |
| C6.4 | Every distractor option maps to **exactly zero or one** misconception. Never two. |
| C6.5 | Seeds are declared in config files, never inline. Every experiment records its seed. |
| C6.6 | The pretraining cohort and the evaluation cohort use **disjoint seed ranges** (pretraining `1000–1999`, evaluation `9000–9999`). No learner is ever in both. |
| C6.7 | The pre-test and post-test are **free** — they charge neither energy nor interactions. They are measurement, not teaching, and charging them would put non-teaching cost in the denominator of the primary metric. |
| C6.8 | A **learner-requested** hint costs energy, does **not** consume an interaction, and does **not** consume the agent's turn — the learner returns to the same open item and the agent does not re-decide. It is recorded as an observation feeding M7's `hint_reliance`, and it discounts the mastery credit of a subsequent correct answer. |

---

## 7. Reproducibility contract

| # | Rule |
|---|---|
| C7.1 | Every run is identified by `(experiment_id, learner_seed, policy_id, model_version_set)` and is **byte-for-byte reproducible** from it. |
| C7.2 | The demo replays **committed runs by ID**. No live sampling on stage. |
| C7.3 | `configs/headline.yaml` is frozen once the headline number is generated. Regenerating the number requires a new config file, not an edit. |
| C7.4 | Any chart shown to a judge must be traceable to a `run_id` in the database. No numbers typed into slides by hand. |

---

## 8. Dashboard contract

| # | Rule |
|---|---|
| C8.1 | All seven PS-required panels ship: mastery graph, misconception map, learning trajectory, chosen interventions, difficulty progression, predicted final mastery, before/after outcome. |
| C8.2 | **Every AI-driven number on screen is clickable and explains itself** — which model produced it, from which inputs, with what confidence. |
| C8.3 | No panel displays a value the backend did not compute. No frontend-side "smoothing" of results. |
| C8.4 | The dashboard must render correctly with the backend seeded from a fixture and **no network access**. Offline demo mode is mandatory. |
| C8.5 | Loading states and empty states exist for every panel. A judge clicking early must never see a stack trace. |

---

## 9. Evaluation contract

| # | Rule |
|---|---|
| C9.1 | LOOM is compared against **four baselines**: fixed linear sequence (B0), random (B1), mastery-threshold heuristic (B2), greedy-myopic ablation (B3). An LLM-only tutor (B4) is included if time allows. |
| C9.2 | The **primary metric** is *true weighted mastery gain per 100 energy units*, measured against simulator ground truth on a held-out evaluation cohort. |
| C9.3 | Every headline claim carries a **95% confidence interval** over at least 500 learners and 5 seeds. A point estimate with no interval is not reportable. |
| C9.4 | If LOOM loses to a baseline on any metric, **we report that too**, on the same chart. |
| C9.5 | The ablation table must show the contribution of each of the 8 components. |

---

## 10. Engineering contract

| # | Rule |
|---|---|
| C10.1 | The domain core (`loom/agent/`, `loom/ml/`, `loom/domain/`) is **pure Python with no database imports**. It is testable without Postgres. |
| C10.2 | All DB access goes through `loom/repo/`. No SQL anywhere else. |
| C10.3 | All API payloads are Pydantic models. No bare dicts cross the API boundary. |
| C10.4 | No `print()` in library code — structured logging via `loom.core.log` only. |
| C10.5 | Time is injected (`Clock` protocol). No `datetime.now()` in the domain core, so runs are reproducible. |
| C10.6 | Migrations are Alembic-only. Nobody edits the Neon database by hand. |
| C10.7 | Secrets live in `.env`, which is gitignored. `.env.example` is committed with placeholder values. |

---

## 11. Cut-line contract — what dies first if we run late

Cut in this exact order. Do not improvise under pressure at Hour 40.

1. B4 LLM-only baseline (nice-to-have comparison)
2. Local narrative LLM rewording (already off by default)
3. Policy Sensitivity heatmap panel (P10)
4. M8 Learner Profile Classifier — replaced by a uniform cold-start prior
5. M7 Engagement Detector — replaced by a response-time z-score rule
6. Depth-2 lookahead reduced to depth-1 (keep scoring, lose rollout)
7. Story branching reduced from 3 branches to 2

**Never cut:** the 6 required models, the agent loop, the candidate-set persistence, the seven required
panels, the B0 baseline comparison, the calibration panel, seeded reproducibility.

---

## 12. Amendments

| # | Date | Rule changed | Reason | Agreed by |
|---|---|---|---|---|
| — | — | — | — | — |

*(Append only. Never edit a ratified row.)*
