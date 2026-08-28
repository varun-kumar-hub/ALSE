# Agent Policy — The Decision Engine

This document is the mathematics of LOOM. It defines the state, the action space, the cost model, the
utility function, the lookahead, the re-planning triggers, and the explanation contract. Everything
here is team-implemented; no external service participates in any step
([`Contract.md`](./Contract.md) §3).

---

## 1. The problem, formally

LOOM solves a **budget-constrained partially-observable sequential decision problem**.

- **Hidden state** `s*` — the learner's true knowledge and misconceptions. Never observed.
- **Belief state** `b` — `LearnerState`, the agent's posterior over `s*`.
- **Actions** `A(b)` — legal teaching interventions, each with a cost.
- **Observation** `o` — `(item, chosen_option, correct, response_time, hints_used)`.
- **Budget** `B` — 100 energy units and 25 interactions, both hard.
- **Objective** — maximise terminal weighted mastery `sum_c w_c * mastery_c` at budget exhaustion.

We do **not** solve this optimally — a full POMDP solve is neither necessary nor honest at this scale.
We run a **one-step-optimal policy with depth-2 stochastic lookahead and an uncertainty bonus**, which
is a defensible engineering choice we state openly (see [`Design_Decisions.md`](./Design_Decisions.md)
ADR-006).

---

## 2. The action space

Nine action families. At any decision point the generator emits **3 to 12** concrete instantiations
([`Contract.md`](./Contract.md) C5.2).

| # | Action | Parameters | Cost (energy) | Consumes an interaction? | Intent |
|---|---|---|---|---|---|
| A1 | `ASSESS` | `item_id` | 8 | Yes | Gather evidence at a chosen concept and difficulty. |
| A2 | `TEACH` | `concept_id` | 12 | No | Introduce a concept not yet taught. |
| A3 | `REVISE` | `concept_id` | 10 | No | Re-present a concept that is weak or has decayed. |
| A4 | `HINT` | `level ∈ {1,2,3}` | 3 | No | Scaffold the item currently open. |
| A5 | `EXPLAIN` | `misconception_id` | 9 | No | Contrast-case remediation of a specific misconception. |
| A6 | `EASIER` | `concept_id` | 8 | Yes | Assess the same concept one difficulty band down. |
| A7 | `HARDER` | `concept_id` | 8 | Yes | Assess the same concept one difficulty band up. |
| A8 | `BRANCH` | `branch_id` | 5 | No | Switch story branch — changes framing (applied vs abstract vs visual). |
| A9 | `CONSOLIDATE` | `concept_id` | 6 | Yes | Spaced retrieval of a previously mastered concept, to fight decay. |

`STOP` is not an action the agent chooses; the session ends when budget or interactions are exhausted,
or when `WeightedMastery > 0.90`.

### 2.1 Legality rules (`ActionGenerator`)

An action is a candidate only if all of these hold:

| Action | Legality conditions |
|---|---|
| `ASSESS(i)` | `i.role == teach`; `i` not attempted this session; `i.concept` has been taught or its prerequisites are ≥ 0.5; `cost ≤ budget`. |
| `TEACH(c)` | `c` not yet taught; all prerequisites of `c` have `mastery ≥ 0.55` (the **readiness gate**). |
| `REVISE(c)` | `c` taught; `mastery_c < 0.75` OR `c` has decayed by > 0.1 since last seen. |
| `HINT(l)` | An item is currently open; `l == hints_used + 1`; `l ≤ 3`. |
| `EXPLAIN(m)` | `P(m) ≥ 0.45`; `m` not remediated in the last 3 steps. |
| `EASIER(c)` / `HARDER(c)` | An unattempted item exists in the adjacent difficulty band for `c`. |
| `BRANCH(b)` | `b` reachable from the current story node; not already active. |
| `CONSOLIDATE(c)` | `mastery_c ≥ 0.8` and `steps_since_last_seen(c) ≥ 5`. |

If fewer than 3 candidates survive, the generator relaxes in this fixed order: drop the readiness gate
to 0.45, then allow re-assessment of an attempted item at a different difficulty, then admit
`BRANCH`. A single-candidate decision is a bug ([`Contract.md`](./Contract.md) C5.2).

### 2.2 Why the cost model looks like this

Costs encode the real currency of tutoring: **learner attention**. `TEACH` is the most expensive
because a fresh explanation demands the most attention. `HINT` is cheap and repeatable, which is
exactly why the agent must be prevented from spamming it — and the engagement model (M7) supplies
that pressure by raising `gaming_prob` when hints are over-used, which the risk term penalises.
Costs were set at Hour 6 and are frozen; they are a modelling choice, not a tuned parameter, and we
say so.

