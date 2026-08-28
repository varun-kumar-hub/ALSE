# Risk Register

Scored `Impact (1–5) x Likelihood (1–5)`. Anything at 12 or above has a named owner, a trigger that
tells you it is happening, and a decided response — not a hope.

| # | Risk | I | L | Score | Owner |
|---|---|---|---|---|---|
| R1 | Content authoring overruns Hour 8 | 5 | 4 | **20** | All |
| R2 | The headline result is weak or negative | 4 | 3 | **12** | ML |
| R3 | Simulator validation V2 fails | 5 | 2 | 10 | Agent |
| R4 | Decision latency blows the demo | 3 | 3 | 9 | Agent |
| R5 | Dashboard incomplete at Hour 44 | 4 | 3 | **12** | Frontend |
| R6 | A judge finds a circularity flaw we missed | 5 | 2 | 10 | All |
| R7 | Neon unavailable or slow during the demo | 4 | 3 | **12** | Backend |
| R8 | Scope creep — a second topic, more items, more panels | 4 | 3 | **12** | All |
| R9 | M3 (misconception detector) underperforms | 4 | 3 | **12** | ML |
| R10 | Integration fails late — the pieces never meet | 5 | 2 | 10 | Backend |
| R11 | Team exhaustion causes a bad Hour-30 decision | 4 | 3 | **12** | Team lead |
| R12 | Demo machine fails | 5 | 1 | 5 | All |
| R13 | Someone tunes on the evaluation cohort | 5 | 2 | 10 | ML |
| R14 | Presentation runs over time | 3 | 3 | 9 | Presenter |

---

## R1 · Content authoring overruns (20) — the top risk

**Why it is the top risk.** Nothing downstream can start without content. Models cannot train, the
simulator cannot run, the agent has no action space. A four-hour overrun here costs six hours
downstream, and it is the single most common way PS 6 teams fail.

| | |
|---|---|
| **Trigger** | At Hour 4, fewer than 14 of 28 items are complete. |
| **Response** | Cut the item bank from 28 to 20 (2 per concept for C1–C6, 1 each for C7–C10 plus probes). Cut story branches from 3 to 2 (`applied` + `visual`; drop `abstract`). **Do not cut the misconception count** — M3 depends on all 8 being reachable. |
| **Prevention** | All four people author in Hours 2–6, in parallel, on separate files. A shared template is written first so nobody invents structure. Two people on items, one on story, one on hints and remedies. |
| **Hard rule** | If content is not seeding at Hour 6, **everything else stops** until it is. |

---

## R2 · The headline result is weak or negative (12)

| | |
|---|---|
| **Trigger** | The pilot at Hour 26 shows LOOM under +15% versus B0. |
| **Response — and this is decided in advance** | **Diagnose, do not re-tune on evaluation data.** Use the ablation table and per-profile breakdown to find where the policy is losing. Most likely causes, in order: (a) the readiness gate is too strict and the agent never advances; (b) rollout samples too few, so `Gain_rollout` is noise; (c) action costs make `EXPLAIN` unaffordable; (d) V2 failed silently and B0 is unrealistically strong. |
| **Fix window** | Hours 26–30, **on the pretraining cohort only** ([`Contract.md`](./Contract.md) C6.6). |
| **If it is still weak at Hour 30** | Report it. Present the per-profile breakdown, where the margin on P4 and P5 will still be large, and be explicit that the aggregate is diluted by profiles that need less help. A team that explains a modest result convincingly outscores a team with a suspicious one. |
| **What we will not do** | Re-run until a favourable seed appears. That is the one thing that would make everything else on the dashboard worthless. |

---

## R3 · Simulator validation V2 fails (10)

V2: under B0, mean weighted mastery gain must fall in 0.15–0.35
([`Simulation.md`](./Simulation.md) §6).

