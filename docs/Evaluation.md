# Evaluation — Baselines, Metrics, and the Headline Claim

*Measured outcome improvement* is 15% of the rubric, and it is the section most teams fake. This
document is the protocol that makes our number real: pre-registered metrics, disjoint seeds, four
baselines, confidence intervals, and a stated commitment to report losses.

---

## 1. Pre-registration

These are declared **before** the evaluation cohort is run (Hour 30). They do not change afterwards.

| | |
|---|---|
| **Primary metric** | True weighted mastery gain per 100 energy units |
| **Primary comparison** | LOOM vs **B0** (fixed linear sequence) — the PS-mandated baseline |
| **Secondary comparison** | LOOM vs **B2** (mastery-threshold heuristic) — the strong baseline |
| **Success threshold** | ≥ +30% relative improvement over B0, 95% CI excluding zero |
| **Cohort** | 900 stratified learners x 5 seeds (9001–9005) = 4,500 runs per policy |
| **Statistic** | Welch's t-test on run-level metrics; CI by normal approximation, cross-checked with a 10,000-sample bootstrap |
| **Stopping rule** | One run of the pre-registered config. No re-running until the number improves. |

**The commitment that makes it credible:** if LOOM fails to clear +30%, we report the number we got
and explain why. A truthful +18% beats a suspicious +200%, and judges who have seen a hundred demos
know the difference.

---

## 2. Metrics

### 2.1 Primary

```
mastery_gain_per_100_energy = (WM_true_final - WM_true_initial) / energy_spent * 100
```

`WM_true` comes from `sim.learner_truth_trajectory` — **ground truth, not the agent's estimate**. The
agent is graded on what the learner actually learned, not on what the agent believes it taught. That
distinction is the whole point of the `sim`/`app` separation
([`Simulation.md`](./Simulation.md) §1).

### 2.2 Secondary

