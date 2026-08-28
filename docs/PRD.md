# PRD — LOOM, Adaptive Story Challenge Engine

**Version:** 1.0 · **Status:** Approved for build · **Problem Statement:** PS 6 (AIML)

---

## 1. Problem

Conventional learning systems present the same content sequence to every learner. A student who
already understands the distributive property sits through it anyway; a student who holds a
persistent misconception about carrying negative signs is marched forward into two-sided equations
where that misconception guarantees failure, and the system records "wrong answer" without ever
diagnosing *why*.

The gap is not content. It is **decision-making under uncertainty with a finite budget**. A teacher
with one hour and one struggling student makes a continuous stream of judgement calls: revise or
advance, hint or explain, harder or easier, and — crucially — *is this worth the time it costs?*
Almost no software makes that trade-off explicitly.

## 2. Product thesis

LOOM models a learner as a hidden state, models teaching actions as interventions with a cost and an
uncertain payoff, and runs a planning agent that picks the intervention with the highest expected
mastery gain per unit of budget. The narrative layer ("Signal from Kepler Station") exists so the
learner experiences a story, not a quiz — and so branching becomes a genuine pedagogical action
rather than decoration.

**One-line positioning:** *A tutor that budgets its own attention.*

## 3. Goals and non-goals

### Goals
| # | Goal |
|---|---|
| G1 | Maintain a live, uncertainty-aware estimate of learner knowledge across a 10-concept graph. |
| G2 | Detect and name specific misconceptions from answer patterns, not just mark answers wrong. |
| G3 | Choose the next teaching action by predicted learning gain under an explicit budget. |
| G4 | Re-plan continuously as the learner's state changes. |
| G5 | Demonstrate measurable improvement over a fixed sequence on simulated learners with statistical confidence. |
| G6 | Make every decision inspectable: what was considered, what was chosen, and why. |
| G7 | Prove the estimator is honest by publishing its calibration against ground truth. |

### Non-goals (explicitly out of scope — see [`Contract.md`](./Contract.md) §1)
| # | Non-goal | Why |
|---|---|---|
| N1 | Multiple subjects or grade levels | Depth beats breadth on this rubric. |
| N2 | Human user accounts, auth, classrooms, multiplayer | Zero rubric value, high time cost. |
| N3 | A content-authoring UI | Content is YAML in version control. |
| N4 | A conversational chatbot tutor | Explicitly disallowed as the primary engine, and strategically the weakest possible framing. |
| N5 | Mobile-native app | Responsive web is sufficient. |
| N6 | Real student data collection | Ethics and time. All learners are synthetic. |
| N7 | Production-grade scaling, multi-tenancy, or observability stack | It is a 48-hour prototype and should be honest about that. |

## 4. Stakeholders

We build for seven stakeholders. Two of them (the Learner and the Judge) are the ones we optimise for.

### S1 — The Learner *(primary)*
**Who:** a Class 8–9 student, roughly 13–15, working through linear equations. Motivated by
progression and story, demotivated by repetition and by being told "incorrect" with no diagnosis.

**Needs**
- To feel the session is about them — that it noticed what they specifically got wrong.
- To not repeat what they already know.
- To get a hint that scaffolds rather than a solution that spoils.
- To see progress, concretely.

**Success looks like:** finishes the story, mastery is measurably higher than at the start, and can
say what they got better at.

**What they must never experience:** dead ends, a wall of maths notation with no story, a stuck
loading state, or being punished for a slow answer.

### S2 — The Hackathon Judge *(primary — the one who awards the prize)*
**Who:** technical evaluator with 5–10 minutes, scoring against a published rubric, who has already
seen four chatbot wrappers today and is looking for a reason to believe this one is different.

**Needs**
- To see, within 60 seconds, that the intelligence is team-built and not an API call.
- To be able to ask "why did it do that?" and get a numeric answer, not a vibe.
- To see a baseline comparison with error bars.
- To probe for circularity and find that we anticipated it.

**Success looks like:** they stop looking for the trick and start asking design questions.

**Requirements this creates:** [`Rubric_Mapping.md`](./Rubric_Mapping.md), the Agent Console panel,
the Calibration panel, the Baseline Comparison panel, and the `sim` schema permission demo.

### S3 — The Educator / Teacher
**Who:** the person who would deploy this for a class.

**Needs**
- To see *which misconception* a student holds, in plain language, with the evidence.
- To see which concepts the class is weak on.
- To trust the system's judgement enough to override it.

**In scope for us:** the Misconception Map and the Before/After panel are readable without ML
knowledge; every mastery number states its confidence. **Out of scope:** any teacher-facing
authoring or override UI (N3).