---

## 3. Belief state

```
b = (
  mastery:        {c: Belief(mean, var, n)}  for 10 concepts
  misconceptions: {m: p}                     for 8 misconceptions
  theta:          float                      IRT ability estimate
  engagement:     (level, gaming_prob, fatigue)
  archetype:      one of 7 | None
  budget:         (energy_remaining, interactions_remaining)
  history:        per-concept error counts, last-seen step, hints used
)
```

**Weighted mastery** is the scalar objective:
```
WM(b) = sum_c  w_c * mastery_c.mean
```

**Uncertainty-adjusted mastery**, used for the risk term:
```
WM_lcb(b) = sum_c  w_c * (mastery_c.mean - kappa * sqrt(mastery_c.var)),   kappa = 1.0
```

**Decay.** Between steps, each concept's mean decays toward a floor:
```
mastery_c.mean  <-  floor_c + (mastery_c.mean - floor_c) * exp(-lambda_c * delta_steps)
mastery_c.var   <-  min(var_max, mastery_c.var + sigma_decay * delta_steps)
```
The agent's `lambda_c` is *estimated*, not the simulator's true forgetting rate. Divergence here is a
real source of estimation error and shows up honestly in the calibration panel.

---

## 4. The utility function (frozen)

For each candidate action `a`:

```
U(a) =  [ Gain(a)  +  beta * Explore(a)  -  gamma * Risk(a) ]  /  Cost(a)^alpha
```

with the frozen hyperparameters:

| Symbol | Value | Meaning |
|---|---|---|
| `alpha` | 0.85 | Cost exponent. Sub-linear so the agent is not pathologically cheap. |
| `beta` | 0.15 | Weight on information gain. |
| `gamma` | 0.30 | Weight on the risk penalty. |
| `kappa` | 1.0 | Lower-confidence-bound width. |
| `delta` | 0.6 | Lookahead discount on depth-2 value. |

### 4.1 `Gain(a)` — expected weighted mastery gain

Two estimates, blended:

```
Gain(a) = (1 - delta) * Gain_model(a) + delta * Gain_rollout(a)
```

- **`Gain_model(a)`** — a direct prediction from **M5 (Learning-Gain Predictor)**, an XGBoost
  regressor on `(state features, action features) -> Delta WM`. Fast, one call, batched across all
  candidates.
- **`Gain_rollout(a)`** — depth-2 Monte Carlo simulation using the agent's *own* forward model
  (§5). Slower, but captures sequencing effects M5 cannot see, e.g. that `TEACH(C7)` is only valuable
  if followed by `ASSESS` on a C7 item.

Blending them is deliberate: M5 alone is myopic; rollout alone is noisy at 32 samples. The blend is
also a natural ablation — `delta = 0` gives us baseline B3 (greedy-myopic) for free.

### 4.2 `Explore(a)` — expected information gain

How much would this action reduce our uncertainty about the learner?

```
Explore(a) = sum_c  w_c * ( var_c(b)  -  E[ var_c(b') | a ] )
           + eta * sum_m ( H(p_m)  -  E[ H(p_m') | a ] )
```

where `H` is binary entropy and `eta = 0.5`. Concretely: assessing a concept we have never probed, or
posing an item whose distractors discriminate between two live misconception hypotheses, scores high.
This is what makes the agent *diagnose* rather than merely drill, and it is the term that produces the
most interesting behaviour in the demo: early in a session the agent deliberately spends energy on
information, and the Agent Console shows it doing so.

Actions that gather no evidence (`TEACH`, `EXPLAIN`, `BRANCH`) have `Explore(a) = 0`. Correct — they
change the learner, they do not reveal them.

### 4.3 `Risk(a)` — expected harm

```
Risk(a) =  r_frustration(a) + r_boredom(a) + r_waste(a)
```

| Term | Definition |
|---|---|
| `r_frustration` | `max(0, P(incorrect|a) - 0.75) * 4 * fatigue_factor`. Posing an item the learner will almost certainly fail, to an already-fatigued learner, is harmful. |
| `r_boredom` | `max(0, 0.92 - P(incorrect|a))`. Posing an item that is trivially easy wastes attention. |
| `r_waste` | `gaming_prob * 1{a is HINT}` plus `1{a is TEACH and prerequisites unmet} * 0.5`. Teaching C8 to a learner who has not got C3 is the classic wasted intervention. |

