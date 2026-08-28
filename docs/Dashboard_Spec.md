# Dashboard Specification

Twelve panels: the **seven required by PS 6**, plus five that exist to win the argument. Every panel
obeys [`Contract.md`](./Contract.md) §8 — every AI-derived number is traceable, nothing is computed in
the browser, and every panel has a loading and an empty state.

**Scoring context:** *Dashboard, explainability, and UX* is 15% of the rubric, and it is also the
surface through which the other 85% is judged. A correct system with an illegible dashboard scores
like a broken one.

---

## 0. Layout

Three routes, one navigation bar.

```
/play        Story Player + compact live panels        (Learner, F1)
/session/:id Full analytics for one session            (Judge, F2/F3)
/lab         Experiments, baselines, ablations, models (Researcher/Judge, F4)
```

`/session/:id` grid at 1440px:

```
┌────────────────────────────────┬──────────────────────────┐
│ P1  Mastery Graph (concept DAG)│ P12 Agent Console        │
│                                │      (live decision trace)│
├────────────────┬───────────────┤                          │
│ P2 Misconcep-  │ P5 Difficulty │                          │
│    tion Map    │    Progression│                          │
├────────────────┴───────────────┼──────────────────────────┤
│ P3  Learning Trajectory (full width timeline)             │
├────────────────┬───────────────┬──────────────────────────┤
│ P4 Interven-   │ P6 Predicted  │ P7 Before / After        │
│    tions       │    Final      │                          │
└────────────────┴───────────────┴──────────────────────────┘
```

Below 1024px the grid becomes a single column in the same order. The Agent Console collapses to a
bottom sheet.

**Design language:** dark instrument-panel palette (it is a space station), one accent colour for
mastery, one for risk, one for the agent's own actions. Numbers in a tabular-figure font so columns
align. No decorative gradients — this must read as an instrument, not a marketing page.

---

## P1 · Mastery Graph — *required*

**Question:** what does this learner know, and how sure are we?

| | |
|---|---|
| **Source** | `GET /sessions/{id}/state` · M1, M2 |
| **Render** | React Flow DAG: 10 nodes positioned by `dag_depth` (x) and `display_order` (y); 15 edges labelled with `tau`. Plus a companion line chart: mastery per concept over steps. |
| **Encoding** | Node **fill** = mastery mean (sequential ramp). Node **ring thickness** = variance (thick = uncertain). Node **red halo** = a confirmed misconception is blocking this concept. Edge **opacity** = `tau`. Edge **amber** = unmet prerequisite. |
| **Interaction** | Hover a node: mean, variance, evidence count, last seen, status. Hover an edge: `"C3 (0.31) is a prerequisite of C4, tau = 0.65."` Click a node: filter the trajectory to steps touching that concept. |
| **Empty state** | All nodes at 0.5 with maximum ring thickness, captioned *"No evidence yet — priors only."* |

**Why the uncertainty ring matters.** Most adaptive-learning dashboards show a single mastery number
and imply false precision. Showing variance makes the exploration behaviour in F5 legible: the agent
is chasing the thick rings.

---

## P2 · Misconception Map — *required*

**Question:** which faulty rule does this learner hold, and did we fix it?

| | |
|---|---|
| **Source** | `GET /sessions/{id}/state` + `/misconceptions` · M3 |
| **Render** | 8 horizontal belief bands (one per misconception) across the session steps. Band height/intensity = posterior. |
| **Markers** | Dashed line at the 0.65 confirmation threshold. `EXPLAIN` actions as vertical markers. A resolution tick where the belief falls back under 0.35 after remediation. |
| **Interaction** | Click a band: evidence drawer listing the exact responses that raised it (item, chosen option, step) plus a plain-language description of the faulty rule. |
| **Empty state** | Eight flat bands at the prior, captioned *"No systematic error patterns detected."* |

**The shape to look for:** a belief that climbs, gets an `EXPLAIN` marker, then falls and stays down —
followed by a *correct* response on an item that would previously have caught it. Detect → remediate →
**verify**. Point at this in the demo.

---

## P3 · Learning Trajectory — *required*

**Question:** what happened, in order?

| | |
|---|---|
| **Source** | `GET /sessions/{id}/trace` (`v_session_trajectory`) |
| **Render** | Horizontal timeline, one segment per step. Segment **colour** = action family. **Icon** = correct / incorrect / non-assessment. **Width** = energy cost. An overlaid line = weighted mastery, with an LCB band. |
| **Markers** | Trigger flags (T1–T5) with labels. Phase shading: pretest, learning, posttest. |
| **Interaction** | Click a step → opens P4's decision detail (F2). Keyboard arrows step through. |
| **Empty state** | Skeleton timeline, *"Session has not started."* |

