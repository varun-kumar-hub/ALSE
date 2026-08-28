# User Flows

Eight flows. F1 and F2 are the ones we optimise for — the Learner and the Judge
([`PRD.md`](./PRD.md) §4).

| ID | Flow | Actor | Criticality |
|---|---|---|---|
| F1 | Story session — the core learning loop | Learner | **P0** |
| F2 | Decision inspection — "why did it do that?" | Judge | **P0** |
| F3 | Diagnostic review — misconceptions and item quality | Educator, Curriculum Designer | P1 |
| F4 | Cohort experiment — baselines and ablations | Researcher, Judge | **P0** |
| F5 | Cold start — a brand-new learner | Learner | P1 |
| F6 | Disruption and re-plan | Learner (agent-driven) | **P0** |
| F7 | Session resume | Learner | P2 |
| F8 | Demo mode — scripted showcase | Presenter | **P0** |

---

## F1 · Story session (the core loop)

**Actor:** Learner · **Entry:** open the app, press *Begin Mission* · **Exit:** budget exhausted,
interactions exhausted, or weighted mastery > 0.90.

### Sequence

```
1. START
   → POST /api/v1/sessions {actor_kind: "human", policy: "LOOM"}
   → Server: create session, budget 100 energy / 25 interactions,
             LearnerState with uniform priors, story node beat_01
   → Client: render the opening narrative beat + objective + budget meter

2. PRE-TEST  (6 probe items, fixed order, no hints, no feedback)
   → Framed in-story as the "station diagnostic sweep"
   → FREE: charges neither energy nor interactions (Contract C6.7)
   → FIXED: never agent-chosen. The agent's first real decision comes after it
   → Establishes the "before" half of the before/after panel
   → Agent observes these responses and forms its initial state — probe items are
     held out from TEACHING, never from EVIDENCE (Contract C1.10)
   → On completion, M8 infers the archetype posterior and reweights M1's priors
   → Runs identically for every policy, baselines included (Contract C1.9)

3. LOOP  (repeats until exit)
   a. Agent decides           -> Decision{action, rationale, candidates}
   b. NarrativeService wraps  -> Beat{narrative, payload}
   c. Client renders by action type:
        ASSESS/EASIER/HARDER -> challenge card with 4 options
        TEACH/REVISE         -> explanation panel, "Continue"
        HINT                 -> hint slides into the open challenge
        EXPLAIN              -> contrast-case card naming the misconception
        BRANCH               -> scene transition, framing changes
        CONSOLIDATE          -> quick retrieval challenge on an old concept
   d. Learner responds        -> POST /sessions/{id}/respond
   e. StateEngine updates, budget decremented
   f. Client: immediate correctness feedback + story consequence
              + mastery ring animates + budget meter ticks down
   g. WS pushes the agent trace frame to the Agent Console
   -> back to (a)

4. POST-TEST  (the same 6 probe items, same order)
   → Framed in-story as the "final systems check"
   → Also free of budget, for the same reason

5. SUMMARY
   → Before/after panel, concepts improved, misconceptions resolved,
     energy spent, plain-language summary of what the agent focused on and why
```

### What the learner sees at every moment

| Element | Always visible | Purpose |
|---|---|---|
| Story panel | Yes | The narrative and the current objective |
| Budget meter | Yes | Energy remaining, cost of the pending action (US-L6) |
| Mastery ring | Yes | Compact 10-segment ring, one arc per concept |
| Hint button | When an item is open | Shows its cost before it is spent |
| Agent Console | Toggle (default off for learners, **on** for judges) | The live decision trace |

### Edge cases

| Case | Handling |
|---|---|
| Learner submits with no option selected | Client-side block; no server call. |
| Learner idles > 5 minutes | Session stays alive; response time is capped at the 99th percentile so one long pause does not poison M7. |
| Budget exhausts mid-item | The open item is always allowed to complete. Budget can go to exactly 0, never negative (DB `CHECK`). |
| Mastery target reached early | Session ends early and *reports the unspent budget* — an efficiency win, and the panel says so. |
| Agent generates < 3 candidates | `InsufficientCandidatesError` → error boundary → "Mission systems recalibrating" + retry with relaxed legality. Logged as a defect. |
| Backend unreachable | Client shows an offline banner and retries with backoff; state is server-side so nothing is lost. |

---

## F2 · Decision inspection ("why did it do that?")

**Actor:** Judge · **Entry:** click any step on the trajectory panel, or any frame in the Agent
Console. **This is the flow that wins the explainability score.**