`P(incorrect|a)` comes from **M2 (Concept-Mastery Predictor)** composed with **M4 (Difficulty
Estimator)**: a 2PL IRT response curve at the learner's current `theta` and the item's estimated
`(a, b)`.

The **target success band** that falls out of this is roughly `P(correct) ∈ [0.55, 0.85]` — the
classic zone of proximal development. We did not hard-code that band; it emerges from `r_frustration`
and `r_boredom`. That is a good thing to point out to a judge.

### 4.4 Selection

```
a* = argmax_a  U(a)
```

with **Thompson-style tie-breaking**: if the top two utilities are within 3%, sample between them
proportional to `exp(U/tau)`, `tau = 0.02`, using the run's seeded generator. This keeps the policy
deterministic per seed (C7.1) while avoiding pathological lock-in on ties.

**M6 (Action/Branch Ranker)** provides a learned pairwise-ranking score over candidates, trained on
which action *actually* produced the most true gain in the pretraining cohort. It enters as a
tie-breaker and a sanity check: when M6's top choice differs from `argmax U`, the disagreement is
recorded in `app.decisions.ranker_disagreement`. We report the disagreement rate as a diagnostic —
it is one of the more interesting numbers in the system and shows the components are not redundant.

---

## 5. The forward model used for lookahead

The rollout needs to answer: *"if I take action `a`, what does the learner look like afterwards?"*

This is the agent's **own** model of learning dynamics, and it is deliberately simpler and different
from the simulator ([`Contract.md`](./Contract.md) C4.1):

| Action | Agent's forward model |
|---|---|
| `ASSESS(i)` | Sample `correct ~ Bernoulli(P_2PL(theta, a_i, b_i))`. If correct, BKT-update up; else down and raise the posterior of misconceptions attached to the likely distractors. |
| `TEACH(c)` | `mastery_c.mean += g_teach * (1 - mastery_c.mean)`, `g_teach = 0.35`, scaled by prerequisite readiness. |
| `REVISE(c)` | Same form, `g_revise = 0.22`, but no prerequisite scaling. |
| `HINT(l)` | Raises `P(correct)` on the open item by `+0.12 * l`; reduces the mastery credit gained if the answer is then correct (a hinted success is weaker evidence — this is modelled explicitly, not ignored). |
| `EXPLAIN(m)` | `P(m) *= (1 - remediation_strength_hat_m)`; boosts mastery on concepts where `m` is primary. |
| `EASIER`/`HARDER` | As `ASSESS` at a shifted difficulty band. |
| `BRANCH(b)` | Restores engagement by `+0.15`; no direct mastery effect. |
| `CONSOLIDATE(c)` | Resets `last_seen_c`, halving accumulated decay; small variance reduction. |

`remediation_strength_hat` is **learned** by M5 from observed data, not read from the simulator's
table in [`Concept_Graph.md`](./Concept_Graph.md) §3. The agent's estimates converge toward, but never
equal, the true values.

### 5.1 Rollout procedure

```
Gain_rollout(a):
    total = 0
    for k in 1..N:                       # N = 32
        b1 = forward(b, a, rng_k)        # apply a, sample the observation
        A1 = generate(b1)                # legal actions after a
        a1 = argmax_{a' in A1} Gain_model(a') / Cost(a')^alpha     # cheap greedy at depth 2
        b2 = forward(b1, a1, rng_k)
        total += (WM(b2) - WM(b))
    return total / N
```

Depth 2, 32 samples, greedy at the second level. Cost: 12 candidates x 32 samples x 2 transitions =
768 cheap forward steps, budgeted at 80 ms. Benchmark and pin `N` at Hour 26.

---

## 6. Re-planning

The agent re-plans **after every response** (C5.6). In addition, five **event triggers** force a
*strategy shift*, which is a stronger intervention than a normal re-plan: it temporarily reweights the
utility function.

| # | Trigger | Condition | Strategy shift |
|---|---|---|---|
| T1 | **Misconception confirmed** | `P(m) > 0.65` for any `m` | `EXPLAIN(m)` gets a `+0.25` utility bonus for the next 2 steps. Diagnose-then-fix beats drilling. |
| T2 | **Plateau** | `WM` has moved < 0.02 over the last 4 steps | `beta` (exploration) doubles for 3 steps. If we are stuck, we probably do not understand the learner. |
| T3 | **Prerequisite gap detected** | A concept fails twice while an upstream prerequisite has `mastery < 0.5` | The action space is restricted to the failing concept's *ancestors* for 2 steps. This produces the demo's most striking behaviour: the agent visibly walks backwards down the graph. |
| T4 | **Budget critical** | `energy_remaining < 20%` | `alpha` rises to 1.2 (cost matters more) and `beta` drops to 0.05 (stop exploring, start consolidating gains). |
| T5 | **Disengagement** | M7 reports `gaming_prob > 0.6` or `fatigue > 0.7` | `BRANCH` and `EASIER` get a `+0.20` bonus; `HINT` is penalised. |

