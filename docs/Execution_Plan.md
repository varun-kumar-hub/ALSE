# Execution Plan — 48 Hours

The official guidance is a 24-hour plan. We have 48. **The extra 24 hours do not buy more scope — they
buy evidence, polish, and rehearsal**, which is where the marks that separate first from fourth
actually live.

The scope is fixed by [`Contract.md`](./Contract.md) §1 and does not grow. If we finish early, we run
more experiments and rehearse more, not build more.

---

## Roles

Sized for a 4-person team. With 3, merge Backend and ML; with 2, cut M7, M8, and panels P10–P11 on
day one rather than at Hour 40.

| Role | Owns |
|---|---|
| **ML** | M1–M8, IRT, feature builders, training harness, ablations |
| **Agent** | State engine, action generator, scorer, planner, replanner, policies, simulator |
| **Backend** | FastAPI, services, repositories, Neon schema, migrations, experiment runner |
| **Frontend** | 12 panels, story player, agent console, demo mode |
| **Everyone** | Content authoring in Hours 2–6. It is the critical path and it is parallelisable. |

---

## Phase map

| Phase | Hours | Gate |
|---|---|---|
| 0 · Foundations | 0–6 | Content authored and seeded; contract ratified |
| 1 · Intelligence | 6–18 | All 8 models trained with held-out metrics |
| 2 · Agent | 18–26 | Closed loop running end to end |
| 3 · Evidence | 26–34 | Headline experiment run; baselines beaten |
| 4 · Dashboard | 34–44 | All 12 panels rendering from real data |
| 5 · Demo | 44–48 | Rehearsed twice, offline verified, fallback recorded |

---

## Phase 0 · Hours 0–6 — Foundations

**This phase decides the project.** Teams lose PS 6 by spending Hours 0–6 arguing about scope and then
authoring content at Hour 20 while the agent starves.

| Hour | Task | Owner |
|---|---|---|
| 0–1 | Read [`Contract.md`](./Contract.md) together. Ratify it out loud. Assign roles. Create the repo, Neon project, and branches. | All |
| 1–2 | Scaffold: FastAPI skeleton, Vite app, Alembic 001 (schemas + roles + grants), `.env` for everyone. | Backend |
| 1–2 | Domain types: `ConceptGraph`, `ItemBank`, `LearnerState`, `Action`, `Observation`. Pure, no I/O. | Agent |
| **2–6** | **CONTENT AUTHORING — all hands.** Split: two people on items and distractors, one on story beats, one on hints, explanations, and remedies. | All |
| 4–6 | In parallel: content loader, validator (every invariant in [`Concept_Graph.md`](./Concept_Graph.md) §4.2), seeder. | Backend |
| 5–6 | Simulator skeleton: `TrueLearnerState`, the 7 profiles, the response process. | Agent |

**Gate at Hour 6.** Content seeds cleanly and every validator passes. If content is not done, **stop
everything else and finish it.** Nothing downstream can start without it.

**Hour 6 freeze:** action costs and policy parameters are written to `content/config/` and not touched
again.

---

## Phase 1 · Hours 6–18 — Intelligence

| Hour | Task | Owner |
|---|---|---|
| 6–8 | Simulator complete: response process, forgetting, engagement, misconception interference. | Agent |
| 8–10 | Generate the pretraining cohort (4,000 learners, seeds 1000–1999) under the mixed policy. | Agent |
| 8–10 | Feature builders: concept, sequence, response, action. Shared between training and inference. | ML |
| 10–12 | **M1 (KSE)** — BKT with EM fit and graph propagation. Held-out AUC. | ML |
| 10–12 | **M4 (DEM)** — 2PL EM fit, online theta update. | ML |
| **12** | **Simulator validation V1–V4** ([`Simulation.md`](./Simulation.md) §6). **V2 is a hard gate.** | Agent + ML |
| 12–14 | **M3 (MCD)** — classifier plus Bayesian accumulator. The highest-value model; give it the most attention. | ML |
| 12–14 | Action generator and legality rules. | Agent |
| 14–16 | **M2 (CMP)**, **M5 (LGP)**. | ML |
| 14–16 | Repositories and migrations 002–007. | Backend |
| 16–18 | **M6 (ABR)**, **M7 (EGD)**, **M8 (LAC)**. | ML |
| 16–18 | `ModelBundle`, model registry, metrics persistence. | Backend |
| 8–18 | Frontend: layout shell, routing, API client generation, story player skeleton, **P12 Agent Console early** (it is the fastest way to debug the agent). | Frontend |