| | |
|---|---|
| **Why it matters** | If B0 gains nothing, nothing can be learned and our "win" is an artefact. If B0 gains everything, adaptivity cannot matter. **This check protects the headline from both directions.** |
| **Trigger** | The Hour-12 validation run falls outside the band. |
| **Response** | Too low → item difficulties are too high, or `learn_rate` too low. Too high → difficulties too low, or `TEACH` too effective. Adjust the **simulator's** parameter distributions and the authored difficulty priors, then re-run. |
| **Hard rule** | Do not proceed past Hour 12 with V2 failing. A day of work on a broken world is a day lost. |

---

## R4 · Decision latency blows the demo (9)

| | |
|---|---|
| **Trigger** | The Hour-26 benchmark shows p95 decide > 150 ms. |
| **Response, in order** | 1. Reduce `rollout_samples` 32 → 16 → 8. 2. Vectorise the rollout if it is still a Python loop. 3. Reduce max candidates 12 → 8. 4. Depth 2 → depth 1. |
| **Never** | Remove scoring, or stop persisting candidates ([`Contract.md`](./Contract.md) C5.8). Those are the score. |
| **Note** | Demo mode replays persisted snapshots and does not re-run the agent, so latency cannot ruin the demo itself — only the live-play section. |

---

## R5 · Dashboard incomplete at Hour 44 (12)

| | |
|---|---|
| **Trigger** | At Hour 40, fewer than 5 of the 7 required panels are done. |
| **Response** | Stop all bonus panels. Finish the required 7. Then P8 and P9 — those two are worth more than P10 and P11 combined. |
| **Prevention** | Build order is fixed in [`Dashboard_Spec.md`](./Dashboard_Spec.md) §Build order. Panels are independent components with typed API contracts, so they can be built in any order by anyone. |
| **Fallback** | A panel that will not come together renders a static chart from a committed JSON fixture of real run data. Ugly, honest, and better than a broken panel. |

---

## R6 · A judge finds a circularity flaw we missed (10)

| | |
|---|---|
| **Why it is low-likelihood** | Four independent barriers ([`Simulation.md`](./Simulation.md) §1), one of which is enforced by the DBMS. |
| **Residual exposure** | The subtle one: M8's training labels are the simulator's profile IDs, which are latent. |
| **Response** | **Disclose it before being asked.** It is already written into [`Data.md`](./Data.md) §2.3 and M8's model card, M8 is designated *bonus* precisely so the six required models are clean, and ablating M8 costs only 2–5%. If challenged: "You've found the one place we used a latent label. That's why it's a bonus component, why it only sets a prior, and why removing it costs us three percent." |
| **Principle** | Every disclosed limitation makes the undisclosed ones less likely in a judge's mind. Every discovered one does the opposite. |

---

## R7 · Neon unavailable or slow during the demo (12)

| | |
|---|---|
| **Trigger** | Any network dependency at demo time. |
| **Response** | Already mitigated: the demo runs from a local Postgres restored from `snapshots/demo.dump`, with wifi off ([`Design_Decisions.md`](./Design_Decisions.md) ADR-015). |
| **Verification** | Hour 44: run the entire demo with wifi physically disabled. This is a gate, not a suggestion. |
| **Second fallback** | Static JSON fixtures. **Third:** the recorded video. |

---

## R8 · Scope creep (12)

| | |
|---|---|
| **Trigger** | Anyone proposes a second topic, more items, an authoring UI, user accounts, or a thirteenth panel. |
| **Response** | Point at [`Contract.md`](./Contract.md) §1. It is ratified; the conversation is over in ten seconds. |
| **Why this works** | The contract exists so that at Hour 30, exhausted, nobody has to win an argument on the merits. The decision was already made by people who had slept. |
| **The one legitimate exception** | A change that removes scope. Those are always in order. |

---

## R9 · M3 underperforms (12)

M3 is the highest-value component; its ablation is expected to be the largest bar.

