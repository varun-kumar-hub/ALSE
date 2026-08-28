# Glossary

Terms, symbols, and identifiers used across the LOOM documentation. When two people mean different
things by "mastery", the project has a bug it cannot see.

---

## Core concepts

| Term | Meaning |
|---|---|
| **Weighted mastery (WM)** | The scalar objective: `sum_c w_c * mastery_c`. When unqualified in a metric, it means the agent's *estimate*. **True weighted mastery** is the simulator's ground truth and is always named explicitly. |
| **Belief** | A mastery estimate as `(mean, variance, n_evidence)` — never a bare number. Variance is what makes exploration meaningful. |
| **Belief state** `b` | The agent's whole world: `LearnerState`. Its posterior over the hidden learner. |
| **True state** `s*` | The simulator's hidden learner state. The agent never observes it. |
| **Observation** | The six fields that cross the sim/agent boundary: `item_id, chosen_option_id, is_correct, response_time_ms, hints_used, step`. Nothing else. |
| **Decision point** | A story beat where the agent chooses an action. There are 8. |
| **Step** | One agent decision plus (usually) one learner response. A session has ~20. |
| **Budget** | 100 energy units and 25 interactions. Both hard. Energy is diegetic — station reserve power. |
| **Productive zone** | Items where `P(correct)` lands in roughly `[0.55, 0.85]`. Not hard-coded; it emerges from the frustration and boredom risk terms. |
| **Probe item** | One of 6 items reserved for the pre-test and post-test, never used for teaching. Makes the before/after measurement honest. |
| **Circularity** | Evaluating an agent in a simulated world built from the agent's own model. The failure mode this project is designed to foreclose. |
| **Diegetic** | Existing inside the fiction. The energy budget is diegetic; the utility function is not. |

---

## Symbols

| Symbol | Meaning | Value |
|---|---|---|
| `w_c` | Curriculum weight of concept `c` | Sums to 1.0 |
| `tau` | Transfer weight on a prerequisite edge | (0, 1) |
| `rho` | Graph credit propagation damping in M1 | 0.35 |
| `theta` | Learner ability on the IRT logit scale | ~[-3.5, 3.5] |
| `a_i`, `b_i` | Item discrimination and difficulty (2PL IRT) | `b` ~[-2, 2] |
| `alpha` | Cost exponent in the utility function | 0.85 |
| `beta` | Weight on the exploration term | 0.15 |
| `gamma` | Weight on the risk term | 0.30 |
| `kappa` | Lower-confidence-bound width | 1.0 |
| `delta` | Blend between M5's gain estimate and the rollout estimate | 0.6 |
| `eta` | Weight on misconception entropy in `Explore(a)` | 0.5 |
| `N` | Rollout samples per candidate | 32 (pinned by benchmark) |
| `lambda_c` | Forgetting rate for concept `c` | Estimated by the agent, drawn per learner by the simulator |

---

## Identifiers

| Prefix | Meaning | Example |
|---|---|---|
| `C1`–`C10` | Concepts | `C7` = Distributive Property |
| `M1`–`M8` | **Two distinct namespaces, disambiguated by context** | See below |
| `IT-Cnn-nn` | Items | `IT-C7-02` |
| `P1`–`P7` | Learner profiles | `P5` = Cracked Foundation |
| `P1`–`P12` | Dashboard panels | `P9` = Calibration |
| `T1`–`T5` | Re-planning triggers | `T3` = prerequisite gap |
| `A1`–`A9` | Action families | `A5` = `EXPLAIN` |
| `B0`–`B4` | Baseline policies | `B2` = mastery threshold |
| `F1`–`F8` | User flows | `F2` = decision inspection |
| `US-L*`, `US-J*` | User stories | `US-J1` |
| `FR-*`, `NFR-*` | Requirements | `NFR-1` = decision latency |
| `C*.*` | Contract rules | `C4.3` = the `sim` permission boundary |
| `ADR-*` | Design decisions | `ADR-004` |
| `R1`–`R14` | Risks | `R1` = content overrun |
| `V1`–`V4` | Simulator validation checks | `V2` = learning is possible but not trivial |

**On the `M` collision:** `M1`–`M8` name both the eight **misconceptions** and the eight
**models**. They are always disambiguated in context (a misconception is described by its faulty rule;
a model by its family), and the collision is genuinely convenient in conversation — "M3 detects M3"
is a sentence the team will say often, and it is unambiguous because the models detect
misconceptions, not the reverse. If it ever becomes confusing in code, models are `ModelId` and
misconceptions are `MiscId`, and mypy separates them.

---

## The eight misconceptions