Every trigger firing is persisted to `app.decisions.trigger_fired` and rendered on the trajectory
panel as a marker. A judge can see the moment the agent changed its mind and why.

---

## 7. The explanation contract

Every decision must produce a rationale built from the actual numbers
([`Contract.md`](./Contract.md) C5.7). The `RationaleBuilder` emits a structured object:

```json
{
  "step": 7,
  "selected": {"type": "EXPLAIN", "misconception": "M3", "cost": 9},
  "headline": "Remediating partial distribution before advancing.",
  "because": [
    "P(M3) rose to 0.71 after two distractor matches on IT-C7-02 and IT-C7-03.",
    "Trigger T1 fired: misconception confirmed.",
    "Predicted weighted mastery gain 0.083 at cost 9 → utility 0.0125.",
    "Runner-up HARDER(C7) scored 0.0078: predicted gain 0.061 but risk 0.34 " +
      "because P(correct) is only 0.21 while M3 is active."
  ],
  "counterfactual": {
    "action": {"type": "HARDER", "concept": "C7"},
    "predicted_wm_after_2_steps": 0.512,
    "selected_predicted_wm_after_2_steps": 0.547
  },
  "candidates_considered": 9,
  "models_consulted": ["M1@1.2.0", "M2@1.1.0", "M3@1.3.0", "M4@1.0.1", "M5@1.2.0", "M6@1.0.0"]
}
```

The dashboard renders `headline` prominently, `because` as bullets, and `counterfactual` as the
"what if" toggle. The full candidate table sits behind one click (US-J1).

---

## 8. Baseline policies (implemented as the same interface)

All baselines implement `Policy.select(state, candidates) -> Action`, so the harness swaps them with
one config line and the comparison is apples to apples.

| ID | Policy | Behaviour |
|---|---|---|
| **B0** | Fixed Linear Sequence | Walk the topological order C1→C10. `TEACH` then one `ASSESS` per concept. No adaptation. The PS-mandated baseline. |
| **B1** | Random | Uniform over legal candidates. Establishes the floor. |
| **B2** | Mastery Threshold | Khan-style: stay on a concept until 3 consecutive correct, then advance. No misconception handling, no budget reasoning. This is the *strong* baseline — it is what most competent systems actually do. |
| **B3** | Greedy Myopic | LOOM with `delta = 0` (no rollout), `beta = 0` (no exploration), `gamma = 0` (no risk), `alpha = 0` (no cost sensitivity). Pure M5 argmax. This is the ablation that isolates the value of the planning machinery. |
| **B4** | LLM-only tutor | Offline fixture: a hosted LLM given the same transcript and asked to pick the next action, with no state engine. Included only if time allows; first on the cut line. |
| **LOOM** | Full policy | This document. |

**We expect B2 to be respectable.** Saying so in advance, and then showing LOOM beating it on
*mastery per unit budget* while B2 wins on raw items attempted, is a far more credible story than
beating only a straw man.

---

## 9. Hyperparameter provenance

| Parameter | Value | How chosen |
|---|---|---|
| `alpha, beta, gamma, kappa, delta` | 0.85, 0.15, 0.30, 1.0, 0.6 | Coarse grid search on the **pretraining** cohort (seeds 1000–1999), 3 values each on a reduced grid, selected on mean weighted mastery gain per energy. Never tuned on the evaluation cohort (seeds 9000–9999). |
| Action costs | §2 table | Authored at Hour 6, frozen, never tuned. A modelling assumption, declared as such. |
| `N` rollout samples | 32 | Chosen by latency benchmark at Hour 26, not by accuracy. |
| Trigger thresholds | §6 | Authored, then sanity-checked for firing rate on the pretraining cohort (each trigger should fire in 15–60% of sessions; a trigger that never fires is dead code and gets removed). |

Tuning on pretraining seeds and reporting on disjoint evaluation seeds is
[`Contract.md`](./Contract.md) C6.6. It is the difference between a result and a story.