| | |
|---|---|
| **Trigger** | Held-out macro-F1 below 0.60 at Hour 14. |
| **Likely causes** | (a) Too few items detect each misconception — I3 requires ≥ 3; (b) distractors are ambiguous across misconceptions; (c) the Bayesian accumulator's evidence weight is mis-set; (d) the guessing profile (P3) is poisoning the training labels. |
| **Response** | Author 2–3 extra items targeting the weakest misconceptions (a 30-minute fix that pays for itself), tighten distractor uniqueness, and tune `w_evidence` on the pretraining cohort. If it still fails, report the per-class F1 honestly — M8's low score is already expected and disclosed. |
| **Do not** | Simplify the taxonomy to make the metric look better. Eight misconceptions with one weak class is a more honest result than five easy ones. |

---

## R10 · Late integration failure (10)

| | |
|---|---|
| **Trigger** | The first end-to-end run happens after Hour 26. |
| **Prevention** | A walking skeleton by Hour 20: a session that starts, takes one hard-coded action, persists a decision, and renders one panel. It does not need to be *good*; it needs to *connect*. |
| **Response** | Freeze all feature work. Everyone on integration until a full session runs. |
| **Structural mitigation** | `AgentController` is used by both the live path and the harness ([`Design_Decisions.md`](./Design_Decisions.md) ADR-014), so the harness exercises the integration continuously from Hour 26. |

---

## R11 · Exhaustion causes a bad Hour-30 decision (12)

Hours 30–34 hold the freeze, the headline run, and the ablations — the highest-stakes block in the
project, arriving exactly when the team is most tired.

| | |
|---|---|
| **Prevention** | Rotate sleep: two people rest Hours 20–24, two Hours 24–28, so the freeze is made by rested people. |
| **Rule** | No irreversible decision is made by a single person after Hour 28. The freeze, the headline run, and any cut require two people agreeing. |
| **Response** | If the whole team is exhausted at Hour 30: **freeze anyway and sleep**. The headline run takes 12 minutes; starting it at Hour 32 breaks nothing downstream. Freezing late costs an hour. Freezing badly costs the project. |

---

## R12 · Demo machine fails (5)

| | |
|---|---|
| **Response** | A USB stick carries the repo, `snapshots/demo.dump`, and the fallback video. Any teammate's laptop with Docker and Node can be running in about ten minutes. |
| **Prevention** | Two machines are set up and verified by Hour 45, not one. |

---

## R13 · Someone tunes on the evaluation cohort (10)

| | |
|---|---|
| **Why it matters** | It silently destroys the only credible number in the project, and nobody would ever know. |
| **Prevention** | Seed ranges are enforced in code — the cohort generator raises if a seed is used for the wrong purpose. `configs/headline.yaml` is frozen at Hour 30. |
| **Cultural rule** | Nobody looks at evaluation-cohort results before Hour 30. If someone does by accident, say so — the fix is a fresh seed range (9500–9999 is held in reserve), and it costs twelve minutes. Hiding it costs everything. |

---

## R14 · Presentation runs over (9)

| | |
|---|---|
| **Prevention** | Two timed rehearsals ([`Execution_Plan.md`](./Execution_Plan.md) Phase 5). The script has explicit timestamps. |
| **Response** | The 3-minute compression is pre-decided in [`Demo_Script.md`](./Demo_Script.md) §2: opening, hero moment, evidence. Everything else is cuttable. |
| **Rule** | Never sacrifice the calibration close to fit more features in. It is the most valuable thirty seconds in the presentation. |

---

## Weekly-equivalent review points

| Hour | Review |
|---|---|
| 6 | R1 status. Content gate. |
| 12 | R3 status. V2 gate. |
| 18 | R9 status. Model metrics gate. |
| 26 | R2, R4, R10 status. Pilot results and latency benchmark. |
| 30 | R11, R13. The freeze decision, made by two people. |
| 40 | R5. Dashboard triage. |
| 44 | R7, R12. Offline verification with wifi off. |
