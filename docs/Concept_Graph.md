# Concept Graph, Misconception Taxonomy, and Item Bank

**Topic (locked, [`Contract.md`](./Contract.md) C1.1):** *Linear Equations in One Variable* — the
Class 8 / pre-algebra core. Chosen because it has a genuinely hierarchical prerequisite structure, a
well-documented misconception literature, and answers that are short enough to grade exactly.

---

## 1. The ten concepts

| ID | Concept | One-line definition | Curriculum weight `w_c` |
|---|---|---|---|
| C1 | Variables & Expressions | A letter stands for an unknown *number*, not an object or a label. | 0.08 |
| C2 | Substitution & Evaluation | Replace the variable with a value and compute. | 0.07 |
| C3 | Equality & the Balance Model | `=` asserts two quantities are equal; whatever you do to one side you do to the other. | 0.10 |
| C4 | Inverse Operations (one-step) | Undo an operation to isolate the variable. | 0.10 |
| C5 | Two-step Equations | Compose two inverse operations in the right order. | 0.11 |
| C6 | Combining Like Terms | Only terms with the same variable part may be added. | 0.10 |
| C7 | Distributive Property | `a(b + c) = ab + ac`, applied to *every* term inside. | 0.11 |
| C8 | Variables on Both Sides | Collect variable terms on one side, constants on the other. | 0.12 |
| C9 | Equations with Fractions | Clear denominators by multiplying *every* term by the LCD. | 0.10 |
| C10 | Word Problems to Equations | Translate a described relationship into a correct equation. | 0.11 |

`w_c` sums to 1.00 and defines the **weighted mastery** used everywhere as the primary outcome:

```
WeightedMastery(t) = sum_over_c( w_c * mastery_c(t) )
```

Weights encode two things: how much of the topic the concept represents, and how much downstream
material depends on it. C8 and C10 carry the most weight because they are terminal and integrative.

## 2. The prerequisite DAG (frozen)

```
C1 Variables ──┬──> C2 Substitution ──┐
               │                       ├──> C4 Inverse Ops ──> C5 Two-step ──┬──> C8 Both Sides
               ├──> C3 Equality ───────┘                                      │
               │                                                              │
               └──> C6 Like Terms ──┬──> C7 Distributive ────────────────────┤
                                    │                                         │
                                    └─────────────────────────────────────────┘
                                                                              │
        C5 ──┬──> C9 Fractions                                                │
        C7 ──┘                                                                │
                                                                              │
        C4, C5, C8 ──────────────────────────────> C10 Word Problems <────────┘
```