### S4 — The Curriculum Designer
**Needs:** to know whether an item is doing pedagogical work — its estimated difficulty,
discrimination, and which misconceptions it actually catches.

**In scope:** the Item Diagnostics view backed by the IRT model (M4) and the misconception
confusion matrix (M3). This is a small addition on top of models we already have.

### S5 — The Researcher / ML Engineer (us, and anyone extending this)
**Needs:** reproducible experiments, an ablation table, model cards, and the ability to swap the
policy and re-run without touching the app.

**In scope:** the experiment harness, `configs/*.yaml`, [`Evaluation.md`](./Evaluation.md).

### S6 — The Institution Administrator
**Needs:** an outcome number that justifies the spend — "learning gain per unit of tutoring time".

**In scope:** the primary metric is literally this. The Before/After panel is their panel.

### S7 — The Development Team
**Needs:** to not re-litigate decisions at 3 a.m.

**In scope:** [`Contract.md`](./Contract.md), [`Design_Decisions.md`](./Design_Decisions.md),
[`Execution_Plan.md`](./Execution_Plan.md) with an explicit cut line.

---

## 5. User stories

### Learner
| ID | Story | Acceptance criteria |
|---|---|---|
| US-L1 | As a learner, I begin a story mission so that practice feels like progress. | Session starts with a narrative beat and a stated objective within 2 s. |
| US-L2 | As a learner, I answer a challenge and immediately see whether I was right and what happens next in the story. | Feedback and the next beat render in under 500 ms after submit. |
| US-L3 | As a learner who is stuck, I receive a hint that nudges rather than solves. | Hints are a 3-level ladder; level 1 never contains the answer. |
| US-L4 | As a learner with a misconception, I get a targeted explanation that contrasts my error with the correct rule. | When `P(misconception) > 0.55`, an `EXPLAIN` action becomes a candidate and its rationale names the misconception. |
| US-L5 | As a learner who already knows a concept, I am not made to practise it. | Concepts with estimated mastery > 0.85 are not re-assessed unless decay drops them below the threshold. |
| US-L6 | As a learner, I see how much mission energy remains. | Budget meter visible at all times; each action shows its cost before it is spent. |
| US-L7 | As a learner, I finish with a clear summary of what improved. | Before/after panel shows per-concept delta and a plain-language summary. |

### Judge / Evaluator
| ID | Story | Acceptance criteria |
|---|---|---|
| US-J1 | As a judge, I click any step in the trajectory and see every action the agent considered with its score. | Candidate table shows `action, predicted_gain, cost, risk, exploration, utility, selected`. |
| US-J2 | As a judge, I compare the adaptive policy against a fixed sequence. | Baseline panel shows 5 arms, mean and 95% CI, N stated on the chart. |
| US-J3 | As a judge, I check whether the agent is being graded in its own sandbox. | Calibration panel plus a documented `sim` schema permission denial. |
| US-J4 | As a judge, I verify no hosted LLM is doing the thinking. | Model Health panel lists all 8 components with versions and metrics; `llm_calls` table shown empty. |
| US-J5 | As a judge, I see the policy behave differently for different learners. | Policy sensitivity heatmap: action mix by learner profile. |

### Educator
| ID | Story | Acceptance criteria |
|---|---|---|
| US-E1 | As a teacher, I see which misconception a student holds and the evidence for it. | Misconception map lists belief, trend, and the specific responses that raised it. |
| US-E2 | As a teacher, I see the prerequisite gap behind a failure. | Mastery graph highlights the unmet prerequisite upstream of a failed concept. |

### Researcher
| ID | Story | Acceptance criteria |
|---|---|---|
| US-R1 | As a researcher, I run a cohort of N simulated learners under a chosen policy. | `POST /api/v1/sim/cohort` returns an `experiment_id`; results queryable. |
| US-R2 | As a researcher, I reproduce any run exactly. | Same `(experiment_id, seed)` yields identical step sequence. |
| US-R3 | As a researcher, I measure each component's contribution. | Ablation table in the Evaluation view, one row per component removed. |