| Metric | Definition | Why |
|---|---|---|
| `final_true_wm` | True weighted mastery at session end | Raw outcome, budget-blind |
| `concepts_mastered` | Count with true mastery > 0.8 | Interpretable to a non-ML judge |
| `misconceptions_resolved` | Injected misconceptions ending below 0.3 | Tests the M3 → `EXPLAIN` pipeline end to end |
| `steps_to_resolution` | Median steps from injection to resolution | Diagnostic speed |
| `productive_zone_rate` | Share of assessments with `P(correct) ∈ [0.55, 0.85]` | Adaptivity quality (P5 panel's caption) |
| `items_attempted` | Count | **A metric we expect to lose** — see §5 |
| `budget_efficiency` | `final_true_wm / energy_spent` | The administrator's metric (S6) |

### 2.3 Model quality (separate from policy quality)

Each of M1–M8 has its own held-out metric with a stated baseline, in
[`Model_Cards.md`](./Model_Cards.md) and rendered on dashboard panel P11. Model quality and policy
quality are reported separately; conflating them is a common and misleading shortcut.

### 2.4 Calibration (the honesty metrics)

| Metric | Definition | Target |
|---|---|---|
| `mastery_mae` | Mean absolute error, estimated vs true, over all concepts and steps | ≤ 0.12 |
| `mastery_ece` | Expected calibration error, 10 bins | ≤ 0.08 |
| `mastery_brier` | Brier score on next-response prediction | ≤ 0.19 |
| `misconception_precision` / `recall` | Against `sim.learner_misconceptions` | ≥ 0.75 / ≥ 0.80 |

Computed post-run by `CalibrationService` under role `loom_eval`, then materialised into
`app.run_metrics` so the dashboard can display them without holding a grant on `sim`.

---

## 3. The baselines

All five implement the same `Policy` interface and run through the same `AgentController`, state
engine, and item bank. **Only the selection rule differs.** That is what makes the comparison a
controlled experiment rather than a demonstration.

### B0 — Fixed Linear Sequence *(the PS-mandated baseline)*
Walk the topological order `C1 → C2 → C3 → C4 → C6 → C5 → C7 → C8 → C9 → C10`. For each: `TEACH`,
then one `ASSESS`. No adaptation, no hints, no remediation. Stops when the budget runs out.

### B1 — Random
Uniform over legal candidates. Establishes the floor and proves the action space is not itself doing
the work.

### B2 — Mastery Threshold *(the strong baseline)*
The Khan-Academy-style rule most real systems implement: stay on a concept until three consecutive
correct answers, then advance; on a wrong answer, offer a hint. No misconception model, no budget
reasoning, no lookahead.

**We expect B2 to be respectable, and we say so in advance.** Beating only B0 and B1 would be beating
straw men. B2 is the honest competitor.

### B3 — Greedy Myopic *(the ablation baseline)*
LOOM with `delta = 0`, `beta = 0`, `gamma = 0`, `alpha = 0`. Pure `argmax` of M5's predicted gain,
cost-blind. It isolates the value of the *planning machinery* — rollout, exploration, risk, budget —
from the value of the models.

The gap between B3 and LOOM is the most technically interesting number in the whole evaluation,
because it is the only one that measures the agent as an agent rather than as a set of models.

### B4 — LLM-only tutor *(if time allows; first on the cut line)*
A hosted LLM given the same running transcript and asked to choose the next action, with no state
engine, no models, no budget arithmetic. Generated **offline into a fixture file** and replayed —
never invoked live ([`Contract.md`](./Contract.md) C3.5).

**Why it is worth including.** The hackathon's own AI-API policy asserts that a single LLM API cannot
substitute for a real solution. B4 tests that assertion empirically instead of assuming it. Whichever
way it comes out, we have something interesting to say — and if B4 does unexpectedly well on some
metric, reporting that is far more impressive than suppressing it.

---

## 4. Protocol

```
STEP 1 · Hour 12 — validate the simulator
   Run checks V1-V4 (Simulation.md §6) on the DEVELOPMENT cohort.
   V2 is the gate: B0 must gain 0.15-0.35 weighted mastery.
   Outside that band, the item bank is mis-calibrated. FIX BEFORE PROCEEDING.

STEP 2 · Hours 8-18 — train on the PRETRAINING cohort (seeds 1000-1999)
   Train M1-M8. Fit IRT. Tune alpha, beta, gamma, kappa, delta by coarse grid.
   The evaluation cohort is NOT touched.

STEP 3 · Hour 26 — pilot on the DEVELOPMENT cohort (seeds 5000-5099)
   100 learners x 5 policies. Catch crashes and absurd results. Pin rollout_samples
   from the latency benchmark. Iterate freely here.

STEP 4 · Hour 30 — freeze
   Freeze model artefacts, policy parameters, configs/headline.yaml.
   Record every version hash.

STEP 5 · Hour 30 — run the HEADLINE experiment (seeds 9001-9005), ONCE
   900 learners x 5 policies x 5 seeds = 22,500 runs. ~12 minutes.
   Whatever comes out is what we report.

STEP 6 · Hour 32 — ablations
   11 configurations, development-sized cohort (200 learners) to keep it under 20 minutes.

STEP 7 · Hour 33 — calibration
   CalibrationService under loom_eval. Materialise into app.run_metrics.

STEP 8 · Hours 34-44 — dashboard reads the frozen results
   No re-running. Any number on screen traces to a run_id (Contract C7.4).
```

---

## 5. What we expect, including where we lose

Stating expectations in advance is what separates an experiment from a demo. Predictions made at
Hour 6:

| Comparison | Expected | Confidence |
|---|---|---|
| LOOM vs B1 (random) | +80% to +150% | Very high — if not, something is broken |
| LOOM vs B0 (fixed) | +30% to +60% | High — this is the headline |
| LOOM vs B2 (threshold) | +15% to +35% | Moderate — the real contest |
| LOOM vs B3 (greedy) | +8% to +20% | Moderate — isolates the planner |
| LOOM vs B4 (LLM) | +25% to +70% | Low confidence, high interest |

**Where we expect to lose, and why that is fine:**

| Metric | Likely winner | Why we report it anyway |
|---|---|---|
| `items_attempted` | B2 | B2 drills more items and learns less per unit budget. Showing this makes the efficiency argument concrete instead of abstract. |
| Wall-clock decision latency | B0, B1 | A fixed sequence has no decision to make. We are 130 ms slower than doing nothing. |
| Simplicity | B0 | Honest. LOOM is ~40x the code for ~1.5x the outcome. Whether that trade is worth it depends on the deployment, and we say so. |

**By profile** — this is the interesting breakdown, and it is where the per-profile small multiples on
panel P8 earn their space:

| Profile | Expected LOOM margin over B2 | Why |
|---|---|---|
| P1 Sprinter | Small (+5–10%) | A strong learner needs little help. **This is correct behaviour, not a weakness.** |
| P2 Deliberator | Moderate | Depends on M7 not mistaking slowness for struggle. |
| P3 Guesser | Moderate | M1 must resist over-crediting lucky guesses. |
| **P4 Anchored** | **Large (+40–70%)** | B2 has no misconception model at all. It drills forever. |
| **P5 Cracked Foundation** | **Large (+50–90%)** | B2 cannot go backwards. It teaches C8 to a learner without C3. |
| P6 Leaky Bucket | Large (+30–50%) | Only LOOM discovers `CONSOLIDATE`. |
| P7 Fader | Moderate (+20–35%) | Depends on M7 and `BRANCH` firing in time. |

**The single most persuasive sentence in the presentation:** *"Our margin is smallest on the learners
who need us least, and largest on the two profiles a fixed sequence structurally cannot serve. That
pattern is the result — not the average."*

---

## 6. Ablation study

Each configuration re-runs the pipeline on a 200-learner development-sized cohort.

| # | Configuration | Isolates |
|---|---|---|
| A0 | Full LOOM | Reference |
| A1 | M1 graph propagation off | Cross-concept credit |
| A2 | M2 off (flat 0.5 prior) | Generalisation to unseen concepts |
| A3 | M3 off (no `EXPLAIN`, no T1) | The whole misconception pipeline |
| A4 | M4 off (authored priors only) | Difficulty estimation |
| A5 | M5 off (`delta = 1`, rollout only) | The learned gain model |
| A6 | M6 off (deterministic tie-break) | Learned ranking |
| A7 | M7 off (threshold rule) | Engagement modelling |
| A8 | M8 off (uniform prior) | Cold-start priors |
| A9 | Rollout off (`delta = 0`) | Lookahead planning |
| A10 | Exploration off (`beta = 0`) | Information seeking |
| A11 | Risk off (`gamma = 0`) | Harm avoidance |
| A12 | Budget off (`alpha = 0`) | Cost awareness |

Reported as a sorted bar chart of `delta` from A0 with CIs. **We report negative and near-zero results
truthfully** ([`Contract.md`](./Contract.md) C2.3). If M6 contributes 1%, the chart says 1%.

A judge who sees an ablation table where every component contributes exactly what the authors hoped
will assume it was reverse-engineered. A table with one small and one surprising result reads as real.

---

## 7. Statistical practice

| Practice | Detail |
|---|---|
| **Unit of analysis** | The run (one learner, one policy, one seed). Not the step — steps within a run are not independent. |
| **Paired comparison** | Policies are compared on the **same learner seeds**, so B0 and LOOM face identical learners. This is a paired design and materially tightens the CIs. |
| **CI method** | Normal approximation for display; 10,000-sample bootstrap as a cross-check. If they disagree materially, the bootstrap is reported. |
| **Multiple comparisons** | 5 policies x 7 metrics = 35 tests. Holm-Bonferroni on the secondary metrics. The primary comparison is pre-registered and not corrected. |
| **Effect size** | Cohen's *d* reported alongside every *p*-value. With N = 4,500, everything is "significant"; only the effect size is informative, and we say that on the panel. |
| **Seeds** | 5 seeds x 900 learners. Between-seed variance reported separately from within-seed variance. |

---

## 8. Threats to validity — stated, not hidden

| Threat | Our position |
|---|---|
| **Simulated learners are not real learners** | Correct. Every chart axis says "simulated". We claim a result about a stated learner model, nothing more. |
| **We wrote the simulator** | Yes — and the four barriers in [`Simulation.md`](./Simulation.md) §1 are our answer. Different model family, different parameters, an import boundary, and a database permission boundary. Plus the published calibration error. |
| **The item bank is small (28)** | Real. It limits IRT precision and makes M8's detection thin. We state per-item standard errors rather than pretending. |
| **Tuning could have leaked** | Prevented by disjoint seed ranges (C6.6) and by not touching the evaluation cohort until Hour 30. |
| **The action costs are authored** | They are a modelling assumption, declared as such and never tuned. Different costs would produce a different policy; the *framework* is the contribution, not the specific numbers. |
| **B2 might be under-tuned** | We tuned B2's threshold (3 consecutive) on the pretraining cohort, the same budget of attention LOOM's parameters got. Sandbagging the baseline would be the easiest way to fake this result, so we did the opposite and said so. |

---

## 9. Reporting template

The final claim, in the exact form it goes on the slide:

> On 900 stratified simulated learners across 5 seeds (4,500 paired runs per policy), LOOM achieved
> **X.XXX** weighted mastery gain per 100 energy units versus **Y.YYY** for a fixed linear sequence —
> a **Z%** improvement (95% CI: A% to B%, Cohen's d = D). Against a mastery-threshold heuristic the
> improvement was **W%**. The margin was largest on learners with prerequisite gaps (**+P%**) and
> entrenched misconceptions (**+Q%**), and smallest on already-strong learners (**+R%**).
>
> The agent's knowledge-state estimator had a mean absolute error of **E** against simulator ground
> truth, which it never observes.
>
> *All results are on simulated learners under the generative model described in Simulation.md.*

Every letter is filled from a `run_id`. Nothing is typed by hand
([`Contract.md`](./Contract.md) C7.4).