Edge list, with **transfer weight** `tau` — how much credit propagates from child evidence back to a
parent (used by M1's graph credit propagation):

| From | To | `tau` | Reading |
|---|---|---|---|
| C1 | C2 | 0.60 | You cannot substitute if a letter is not a number to you. |
| C1 | C3 | 0.45 | |
| C2 | C4 | 0.50 | |
| C3 | C4 | 0.65 | Balance model is the strongest predictor of inverse-op success. |
| C4 | C5 | 0.70 | |
| C1 | C6 | 0.50 | |
| C6 | C7 | 0.45 | |
| C5 | C8 | 0.60 | |
| C6 | C8 | 0.55 | |
| C7 | C8 | 0.50 | |
| C5 | C9 | 0.55 | |
| C7 | C9 | 0.50 | |
| C4 | C10 | 0.35 | |
| C5 | C10 | 0.45 | |
| C8 | C10 | 0.55 | |

**Properties the code asserts at seed time** (`tests/test_concept_graph.py`):
- The graph is acyclic.
- Every concept except C1 has at least one parent.
- `w_c` sums to 1.0 within 1e-9.
- Every `tau` is in `(0, 1)`.
- Topological order is unique enough to define the fixed baseline sequence B0.

**Canonical topological order (this *is* baseline B0's sequence):**
`C1 → C2 → C3 → C4 → C6 → C5 → C7 → C8 → C9 → C10`

## 3. The eight misconceptions

Each is a *systematic* wrong rule, not a random slip. Each is detectable because it produces a
**predictable wrong answer**, which is why every distractor is authored to be the output of a specific
misconception.

| ID | Name | The learner's faulty rule | Signature error | Primary concepts |
|---|---|---|---|---|
| M1 | Letter-as-Object | A letter labels a thing, not a number. | `3a + 2b = 5ab`; "3a means 3 apples" | C1, C6 |
| M2 | Sign Loss on Transfer | Moving a term across `=` keeps its sign. | `x - 5 = 3` → `x = 3 - 5` reversed, or `x + 5 = 3` → `x = 3 + 5` | C4, C5, C8 |
| M3 | Partial Distribution | Multiply only the first term inside the bracket. | `3(x + 4) = 3x + 4` | C7, C9 |
| M4 | Inverse Operation Confusion | Apply the same operation instead of its inverse. | `2x = 10` → `x = 10 * 2` | C4, C5 |
| M5 | Illicit Term Combination | Any two terms can be added. | `3x + 2 = 5x` | C6, C5 |
| M6 | One-Sided Operation | Operate on one side only; `=` means "produces". | `x + 3 = 7` → `x + 3 - 3 = 7` | C3, C4 |
| M7 | Partial Fraction Clearing | Multiply only the fractional term by the LCD. | `x/2 + 3 = 5` → `x + 3 = 5` | C9 |
| M8 | Reversal Error | Write the relation with the multiplier on the wrong side. | "5 times as many students as professors" → `5S = P` | C10 |

**Persistence model.** Misconceptions are *sticky*: in the simulator they do not vanish on a single
correct answer. Each has a `remediation_strength` — the probability that a targeted `EXPLAIN` action
extinguishes it — and a much lower `incidental_decay` for merely getting an item right. This is what
makes the `EXPLAIN` action worth its cost, and what the agent must learn to exploit.

| Misconception | `remediation_strength` | `incidental_decay` |
|---|---|---|
| M1 | 0.55 | 0.06 |
| M2 | 0.65 | 0.12 |
| M3 | 0.70 | 0.10 |
| M4 | 0.60 | 0.10 |
| M5 | 0.60 | 0.08 |
| M6 | 0.50 | 0.05 |
| M7 | 0.68 | 0.10 |
| M8 | 0.45 | 0.04 |

M8 (reversal) and M6 (one-sided operation) are deliberately the hardest to shift. They give the agent
something genuinely difficult to solve and make the "Anchored" learner profile a real test.

## 4. Item bank specification

**28 items**, authored as YAML in `content/items/`. Distribution:

| Concept | Items | Difficulty spread (authored `b` prior) |
|---|---|---|
| C1 | 3 | −1.6, −1.1, −0.6 |
| C2 | 2 | −1.2, −0.7 |
| C3 | 3 | −1.3, −0.8, −0.2 |
| C4 | 3 | −0.9, −0.4, 0.1 |
| C5 | 3 | −0.3, 0.2, 0.7 |
| C6 | 3 | −0.6, −0.1, 0.4 |
| C7 | 3 | 0.0, 0.5, 1.0 |
| C8 | 3 | 0.4, 0.9, 1.4 |
| C9 | 3 | 0.6, 1.1, 1.6 |
| C10 | 2 | 0.8, 1.3 |

Six of these are reserved and never used for teaching: they form the **pre-test / post-test probe
set** (one per concept for C3, C4, C5, C7, C8, C10). Held out entirely from the agent's action space
so that before/after is measured on unseen items. This is enforced by `item.role: probe`.

### 4.1 Item schema

```yaml
id: IT-C7-02
concept: C7
secondary_concepts: [C6]
role: teach            # teach | probe
difficulty_prior: 0.5  # IRT b, authored
discrimination_prior: 1.1  # IRT a, authored
stem: "The reactor coolant line needs 3(x + 4) = 27 litres. Solve for x."
answer_type: multiple_choice
options:
  - id: A
    text: "x = 5"
    correct: true
    misconception: null
  - id: B
    text: "x = 7.67"
    correct: false
    misconception: M3      # 3x + 4 = 27
  - id: C
    text: "x = 9"
    correct: false
    misconception: M4      # divided nothing / applied same op
  - id: D
    text: "x = 23"
    correct: false
    misconception: M2      # sign / transfer error
hints:
  - level: 1
    text: "The bracket is multiplied by 3. How many things are inside the bracket?"
  - level: 2
    text: "Distribute the 3 to BOTH terms: 3 * x and 3 * 4."
  - level: 3
    text: "You get 3x + 12 = 27. Now subtract 12 from both sides."
explanation:
  text: "..."
  contrasts: M3          # this explanation is the targeted remedy for M3
narrative_slot: beat_05
```

### 4.2 Authoring invariants (asserted at seed time)

| # | Invariant |
|---|---|
| I1 | Exactly one option has `correct: true`. |
| I2 | Every incorrect option maps to **zero or one** misconception ([`Contract.md`](./Contract.md) C6.4). |
| I3 | Across the bank, every misconception M1–M8 is reachable by **at least 3 distinct items**, otherwise M3 (the detector) cannot be trained. |
| I4 | Hint level 1 never contains the numeric answer. Level 3 may state the next step but not the final value. |
| I5 | Every concept has ≥ 2 `teach` items so `EASIER`/`HARDER` are always legal actions. |
| I6 | Every `probe` item's concept also has ≥ 2 `teach` items. |
| I7 | Authored `difficulty_prior` is monotone with the item's step count. |
| I8 | Every item is bound to a `narrative_slot` so it can appear in the story. |

### 4.3 Misconception coverage matrix

| | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 |
|---|---|---|---|---|---|---|---|---|
| Distractors in bank | 5 | 7 | 6 | 6 | 5 | 4 | 4 | 3 |
| Items that can detect it | 4 | 6 | 5 | 5 | 4 | 4 | 3 | 3 |

M8 is the thinnest at 3 items. That is acceptable — it is only reachable at C10 — but it means M8's
detector confidence will be lower, which we state in its model card rather than hide.

## 5. Explanation and revision content

| Asset | Count | Purpose |
|---|---|---|
| Concept explanations | 10 (one per concept) | The `TEACH` action's payload. |
| Revision cards | 10 | The `REVISE` action's payload — shorter, worked-example led. |
| Misconception remedies | 8 | The `EXPLAIN` action's payload. Each is a **contrast case**: the faulty rule side by side with the correct one, on the same numbers. |
| Hint ladders | 28 x 3 = 84 | The `HINT` action's payload. |

**Why contrast cases.** Simply restating the correct rule does not extinguish a misconception; the
learner has to see their own rule produce a visibly wrong result. Each remedy is structured as:
*"You may be thinking X. Here is X applied. Here is why it breaks. Here is the rule that works."*
This is also why `EXPLAIN` has a high cost (9 units) and a high payoff in the simulator.

## 6. Derived structures the code builds at load

| Structure | Built from | Consumed by |
|---|---|---|
| `prereq_matrix` (10x10, `tau`) | §2 edge list | M1 graph credit propagation, M2 features |
| `concept_depth` | topological sort | M2 features, difficulty targeting |
| `item_by_concept_difficulty` index | item bank | `EASIER` / `HARDER` action generation |
| `misconception_to_items` index | distractor maps | `EXPLAIN` action targeting, M3 training |
| `distractor_signature_matrix` | option→misconception | M3 features |
| `probe_set` | `role: probe` | Pre-test / post-test, before/after panel |
| `topological_sequence` | §2 | Baseline B0 |

## 7. Why this domain is defensible to a judge

- **The DAG is real, not decorative.** A learner who fails C8 usually fails because C3 or C6 is weak.
  The agent demonstrably goes *backwards* in the graph, which looks nothing like a quiz app.
- **The misconceptions are documented in the literature**, not invented — reversal errors, partial
  distribution, and letter-as-object are among the most studied errors in algebra education.
- **Every wrong answer carries information.** That is what makes M3 (misconception detection) a real
  model rather than a lookup, and what makes the whole system more than "adaptive difficulty".