**Gate at Hour 18.** All 8 models trained; every metric in `app.model_metrics`; `train_all` completes
in under 5 minutes.

**If behind:** cut M8, then M7. They are bonus for exactly this reason.

---

## Phase 2 · Hours 18–26 — The Agent

| Hour | Task | Owner |
|---|---|---|
| 18–20 | `StateEngine` — observation folding, decay, all model invocations. Round-trip serialisation test. | Agent |
| 18–20 | `SessionService`, session endpoints, one-transaction-per-step. | Backend |
| 20–22 | `Scorer` — gain, exploration, risk, cost. Every sub-term exposed. | Agent |
| 20–22 | `Planner` — depth-2 rollout, vectorised. | Agent |
| 22–24 | `Replanner` — triggers T1–T5. Verify each fires in 15–60% of pretraining sessions; a trigger that never fires is dead code and gets removed. | Agent |
| 22–24 | `AgentController`, `RationaleBuilder`, decision persistence, `actions_considered`. | Agent + Backend |
| 24–26 | Baselines B0, B1, B2, B3 against the same `Policy` interface. | Agent |
| 24–26 | WebSocket trace; Agent Console wired to live frames. | Backend + Frontend |
| **26** | **Latency benchmark.** Pin `rollout_samples` so p95 decide < 150 ms. | Agent |
| 18–26 | Frontend: story player working end to end; P1 mastery graph; P3 trajectory. | Frontend |

**Gate at Hour 26.** A full simulated session runs end to end. Every decision has ≥ 3 persisted
candidates. p95 decision latency under 150 ms.

---

## Phase 3 · Hours 26–34 — Evidence

**This phase is what the extra 24 hours bought.** Most 24-hour teams reach Hour 26 with a working
agent and no evidence, and lose 15% of the rubric plus most of their credibility.

| Hour | Task | Owner |
|---|---|---|
| 26–28 | `ExperimentRunner`: buffered bulk writes, multiprocess over seeds, per-run metrics. | Backend |
| 26–28 | **Pilot on the development cohort** (seeds 5000–5099, 100 learners x 5 policies). Sanity-check every number. Iterate freely — this is the last point at which iteration is allowed. | ML + Agent |
| 28–30 | Fix whatever the pilot exposes. Re-tune policy parameters on the **pretraining** cohort only. | All |
| **30** | **FREEZE.** Model artefacts, policy parameters, `configs/headline.yaml`. Record every version hash. | All |
| **30–31** | **Run the headline experiment, once.** 900 x 5 policies x 5 seeds, ~12 min. Whatever comes out is what we report. | ML |
| 31–33 | Ablations: 13 configurations on a 200-learner cohort. | ML |
| 33–34 | Calibration under `loom_eval`; materialise into `app.run_metrics`. | Backend |
| 33–34 | Select the four showcase sessions for demo mode (F8). Pin their IDs. | All |
| 26–34 | Frontend: P4 interventions with the full candidate table; P7 before/after. | Frontend |

**Gate at Hour 34.** The headline number exists, with a CI, traceable to a `run_id`. The ablation
table exists. The calibration metrics exist.

**If the headline number disappoints:** report it. Do not re-tune and re-run
([`Evaluation.md`](./Evaluation.md) §1). Diagnose *why* using the ablation table and per-profile
breakdown, and make that diagnosis part of the presentation. A team that explains a modest result
convincingly outscores a team with a suspicious one.

---

## Phase 4 · Hours 34–44 — Dashboard

| Hour | Panels | Owner |
|---|---|---|
| 34–36 | P1 Mastery Graph (React Flow), P3 Trajectory — finish and polish | Frontend |
| 36–38 | P4 Interventions with three-tier drill-down and counterfactual toggle | Frontend |
| 38–39 | P2 Misconception Map with the evidence drawer | Frontend |
| 39–40 | P5 Difficulty Progression, P6 Projection | Frontend |
| 40–41 | P7 Before/After | Frontend |
| 41–42 | **P8 Baseline Comparison**, **P9 Calibration** — the two that win the argument | Frontend |
| 42–43 | P10 Policy Sensitivity, P11 Model Health | Frontend |
| 43–44 | P12 Agent Console polish; loading and empty states everywhere; projector legibility pass | Frontend |
| 34–44 | Backend: read-model views, aggregation endpoints, demo-mode fixtures | Backend |
| 34–44 | ML/Agent: pair with Frontend on data shapes; write the judge Q&A prep in [`Demo_Script.md`](./Demo_Script.md) §5 | ML + Agent |