| ID | Name | The faulty rule |
|---|---|---|
| M1 | Letter-as-Object | A letter labels a thing, not a number |
| M2 | Sign Loss on Transfer | Moving a term across `=` keeps its sign |
| M3 | Partial Distribution | Multiply only the first term inside the bracket |
| M4 | Inverse Operation Confusion | Apply the same operation instead of its inverse |
| M5 | Illicit Term Combination | Any two terms can be added |
| M6 | One-Sided Operation | Operate on one side only |
| M7 | Partial Fraction Clearing | Multiply only the fractional term by the LCD |
| M8 | Reversal Error | Write the relation with the multiplier on the wrong side |

## The eight models

| ID | Name | Family |
|---|---|---|
| M1 | Knowledge-State Estimator (KSE) | Bayesian Knowledge Tracing + graph propagation |
| M2 | Concept-Mastery Predictor (CMP) | Gradient-boosted trees |
| M3 | Misconception Detector (MCD) | Multinomial classifier + Bayesian accumulator |
| M4 | Difficulty Estimator (DEM) | 2PL IRT, EM + online Newton |
| M5 | Learning-Gain Predictor (LGP) | Gradient-boosted regressor |
| M6 | Action/Branch Ranker (ABR) | Pairwise ranking |
| M7 | Engagement & Gaming Detector (EGD) | Random forest over sequence features *(bonus)* |
| M8 | Learner Archetype Classifier (LAC) | Gaussian mixture *(bonus)* |

## The nine actions

| ID | Action | Cost | Consumes an interaction? |
|---|---|---|---|
| A1 | `ASSESS` | 8 | Yes |
| A2 | `TEACH` | 12 | No |
| A3 | `REVISE` | 10 | No |
| A4 | `HINT` | 3 | No |
| A5 | `EXPLAIN` | 9 | No |
| A6 | `EASIER` | 8 | Yes |
| A7 | `HARDER` | 8 | Yes |
| A8 | `BRANCH` | 5 | No |
| A9 | `CONSOLIDATE` | 6 | Yes |

## The seven learner profiles

| ID | Name | Defining trait |
|---|---|---|
| P1 | Sprinter | Fast and accurate |
| P2 | Deliberator | Slow and accurate |
| P3 | Guesser | Fast and careless |
| P4 | Anchored | One deep, persistent misconception |
| P5 | Cracked Foundation | Strong upper concepts, missing prerequisites |
| P6 | Leaky Bucket | Learns fast, forgets fast |
| P7 | Fader | Engagement collapses mid-session |

---

## Technical terms

| Term | Meaning |
|---|---|
| **BKT** | Bayesian Knowledge Tracing — a discrete latent "mastered / not mastered" state updated by Bayes with slip and guess parameters. The agent's estimator. |
| **IRT / 2PL** | Item Response Theory. The two-parameter logistic model: `P(correct) = sigmoid(a(theta - b))`. |
| **Slip** | Answering incorrectly despite knowing the concept. |
| **Guess** | Answering correctly without knowing. |
| **ECE** | Expected Calibration Error — how far predicted probabilities are from observed frequencies. |
| **Brier score** | Mean squared error of probabilistic predictions. Lower is better. |
| **NDCG@k** | Normalised Discounted Cumulative Gain — ranking quality at the top `k`. |
| **Ablation** | Removing one component and re-measuring, to establish its contribution. |
| **Off-policy bias** | A model trained on one policy's trajectories performing badly under a different policy. Why the pretraining cohort uses a mixed policy. |
| **Thompson sampling** | Choosing among near-tied options in proportion to their scores, rather than always taking the argmax. |
| **Ebbinghaus forgetting** | Exponential decay of retention with time since last exposure. |
| **Contrast case** | A remediation that shows the learner's own faulty rule producing a visibly wrong result, beside the correct rule. The payload of `EXPLAIN`. |
| **Walking skeleton** | A minimal end-to-end path through every layer, built early to prove the pieces connect. |
| **Pre-registration** | Declaring metrics and comparisons before running the experiment, so the result cannot be chosen after the fact. |

---

## Project names

| Name | Meaning |
|---|---|
| **LOOM** | The product. Learning Orchestration & Optimisation for Mastery — and it weaves a different story for each learner. |
| **Signal from Kepler Station** | The narrative frame. |
| **PS 6** | The problem statement: *Adaptive Story Challenge — Autonomous Learning Strategy Engine*. |
| **`app` / `sim` / `content`** | The three database schemas. `sim` is the one the application role cannot read. |
| **SHOWCASE-A/B/C/D** | The four pinned demo sessions. |