Cost-as-width is a small choice that pays off: the budget story becomes visible without a second
chart, and a `TEACH` (12) next to a `HINT` (3) shows the trade-off at a glance.

---

## P4 · Chosen Interventions — *required*

**Question:** what did the agent do, and why did it do that instead of something else?

**This is the highest-value panel in the project.** It is where the "agent architecture and decision
logic" score (20%) and the "explainability" score (15%) are actually earned.

| | |
|---|---|
| **Source** | `GET /sessions/{id}/decisions/{step}` |
| **Render** | Two halves. **Left:** action-mix donut for the session, 9 segments. **Right:** decision detail for the selected step, in the three tiers of [`User_Flow.md`](./User_Flow.md) F2. |
| **Tier 1** | Headline sentence, selected action chip, cost, utility. |
| **Tier 2** | The `because` bullets, the trigger badge, and a **counterfactual toggle** showing the runner-up's projected outcome. |
| **Tier 3** | Full candidate table: `rank · action · gain(model) · gain(rollout) · explore · risk · cost · rank_score · utility · selected`. Sortable. Every header has a tooltip naming the model behind it. |
| **Chips** | "Models consulted": M1@1.2.0 … each links to P11. |
| **Empty state** | *"Select a step on the trajectory."* |

---

## P5 · Difficulty Progression — *required*

**Question:** is the agent keeping the learner in the productive zone?

| | |
|---|---|
| **Source** | `v_session_trajectory` · M4 |
| **Render** | Two series over steps: item difficulty `b` (points, coloured by correct/incorrect) and learner ability `theta` (line with a standard-error band). |
| **Shading** | The band `theta ± 0.8` shaded as the *productive zone*. |
| **Annotation** | `EASIER` / `HARDER` actions marked on the x-axis. |
| **Caption** | *"Items land in the productive zone in X% of assessments (baseline B0: Y%)."* |

That caption is a genuine, quantified claim about adaptivity that a fixed sequence cannot match, and
it takes one SQL aggregate to compute. Do not skip it.

---

## P6 · Predicted Final Mastery — *required*

**Question:** where will this learner end up on the remaining budget?

| | |
|---|---|
| **Source** | `GET /sessions/{id}/projection` · M2, M5, Planner |
| **Render** | Weighted mastery over steps: solid line for observed, dashed for projected, with a confidence band from 64 forward samples. A budget axis runs along the bottom. |
| **Comparison** | A faint second dashed line: projected outcome under B0 from the same state. The gap *is* the value proposition. |
| **Empty state** | *"Projection available after 3 responses."* |

---

## P7 · Before / After Outcome — *required*

**Question:** did the learner actually improve?

| | |
|---|---|
| **Source** | `GET /sessions/{id}/outcome` · the 6 probe items |
| **Render** | Grouped bars per concept: pre-test vs post-test, with the delta labelled. A headline stat block: weighted mastery before → after, concepts mastered, misconceptions resolved, energy spent. |
| **Note** | Probe items are held out from teaching ([`Concept_Graph.md`](./Concept_Graph.md) §4), and the panel says so on screen. Measuring improvement on items the agent trained you on would be worthless, and a judge will check. |
| **Empty state** | *"Complete the mission to see your results."* |

---

## P8 · Baseline Comparison — *bonus, and essential*

**Question:** is adaptive actually better than a fixed sequence?

| | |
|---|---|
| **Source** | `GET /experiments/{id}/results` (`v_policy_outcomes`) |
| **Render** | Horizontal bars, 5 policies, 95% CI whiskers. `N` and the seed list printed on the chart. |
| **Selector** | Metric dropdown: mastery gain per 100 energy (default) · final WM · concepts mastered · misconceptions resolved · items attempted. |
| **Secondary** | Per-profile small multiples — 7 mini charts showing where LOOM's margin is largest. |
| **Honesty** | Metrics where LOOM *loses* stay in the dropdown ([`Contract.md`](./Contract.md) C9.4). "Items attempted" is one — B2 attempts more items and gains less. That is the point, and showing it is stronger than hiding it. |

---

## P9 · Calibration — *bonus, and the credibility panel*

**Question:** how wrong is the agent's model of the learner?

| | |
|---|---|
| **Source** | `GET /experiments/{id}/calibration` — materialised into `run_metrics` by `CalibrationService` under role `loom_eval` ([`DB.md`](./DB.md) §7) |
| **Render** | Scatter of estimated vs true mastery with the identity line; a reliability curve with ECE; a residual-over-steps chart showing error shrinking as evidence accumulates. |
| **Stats** | MAE, ECE, Brier — each with its target from [`PRD.md`](./PRD.md) §8 shown beside the actual. |
| **Caption** | *"Ground truth comes from the simulator, in a database schema the application role cannot read. This panel is computed after each run by a separate evaluation role."* |

