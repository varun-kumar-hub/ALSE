# Design Decisions (ADR Log)

Append-only record of every significant choice: the context, the alternatives, the decision, and what
it cost us. A judge asking "why did you do it this way?" should get an answer that includes what we
rejected.

**Format:** Context → Options → Decision → Consequences.
**Rule:** an ADR is never edited after it is Accepted. It is superseded by a new ADR.

| # | Decision | Status |
|---|---|---|
| [ADR-001](#adr-001) | Topic: Linear Equations in One Variable | Accepted |
| [ADR-002](#adr-002) | Narrative framing over a plain quiz | Accepted |
| [ADR-003](#adr-003) | Simulated learners rather than a public dataset | Accepted |
| [ADR-004](#adr-004) | Anti-circularity by database permission, not convention | Accepted |
| [ADR-005](#adr-005) | BKT for the agent, continuous-latent IRT for the simulator | Accepted |
| [ADR-006](#adr-006) | One-step-optimal policy with depth-2 lookahead, not a POMDP solve | Accepted |
| [ADR-007](#adr-007) | Eight components, six required plus two bonus | Accepted |
| [ADR-008](#adr-008) | Energy budget as the constraint, not wall-clock time | Accepted |
| [ADR-009](#adr-009) | Persist every candidate action, not just the chosen one | Accepted |
| [ADR-010](#adr-010) | Neon Postgres over SQLite | Accepted |
| [ADR-011](#adr-011) | Local LLM for narrative flavour only, off by default | Accepted |
| [ADR-012](#adr-012) | Hand-author 28 items rather than generate 500 | Accepted |
| [ADR-013](#adr-013) | Publish calibration error on the dashboard | Accepted |
| [ADR-014](#adr-014) | Same controller for live sessions and experiments | Accepted |
| [ADR-015](#adr-015) | Demo runs offline from a committed snapshot | Accepted |
| [ADR-016](#adr-016) | Include a deliberately strong baseline (B2) | Accepted |

---

## ADR-001
### Topic: Linear Equations in One Variable

**Context.** PS 6 requires one focused academic topic. The choice determines the concept graph, the
misconception taxonomy, and how convincing the item bank can be.

**Options.**
1. **Fractions** — rich misconception literature, but the prerequisite structure is shallow and mostly
   procedural.
2. **Python loops / intro programming** — appealing to a technical audience, but grading is either
   trivial (multiple choice about code) or requires a sandbox we do not have time for.
3. **Linear equations in one variable** — genuinely hierarchical prerequisites, a well-documented
   misconception set, and exact short answers.
4. **Probability** — deep misconceptions, but the prerequisite DAG is flat and answers are hard to
   distractor-map cleanly.

**Decision.** Option 3.

**Consequences.**
- The DAG has real depth (5 levels), which makes the T3 prerequisite-gap behaviour possible. That
  behaviour is the demo's best moment, and options 1 and 4 could not have produced it.
- Distractors can be *computed* by executing a faulty rule, so the misconception mapping is exact
  rather than guessed (see ADR-012).
- Cost: the topic is unglamorous. We compensate with the narrative (ADR-002).

---

## ADR-002
### Narrative framing over a plain quiz

**Context.** The PS is named "Adaptive Story Challenge" and lists `scenario branch` as an action. A
plain quiz would leave that action meaningless.

**Options.**
1. No narrative — a clean adaptive quiz. Fastest.
2. Light theming — a skin over a quiz.
3. **A real story with 3 branch framings** where branching is a pedagogical action with a modelled
   effect.

**Decision.** Option 3: "Signal from Kepler Station", 8 beats x 3 framings.

**Consequences.**
- `BRANCH` becomes a genuine action with a modelled engagement effect, closing a hole in the PS's own
  action list.
- The budget becomes diegetic (station reserve power), so the constraint is understood without
  explanation.
- `EASIER` reads as rerouting rather than demotion — a real UX benefit
  ([`Narrative_Design.md`](./Narrative_Design.md) §4).
- Cost: ~2.5 hours of wall-clock authoring, and 24 story nodes instead of 8. Accepted, and firmly
  time-boxed.

---

## ADR-003
### Simulated learners rather than a public dataset

**Context.** ASSISTments, EdNet, and the KDD Cup datasets exist and are free.

**Options.**
1. Use a public dataset.
2. **Simulate learners.**
3. Both — pretrain on public data, evaluate on simulation.

**Decision.** Option 2, with the reasoning documented so we can defend it.

**Consequences.**
- We get **latent ground truth**, which no public dataset provides. Without it there is no calibration
  panel (ADR-013), no true-mastery outcome metric, and no honest ablation.
- Public datasets carry another curriculum's concept structure and have no per-response misconception
  labels, so we would have to author the taxonomy regardless — the dataset would buy us realism we
  cannot verify and cost us half a day of schema mapping.
- Cost: we cannot claim any real-world learning result, and we must say "simulated" on every axis.
  [`Evaluation.md`](./Evaluation.md) §8 states this as a threat to validity rather than hiding it.
- Option 3 was genuinely tempting and was rejected only on time. If we had 96 hours we would do it.

---

## ADR-004
### Anti-circularity by database permission, not convention

**Context.** The central credibility risk: grading the agent in a world we built for it
([`Simulation.md`](./Simulation.md) §1).

**Options.**
1. A code convention — "do not read simulator state from the agent". Zero cost, zero guarantee.
2. A module boundary with an AST test.
3. **A separate database schema with no `GRANT` to the application role**, plus option 2.

**Decision.** Option 3.

**Consequences.**
- The claim becomes *demonstrable in eight seconds on stage*: run a `SELECT` as `loom_app` and show
  the permission error.
- Forced a genuinely better architecture — three DB roles, a separate evaluation service, and
  materialised calibration metrics so the dashboard never needs `sim` access.
- Cost: ~1 hour of DDL, grants, and a permission test. The best-value hour in the project.
- Constraint accepted: calibration can only be computed after a run, never during
  ([`Contract.md`](./Contract.md) C4.5).

---

## ADR-005
### BKT for the agent, continuous-latent IRT for the simulator

**Context.** Given ADR-004, the two models must be structurally different, not merely differently
parameterised.

**Options.**
1. Same family, different parameters. Weak — one is a special case of the other.
2. Agent uses Deep Knowledge Tracing (an LSTM); simulator uses BKT. Maximum separation, but DKT needs
   more data and more time than we have, and it is not explainable — which would cost us on a 15%
   rubric line.
3. **Agent: discrete-state BKT with graph credit propagation. Simulator: continuous latent ability
   with a compensatory logistic response process, misconception interference, and Ebbinghaus
   forgetting.**

**Decision.** Option 3.

**Consequences.**
- Genuinely different families. Neither is a special case of the other: BKT cannot represent the
  simulator's misconception-interference term at all, and the simulator has no discrete "mastered"
  state.
- BKT's per-concept parameters are directly inspectable, which feeds explainability.
- Cost: the agent systematically mis-estimates forgetting for the P6 Leaky Bucket profile, because it
  fits one `lambda` per concept while the simulator draws one per learner. We **show** this on the
  calibration panel rather than fixing it — it is honest and it is interesting.

---

## ADR-006
### One-step-optimal policy with depth-2 lookahead, not a POMDP solve

**Context.** The problem is formally a budget-constrained POMDP. Solving it properly is out of reach
in 48 hours, and probably unnecessary.

**Options.**
1. Myopic argmax on predicted gain. Simple, and it is baseline B3.
2. **Utility with depth-2 Monte Carlo lookahead, exploration bonus, and risk penalty.**
3. POMCP / online tree search. Correct, and far too slow for a 150 ms budget.
4. Learn a policy with RL. No time to train, and would need vastly more simulated data.

**Decision.** Option 2, stated openly as an engineering choice rather than dressed up as optimality.

**Consequences.**
- Fits the latency budget: 12 candidates x 32 samples x depth 2 in ~80 ms.
- Option 1 becomes a free ablation (set `delta = 0`), which is how we measure what the planner is
  worth.
- Cost: the policy is not optimal, and we say so. Claiming optimality would be false and a judge who
  knows POMDPs would catch it immediately — which would cost far more than the honest framing.

---

## ADR-007
### Eight components, six required plus two bonus

**Context.** The PS requires at least five meaningful components, four independently evaluable. It
lists six.

**Options.**
1. Exactly five — minimum risk, minimum credit.
2. **The six listed, plus two bonus components with a pre-agreed cut line.**
3. Ten or more. Overreach; each component still needs a metric and an ablation.

**Decision.** Option 2. M7 (engagement) and M8 (archetype) are bonus, and sit at positions 5 and 4 on
the cut line ([`Contract.md`](./Contract.md) §11).

**Consequences.**
- Every one of the eight has a held-out metric and an ablation row, so none is decoration.
- M7 and M8 are the two that address *learner state beyond knowledge*, which is where most adaptive
  systems are thinnest — good differentiation for the cost.
- M8 is the only component with a latent-derived training label, so making it **bonus** keeps all six
  required components entirely clean of that caveat ([`Data.md`](./Data.md) §2.3). That was the
  deciding factor in which components were designated bonus.
- Cost: two extra models to train, evaluate, and cut cleanly if late.

---

## ADR-008
### Energy budget as the constraint, not wall-clock time

**Context.** The PS requires "a limited learning budget". It does not say what the budget measures.

**Options.**
1. Wall-clock time.
2. Interaction count only.
3. **An abstract energy budget with per-action costs, plus a secondary interaction cap.**

**Decision.** Option 3: 100 energy, 25 interactions, costs in
[`Agent_Policy.md`](./Agent_Policy.md) §2.

**Consequences.**
- Different actions can cost different amounts, which is what makes the trade-off interesting.
  `TEACH` (12) versus `HINT` (3) is a real decision; under option 2 they are identical.
- The budget is reproducible — wall clock is not, which would have broken C7.1.
- It is diegetic (station reserve power), so it needs no explanation on stage.
- Cost: the costs are authored, not derived. Declared as an assumption and never tuned
  ([`Agent_Policy.md`](./Agent_Policy.md) §9), so we cannot be accused of fitting them to the result.

---

## ADR-009
### Persist every candidate action, not just the chosen one

**Context.** Explainability is 15% of the rubric, and "why not something else?" is the question that
separates a real agent from a dressed-up heuristic.

**Options.**
1. Log the chosen action only.
2. Log the top 3.
3. **Persist the entire scored candidate set, every step, in a dedicated table.**

**Decision.** Option 3 — `app.actions_considered`, with a DDL `CHECK (candidates_count >= 3)`.

**Consequences.**
- The counterfactual view (F2 Tier 3) becomes a simple query rather than a re-run.
- The Policy Sensitivity panel (P10) and the M6 disagreement diagnostic both come for free from this
  table.
- Storage: ~8 rows per decision, ~3.6M rows in the headline experiment. Handled by the 5% detail
  sampling in [`DB.md`](./DB.md) §11.
- This single decision is responsible for more of the explainability score than any UI work.

---

## ADR-010
### Neon Postgres over SQLite

**Context.** The suggested stack allows either.

**Options.**
1. SQLite — zero setup, single file.
2. **Neon serverless Postgres.**
3. Self-hosted Postgres in Docker.

**Decision.** Neon, with a local Docker Postgres restored from a snapshot for the demo (ADR-015).

**Consequences.**
- **Schemas, roles, and `GRANT` make ADR-004 possible.** SQLite has no permission model, so the
  anti-circularity guarantee would have been a convention again. This alone decided it.
- Neon branching lets each team member work on an isolated copy of the database at no cost.
- Window functions make the CI aggregation views trivial.
- Cost: cold-start latency and a connection-pooling configuration. Both handled in
  [`DB.md`](./DB.md) §8, and neither affects the demo because of ADR-015.

---

## ADR-011
### Local LLM for narrative flavour only, off by default

**Context.** The AI-API policy forbids a hosted LLM as the primary reasoning engine. The safest move
is to use none at all; the suggested stack mentions an optional local Hugging Face model.

**Options.**
1. No LLM anywhere. Simplest and safest.
2. **A local model that rewords pre-authored narrative text, behind a flag that is off by default.**
3. A hosted LLM for hints or explanations. Risky — it edges toward the primary path.

**Decision.** Option 2, constrained by [`Contract.md`](./Contract.md) C3.2–C3.4 and logged to
`app.llm_calls`.

**Consequences.**
- Demonstrates that we understood exactly where the line is, and then stayed well behind it. That is
  a stronger signal than never approaching it.
- The empty `llm_calls` table becomes a *positive claim* on panel P11 rather than an absence.
- The flag is off during the demo, so nothing can go wrong live.
- Cost: ~1 hour, plus a compliance test. It is second on the cut line.

---

## ADR-012
### Hand-author 28 items rather than generate 500

**Context.** More items means better IRT and more variety. Generating them with an LLM would be fast.

**Options.**
1. Generate ~500 items with an LLM.
2. **Hand-author 28 items with computed distractors.**
3. Generate, then hand-verify. Verification is the slow part, so this converges to option 2 at higher
   cost.

**Decision.** Option 2.

**Consequences.**
- **Every distractor is the computed output of a specific faulty rule** — for `3(x+4)=27`, applying M3
  gives exactly `x = 7.67`. The misconception mapping is therefore exact, not plausible. M3's entire
  training signal depends on this, and a generated distractor that merely *looks* wrong would silently
  destroy it.
- 28 items is enough for stable 2PL estimation given 85k pretraining responses.
- Cost: ~2 hours of authoring, and a thin item bank for M8 detection (3 items), which we disclose in
  its model card.
- This is a case where the slower path is also the better one, and it is worth saying so out loud
  when a judge asks why we did not use an LLM to scale the content.

---

## ADR-013
### Publish calibration error on the dashboard

**Context.** We could show only favourable metrics.

**Options.**
1. Show outcomes only.
2. **Show estimated-vs-true mastery with MAE, ECE, and Brier as a first-class panel.**

**Decision.** Option 2. Panel P9 is a required panel, not a stretch goal
([`Contract.md`](./Contract.md) C4.6).

**Consequences.**
- Pre-empts the circularity question by answering it before it is asked.
- Volunteering your own error bars changes how a judge reads every other number on the screen.
- Cost: it visibly shows our estimator is imperfect — MAE around 0.10–0.12. That is the point. A
  system claiming perfect knowledge of a hidden state is claiming something impossible.

---

## ADR-014
### Same controller for live sessions and experiments

**Context.** It would be faster to write a lightweight simulation script separate from the API path.

**Options.**
1. Separate implementations. Faster to write, and a guaranteed source of divergence.
2. **One `AgentController`, driven either by a human over HTTP or by the simulator in-process.**

**Decision.** Option 2 ([`Architecture.md`](./Architecture.md) A2).

**Consequences.**
- The number we show a judge is produced by exactly the code that runs the live demo. If asked "is the
  demo running the same agent as the experiment?", the answer is one word.
- Forced the domain core to be pure and I/O-free, which made everything else testable.
- Cost: the state engine had to be serialisable and clock-injected up front. Worth it by Hour 30.

---

## ADR-015
### Demo runs offline from a committed snapshot

**Context.** Venue internet is unreliable, and Neon has a cold start.

**Options.**
1. Demo live against Neon. Fastest to set up, and one bad wifi moment from disaster.
2. **`pg_dump` the frozen results into `snapshots/demo.dump`, restore into local Docker Postgres,
   demo from there.**
3. Static JSON fixtures with no database. Loses the ability to drill down live.

**Decision.** Option 2, with option 3 as a further fallback and a recorded video as the last resort.

**Consequences.**
- Zero network dependency (NFR-6). The judge can click anything and it works.
- The snapshot is committed, so a dead laptop is a USB-stick problem rather than a project-ending one.
- Cost: the snapshot must be regenerated after any data-affecting fix. `make snapshot` is one command,
  and it is in the Hour-44 checklist.

---

## ADR-016
### Include a deliberately strong baseline (B2)

**Context.** We only *need* to beat a fixed sequence (B0) to satisfy the PS.

**Options.**
1. B0 only. Sufficient, and beatable by almost anything.
2. **B0 plus B1 (random floor), B2 (a genuine mastery-threshold heuristic), and B3 (our own
   ablation).**

**Decision.** Option 2, with B2 tuned on the pretraining cohort — the same attention LOOM's own
parameters received.

**Consequences.**
- Beating B0 alone would be beating a straw man, and an experienced judge would recognise that
  immediately. Beating a tuned B2 is a real claim.
- B3 isolates the planner from the models, which is the most technically interesting comparison we
  have.
- Cost: three extra policy implementations (~2 hours), and a smaller headline margin than we would get
  against B0 alone. We consider the smaller, credible number strictly more valuable than the larger,
  dismissible one.

---

## Adding an ADR

1. Copy the Context / Options / Decision / Consequences structure.
2. Number sequentially. Never reuse a number.
3. Add a row to the index table.
4. If it changes a rule in [`Contract.md`](./Contract.md), record an amendment there too (§12).
5. Never edit an Accepted ADR. Write a new one that supersedes it.