**Hour 42: feature freeze.** After this, bug fixes only ([`PRD.md`](./PRD.md) §10).

**Gate at Hour 44.** All 12 panels render from real run data. Every panel has a loading and an empty
state. Nothing crashes on a click.

---

## Phase 5 · Hours 44–48 — Demo

| Hour | Task | Owner |
|---|---|---|
| 44–45 | `make snapshot`; restore into local Docker Postgres; **verify the entire demo with wifi switched off.** | Backend |
| 45–46 | **Full rehearsal #1**, timed, with someone playing a hostile judge. | All |
| 46–47 | Fix what rehearsal broke. Re-snapshot if any data changed. | All |
| 47–47.5 | **Full rehearsal #2.** Should be boring. If it is not, cut something. | All |
| 47.5–48 | Record a fallback screen-capture video of the full demo. Copy the snapshot and the video to a USB stick. Sleep if possible. | All |

**Gate at Hour 48.** Demo runs offline, twice, in under 5 minutes, with no live randomness.

---

## Parallelisation map

```
Hours   0    6         12        18        24        30      34         42   48
        |----|---------|---------|---------|---------|-------|----------|----|
ML      |cont|  models M1,M4  M3  M2,M5  M6,M7,M8 |pilot|HEADLINE|abl| support |
Agent   |cont| simulator | actions | state | scorer/plan | baselines |  QA prep |
Backend |scaf| loader/seed | repos/migrations | API | runner | views/endpoints |
Front   |scaf| shell/client | console(early) | player | P1,P3 | P4,P2,P5-P11    |
        |    |         |         |         |         |       |          |    |
GATES   H6 content  H12 V1-V4  H18 models  H26 loop  H30 FREEZE  H42 feature  H48
```

---

## Decision points

| Hour | Question | If yes | If no |
|---|---|---|---|
| 6 | Is content complete and seeding? | Proceed | **Stop everything. Finish content.** |
| 12 | Does V2 pass (B0 gains 0.15–0.35)? | Proceed | Re-calibrate item difficulties. Do not proceed. |
| 18 | Are all 6 required models trained with metrics? | Proceed | Cut M8, then M7. Required models are non-negotiable. |
| 26 | Does a full session run end to end? | Proceed to evidence | Drop the rollout to depth 1; ship the loop. |
| 30 | Are we ready to freeze? | Freeze and run | Freeze anyway. **A frozen imperfect system beats an unfrozen perfect one.** |
| 34 | Do we have a headline number with a CI? | Build the dashboard | Report what we have and explain it. |
| 42 | Are the 7 required panels done? | Polish the bonus panels | Stop bonus work. Finish the required ones. |
| 44 | Does the demo run offline? | Rehearse | Fix this before anything else. |

---

## Cut line (from [`Contract.md`](./Contract.md) §11)

Cut in this exact order. **Decided now, so nobody improvises at Hour 40.**

1. B4 LLM-only baseline
2. Local narrative LLM rewording
3. P10 Policy Sensitivity panel
4. M8 Learner Archetype Classifier
5. M7 Engagement Detector
6. Depth-2 lookahead → depth-1
7. Story branches 3 → 2

**Never cut:** the 6 required models · the agent loop · candidate-set persistence · the 7 required
panels · the B0 comparison · the calibration panel · seeded reproducibility.

---

## Anti-patterns to avoid

| Anti-pattern | Why it kills PS 6 |
|---|---|
| Authoring content at Hour 20 | Everything downstream is blocked. This is the #1 killer. |
| Adding a second topic | Doubles content, adds nothing to the score. |
| Tuning on the evaluation cohort | Destroys the only credible number you have. |
| Building panels before there is data | You will build them twice. |
| Skipping the pilot run | The headline experiment fails at Hour 31 and you have no time left. |
| "We'll do the baseline at the end" | The baseline *is* 15% of the score. Build B0 with the agent. |
| Polishing the story player instead of the console | Judges look at the console first. |
| Not rehearsing | A five-minute demo has no room for a surprise. |
| Demoing over wifi | One dropped connection ends the presentation. |

---

## Sleep

Two people rest Hours 20–24, two Hours 24–28. Rotate again Hours 36–40 if the schedule holds.

Hours 30–34 are the highest-stakes block in the project — the freeze, the headline run, and the
ablations. **Nobody makes an irreversible decision in that window while sleep-deprived.** If the team
is exhausted at Hour 30, freeze anyway and sleep; the run takes 12 minutes and can start at Hour 32
without breaking anything downstream.