```
1. Judge clicks step 7 on the trajectory timeline
2. GET /api/v1/sessions/{id}/decisions/7
3. Panel opens in three tiers:

   TIER 1 — the headline (always visible)
     "Remediating partial distribution before advancing."
     Selected: EXPLAIN(M3) · cost 9 · utility 0.0125

   TIER 2 — the reasoning (one click)
     • P(M3) rose to 0.71 after two distractor matches on IT-C7-02, IT-C7-03
     • Trigger T1 fired: misconception confirmed
     • Predicted gain 0.083 at cost 9
     • Runner-up HARDER(C7) scored 0.0078 — gain 0.061 but risk 0.34,
       because P(correct) is only 0.21 while M3 is active
     [ Show counterfactual ]  ->  projected WM after 2 steps: 0.512 vs 0.547

   TIER 3 — the full candidate table (one more click)
     9 rows: action | gain_model | gain_rollout | explore | risk | cost | rank_score | utility | ✓
     Sortable. Selected row highlighted. Every column has a tooltip naming its model.

4. "Models consulted" chips: M1@1.2.0 M2@1.1.0 M3@1.3.0 M4@1.0.1 M5@1.2.0 M6@1.0.0
   Each chip links to that model's card on the Model Health panel.
```

**Design rule:** the judge must reach Tier 3 in **two clicks from anywhere**. Depth of information,
shallowness of navigation.

---

## F3 · Diagnostic review

**Actor:** Educator (S3), Curriculum Designer (S4)

```
A. Misconception review
   1. Open Misconception Map
   2. See all 8 beliefs as bands over the session steps
   3. Click M3 -> evidence drawer:
        - the specific responses that raised the belief (item, chosen option, timestamp)
        - the step where EXPLAIN(M3) was issued
        - the belief trajectory afterwards -> resolved / persisting
   4. Plain-language summary: "Applied the multiplier to only the first term
      inside brackets. Seen on 2 of 3 distributive items."

B. Prerequisite-gap review
   1. Open Mastery Graph
   2. Failing concepts are ringed red; unmet upstream prerequisites are ringed amber
   3. Hover an edge -> "C3 (0.31) is a prerequisite of C4 (failing), tau = 0.65"

C. Item quality review  (Curriculum Designer)
   1. Open Item Diagnostics
   2. Table of 28 items: authored b | estimated b | discrimination a | infit MSQ |
      n responses | which misconceptions it actually caught | flagged?
   3. Misfitting items are flagged, with the M3 overlap shown beside them
      (see Model_Cards M4 failure modes — the overlap is the interesting part)
```

---

## F4 · Cohort experiment

**Actor:** Researcher, and the Judge during the evidence half of the demo.

```
1. Open the Experiments view
2. Either launch a new run or open the committed headline experiment
     POST /api/v1/sim/cohort
       {n_learners: 900, seeds: [9001..9005],
        policies: ["LOOM","B0","B1","B2","B3"],
        profile_mix: "stratified"}
     -> {experiment_id, status: "running"}
3. Progress streams over WebSocket (runs completed / total, ETA)
4. On completion, four views:

   4a. BASELINE COMPARISON
       Bar chart, 5 policies x primary metric, 95% CI whiskers, N printed on the chart.
       Metric selector: mastery gain per 100 energy | final WM | concepts mastered |
                        misconceptions resolved | items attempted

   4b. PER-PROFILE BREAKDOWN
       The same comparison split across the 7 learner profiles.
       This is where the story gets interesting: LOOM's margin over B2 is largest
       on P4 (Anchored) and P5 (Cracked Foundation), and smallest on P1 (Sprinter) —
       exactly as it should be, because a strong learner needs less help.

   4c. ABLATION TABLE
       One row per component removed, delta on the headline metric with CI.

   4d. POLICY SENSITIVITY
       Heatmap: action mix (9 actions) x learner profile (7).
       Directly answers the Round 3 criterion "show how the policy changes
       for different learner states".

5. Any cell drills through to the individual runs behind it, and any run
   opens as a replayable session (F8).
```

---

## F5 · Cold start

**Actor:** a learner with no history. The first three responses are the hardest decisions the agent
makes, and this flow exists to make that visible.

```
1. Session begins with uniform priors: every concept mastery 0.5, variance high
2. PRE-TEST runs first: 6 probe items, fixed, free of budget.
   The agent makes no decisions here - it only observes.
3. On pre-test completion, M8 produces an archetype posterior from all 6 responses, e.g.
      P5 Cracked Foundation 0.41 | P4 Anchored 0.22 | P2 Deliberator 0.14 | ...
   -> M1's priors are re-weighted as a posterior-weighted blend (not a hard label)
   -> Console: "Archetype posterior updated. C3/C4 priors lowered."
4. Learning loop steps 1-3: the exploration term (beta) still dominates, because
   variance on untested concepts remains high. The agent spends energy on
   INFORMATION, not instruction. The Agent Console labels this phase "Diagnostic".
5. From roughly step 4 the exploration term recedes and instruction begins.
```