---

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Maintain per-concept mastery belief with uncertainty, updated after every response. | P0 |
| FR-2 | Maintain per-misconception belief, updated after every response. | P0 |
| FR-3 | Estimate item difficulty and discrimination from response data. | P0 |
| FR-4 | Predict mastery on unattempted concepts by propagating through the prerequisite graph. | P0 |
| FR-5 | Predict expected learning gain for a `(state, action)` pair. | P0 |
| FR-6 | Rank candidate actions and select one under a budget constraint. | P0 |
| FR-7 | Persist the full candidate set and rationale for every decision. | P0 |
| FR-8 | Simulate outcomes with depth-2 lookahead before committing. | P1 |
| FR-9 | Re-plan on every response and on five event triggers. | P0 |
| FR-10 | Track correctness, response time, hints used, and repeated errors per concept. | P0 |
| FR-11 | Detect disengagement and hint-abuse patterns. | P2 (bonus) |
| FR-12 | Infer a learner archetype from early responses for a cold-start prior. | P2 (bonus) |
| FR-13 | Deliver 8 story decision points with at least 2 branch paths. | P0 |
| FR-14 | Administer an identical pre-test and post-test for before/after measurement. | P0 |
| FR-15 | Run cohort simulations across policies and persist metrics. | P0 |
| FR-16 | Render all 7 required dashboard panels plus 5 bonus panels. | P0 / P2 |
| FR-17 | Compare against 4 baseline policies with confidence intervals. | P0 |
| FR-18 | Serve a fully offline demo mode from committed fixtures. | P1 |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Agent decision latency | p95 < 150 ms |
| NFR-2 | End-to-end response submit to next beat rendered | p95 < 500 ms |
| NFR-3 | Full 8-component training run | < 5 minutes on a laptop |
| NFR-4 | Headline experiment (500 learners x 5 seeds x 5 policies) | < 12 minutes |
| NFR-5 | Reproducibility | Bit-identical given seed and model versions |
| NFR-6 | Demo resilience | Works with no internet, from a local Postgres or fixture snapshot |
| NFR-7 | Dashboard first paint | < 1.5 s on the demo machine |
| NFR-8 | Explainability coverage | 100% of AI-derived on-screen numbers traceable to a model and inputs |

## 8. Success metrics

### Product metric (the headline)
> **True weighted mastery gain per 100 energy units, versus a fixed linear sequence.**
> Target: **≥ +30%**, with a 95% CI that excludes zero, over 500 held-out simulated learners x 5 seeds.

### Supporting metrics
| Metric | Target |
|---|---|
| Concepts mastered within budget (mastery > 0.8) | ≥ +2 concepts vs B0 |
| Misconception resolution rate | ≥ 70% of injected misconceptions resolved within budget |
| Median steps to resolve a detected misconception | ≤ 3 |
| Knowledge-state estimator MAE vs ground truth | ≤ 0.12 |
| Estimator calibration (ECE) | ≤ 0.08 |
| Misconception detector macro-F1 | ≥ 0.70 |
| Policy differentiation | Action-mix distributions differ significantly across the 7 profiles (chi-square, p < 0.01) |

### Hackathon metric
Every line of the official rubric mapped to a demonstrable artefact — see
[`Rubric_Mapping.md`](./Rubric_Mapping.md).

## 9. Constraints and assumptions

**Constraints**
- 48 hours, fixed. See [`Execution_Plan.md`](./Execution_Plan.md).
- Suggested stack: React, FastAPI, scikit-learn/XGBoost, Postgres — we adopt it as given.
- No hosted LLM in the decision path ([`Contract.md`](./Contract.md) §3).
- Neon serverless Postgres, free tier: assume cold-start latency on first connect and connection
  limits; pool accordingly ([`DB.md`](./DB.md) §8).

**Assumptions**
- Judges will evaluate on a projected screen; design for legibility at distance.
- No internet on stage is a real possibility. Offline mode is mandatory (FR-18).
- The evaluation cohort is synthetic; all claims are about simulated learning gain and must be
  stated that way. We never claim a real-world learning result.

## 10. Release plan

| Milestone | Hour | Definition of done |
|---|---|---|
| **M0 — Foundations frozen** | 6 | Concept graph, misconceptions, item bank, story beats authored and seeded. Contract ratified. |
| **M1 — Intelligence** | 18 | All 8 components trained, each with a held-out metric in the DB. |
| **M2 — Agent alive** | 26 | Closed loop running end-to-end on a simulated learner; candidate sets persisted. |
| **M3 — Evidence** | 34 | Headline experiment run; baselines beaten; ablation table produced. |
| **M4 — Dashboard** | 42 | All 12 panels rendering from real run data. |
| **M5 — Demo-ready** | 46 | Offline mode verified, demo script rehearsed twice, fallback video recorded. |
| **Buffer** | 46–48 | Fix only. No new features after Hour 42. |

## 11. Open questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| Q1 | Does the venue provide internet for the demo? | Team lead | Hour 4 — if unknown, assume no. |
| Q2 | Is the presentation time 5 or 10 minutes? | Team lead | Hour 4 — script for 5, prepare 3 extra slides. |
| Q3 | Do judges get hands-on access to the dashboard? | Team lead | Hour 12 — if yes, harden empty states (C8.5). |
| Q4 | Is a hosted-LLM baseline acceptable to the organisers even offline? | Team lead | Hour 20 — if unclear, cut B4; it is already first on the cut line. |