**This panel is the answer to the circularity question before it is asked.** It costs one afternoon and
it changes how a judge reads everything else on the screen.

---

## P10 · Policy Sensitivity — *bonus*

**Question:** does the agent behave differently for different learners?

| | |
|---|---|
| **Source** | `GET /experiments/{id}/action-mix` (`v_policy_action_mix`) |
| **Render** | Heatmap, 9 actions x 7 learner profiles, cells = share of decisions. |
| **Reading** | P4 Anchored → high `EXPLAIN`. P5 Cracked Foundation → high `REVISE` on low-depth concepts. P1 Sprinter → high `HARDER`, near-zero `HINT`. P6 Leaky Bucket → high `CONSOLIDATE`. P7 Fader → high `BRANCH`. |
| **Test** | A chi-square statistic printed on the panel: the distributions differ across profiles at p < 0.01. |

This panel is the direct, literal answer to the Round-3 criterion *"show how the policy changes for
different learner states."* It should be one click away at all times during the demo.

---

## P11 · Model Health — *bonus*

**Question:** what are the eight components, and are they any good?

| | |
|---|---|
| **Source** | `GET /models` |
| **Render** | Eight cards: name, family, version, required/bonus badge, training rows, and each held-out metric **beside its baseline** — never a bare number. |
| **Extras** | M6 disagreement rate with its health band (10–25%). A prominent **`llm_calls: 0`** tile with the caption *"No hosted LLM participates in reasoning, prediction, planning, or decision-making."* |
| **Interaction** | Card → confusion matrix (M3), calibration curve (M1, M2), feature importances (M5). |

---

## P12 · Agent Console — *bonus, and the one that sells it*

**Question:** what is the agent thinking, right now?

| | |
|---|---|
| **Source** | `WS /ws/sessions/{id}` |
| **Render** | A terminal-style scrolling trace. Each decision arrives in **four separate frames** so the loop is visible as it happens: |

```
 step 08  ── OBSERVE ───────────────────────────────────────
          IT-C7-02 · chose B · incorrect · 14.2s · 1 hint
          C7 mastery 0.44 -> 0.31    P(M3) 0.52 -> 0.71

 step 08  ── TRIGGER ───────────────────────────────────────
          T1 misconception confirmed: partial distribution

 step 08  ── GENERATE ──────────────────────────────────────
          9 candidates: EXPLAIN(M3) HARDER(C7) EASIER(C7)
          REVISE(C6) ASSESS(IT-C7-03) HINT(2) BRANCH(visual)
          CONSOLIDATE(C4) TEACH(C8)

 step 08  ── SCORE ─────────────────────────────────────────
          EXPLAIN(M3)  gain 0.083  cost 9  risk 0.04  U 0.01254  <--
          HARDER(C7)   gain 0.061  cost 8  risk 0.34  U 0.00780
          REVISE(C6)   gain 0.058  cost 10 risk 0.09  U 0.00701

 step 08  ── DECIDE ────────────────────────────────────────
          EXPLAIN(M3) · 118ms · 6 models consulted
```

| | |
|---|---|
| **Controls** | Pause, filter by frame type, copy frame as JSON. |
| **Fallback** | If the socket drops, falls back to 1 s polling. The console never goes blank in front of a judge. |

**Judges read this panel first and decide from it whether the intelligence is real.** Get the visual
right: monospace, generous spacing, the `<--` marker on the selected action, and frames arriving with
a short stagger so the sequence is perceptible rather than instantaneous.

---

## Cross-panel requirements

| # | Requirement |
|---|---|
| X1 | Every AI-derived number is hoverable and names its model and inputs (C8.2). |
| X2 | Every panel has a loading skeleton and an explicit empty state (C8.5). |
| X3 | No panel computes an AI-derived value client-side (C8.3). |
| X4 | Every panel renders correctly in offline demo mode from the local snapshot (C8.4). |
| X5 | Colour is never the sole encoding — every state also has a shape, icon, or label. |
| X6 | Every chart states its `N` and, where relevant, its confidence method. |
| X7 | Panels render legibly when projected: minimum 14px body, 16px numerals, high contrast. |
| X8 | Every panel is reachable in ≤ 2 clicks from any other. |

## Build order

| Priority | Panels | Hours |
|---|---|---|
| **P0 — must ship** | P1, P3, P4, P7, P12 | 34–39 |
| **P0 — required by PS** | P2, P5, P6 | 39–41 |
| **P1 — wins the argument** | P8, P9 | 41–43 |
| **P2 — if time remains** | P10, P11 | 43–44 |

P12 (Agent Console) is built early despite being a bonus panel, because it is the fastest way to
*debug the agent* — it pays for itself twice over.