**Why show this to a judge:** the visible switch from diagnosis to instruction is the clearest
possible evidence that the agent is reasoning about uncertainty rather than following a script.

---

## F6 · Disruption and re-plan

**Actor:** agent-driven, learner-visible. Five triggers, five distinct visible behaviours.

```
T1 MISCONCEPTION CONFIRMED
   P(M3) crosses 0.65
   -> banner: "Diagnostic: partial distribution detected"
   -> EXPLAIN(M3) gains +0.25 utility for 2 steps
   -> agent almost always switches to remediation
   -> after remediation, the next ASSESS on C7 VERIFIES the fix; the belief drops visibly

T2 PLATEAU
   WM moves < 0.02 over 4 steps
   -> exploration doubles for 3 steps
   -> agent probes concepts it has been ignoring
   -> console: "Plateau detected. Increasing diagnostic weight."

T3 PREREQUISITE GAP        <- the most demo-worthy behaviour in the system
   C8 fails twice while C3 sits at 0.31
   -> action space restricted to ancestors of C8 for 2 steps
   -> agent issues REVISE(C3), then ASSESS on a C3 item
   -> on the mastery graph the focus marker visibly TRAVELS BACKWARDS down the DAG
   -> console: "C8 blocked by prerequisite C3 (0.31). Reverting to foundations."

T4 BUDGET CRITICAL
   energy < 20
   -> alpha rises to 1.2, beta falls to 0.05
   -> agent stops exploring, consolidates its best concepts
   -> budget meter turns amber; console: "Budget critical. Consolidating."

T5 DISENGAGEMENT
   M7 reports gaming_prob 0.68
   -> BRANCH and EASIER gain +0.20; HINT is penalised
   -> agent switches story branch; framing changes from abstract to applied
   -> console: "Engagement dropping. Switching narrative branch."
```

Every trigger writes `app.decisions.trigger_fired` and renders as a labelled marker on the trajectory
timeline, so a judge can find all five in one glance at a completed session.

---

## F7 · Session resume

```
1. Learner returns; client holds session_id in localStorage
2. GET /api/v1/sessions/{id} -> status, step, budget, current beat
3. If active: restore from the latest state snapshot, resume at the current beat
4. If completed: go straight to the summary
5. Elapsed real time is NOT charged against the budget (budget is energy, not wall clock),
   but concept decay IS applied in step units, not minutes, so a resumed session
   behaves identically to an uninterrupted one. Reproducibility (C7.1) depends on this.
```

---

## F8 · Demo mode

**Actor:** presenter. Built for one purpose: nothing on stage is live-random
([`Contract.md`](./Contract.md) C7.2).

```
1. Demo mode loads a committed showcase set of 40 sessions from the snapshot
2. Four pinned sessions, one per demo beat:

   SHOWCASE-A  P5 Cracked Foundation, LOOM
               -> the T3 backwards-walk. The hero moment.
   SHOWCASE-B  P4 Anchored (M3 at 0.85), LOOM
               -> detect, remediate, verify. The misconception story.
   SHOWCASE-C  P5 Cracked Foundation, B0 fixed sequence, SAME learner seed as A
               -> the side-by-side that makes the baseline argument visceral
   SHOWCASE-D  P7 Fader, LOOM
               -> T5 disengagement and the branch switch

3. Replay controls: step forward, step back, jump to trigger, pause.
   Replay reads persisted snapshots; it does not re-run the agent,
   so it is instant and cannot fail live.
4. A/B split view: SHOWCASE-A and SHOWCASE-C side by side, same seed,
   two policies, both trajectories advancing together.
5. Offline: reads only the local Postgres snapshot. No network. (NFR-6)
```

**SHOWCASE-A versus SHOWCASE-C is the single most persuasive artefact in the project.** Same learner,
same items, same budget — one policy walks backwards to fix the foundation and ends at 0.71 weighted
mastery, the other marches forward through material the learner cannot access and ends at 0.44. It
needs no explanation.

---

## Flow-to-requirement coverage

| Flow | PS requirements exercised |
|---|---|
| F1 | Learner state after every response · action selection from all 9 families · budget · expected-gain prediction · observe-and-replan · correctness/time/error tracking · before-after outcome |
| F2 | Explainability · candidate actions · agent architecture and decision logic |
| F3 | Misconception map · difficulty estimation · concept graph |
| F4 | Simulated learner profiles · baseline comparison · measured improvement · policy variation by learner state |
| F5 | Knowledge-state estimation under uncertainty · cold-start priors |
| F6 | Re-planning loop for changing conditions |
| F7 | State persistence |
| F8 | Demo quality · reproducibility |
