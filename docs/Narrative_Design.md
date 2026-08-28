# Narrative Design — "Signal from Kepler Station"

The problem statement is called **Adaptive Story Challenge**. The story is not decoration: it is the
reason `BRANCH` is a legitimate pedagogical action, the reason difficulty changes feel like plot
rather than punishment, and the reason a learner keeps going. This document specifies it.

---

## 1. Premise

You are a junior systems engineer who has just docked at **Kepler Station**, a research outpost that
went silent eleven days ago. Life support is running on reserve. The station's automated systems have
locked themselves behind engineering checks, and each check is an equation that must balance.

**Why this premise.** Linear equations are about *balance* — whatever you do to one side you do to
the other. A station whose systems must be balanced to restore power gives the core concept (C3,
Equality & the Balance Model) a physical meaning the learner can hold onto. The metaphor is load
bearing, not painted on.

**The budget is diegetic.** The learner's 100 energy units are the station's remaining reserve power.
Every teaching action costs power. This turns an abstract constraint into a felt one — a learner who
sees the meter fall understands why the system is being selective, and a judge sees the budget
mechanic without needing it explained.

---

## 2. Structure: 8 beats, 3 branches

Eight decision points ([`Contract.md`](./Contract.md) C1.4; the PS allows 5–10).

| Beat | Station system | Concepts in play | Narrative function |
|---|---|---|---|
| **B1** | Airlock diagnostic | C1, C2 | Onboarding + pre-test framing. "The station needs to know who you are." |
| **B2** | Power balance | C3, C4 | The balance metaphor is introduced physically. |
| **B3** | Coolant regulator | C4, C5 | First two-step reasoning. First real difficulty choice. |
| **B4** | Atmospheric mix | C6 | Like terms: only compatible gases combine. |
| **B5** | Reactor throttle | C7 | Distribution across every line. The classic M3 trap sits here. |
| **B6** | Twin-generator sync | C8 | Variables on both sides — two generators, one balance. |
| **B7** | Fuel ratio | C9 | Fractions and clearing denominators. |
| **B8** | The last message | C10 | Word problems: translate the crew's log into an equation. Story resolution. |
| — | Final systems check | probe set | Post-test framing. |

### The three branches

A branch is a **framing**, not a different plot. Same beat, same concept, different presentation. This
is what makes `BRANCH` cheap (5 energy) and genuinely useful.

| Branch | Framing | Best for |
|---|---|---|
| **`applied`** | Concrete quantities with units. *"The coolant line needs 3(x + 4) = 27 litres."* | Learners who disengage from abstraction (P7 Fader), and word-problem-strong learners. |
| **`abstract`** | Bare symbolic form. *"Solve 3(x + 4) = 27."* | Fast, confident learners (P1 Sprinter) for whom story framing is friction. |
| **`visual`** | Balance-beam diagram with blocks; the equation is shown as a physical scale. | Learners with a weak C3 balance model, and learners holding M6 (one-sided operation). |

**Every beat exists in all three framings** — 8 beats x 3 branches = 24 authored story nodes. Items are
shared across framings; only the wrapper text and the visual differ, so the pedagogical content and
the IRT difficulty are unchanged by a branch switch. That property matters: it means `BRANCH` changes
*engagement* without contaminating the difficulty measurement.

### Branch switching

The agent may switch branches at any beat boundary via `BRANCH(b)`, cost 5. In the simulator this
raises true engagement by 0.15 ([`Simulation.md`](./Simulation.md) §2.3). It is most often triggered
by T5 (disengagement) or chosen deliberately for a learner whose archetype posterior favours a
framing.

**The `visual` branch is a targeted remedy, not just a mood change.** For a learner with M6
(one-sided operation) the balance-beam framing makes the error visible — you cannot remove a block
from one pan of a scale and expect it to stay level. The agent learns this association through M5,
because in the simulator the visual framing carries a small extra remediation effect for M6. That is a
small piece of pedagogical modelling that produces a genuinely satisfying agent behaviour.

---

## 3. Beat anatomy

Every beat is authored as:

```yaml
id: beat_05
beat_index: 5
branch_id: applied
title: "Reactor Throttle"
narrative_md: |
  The reactor hums at eleven percent. Three coolant lines feed it, and each one
  carries the same load plus a fixed four-litre buffer. Total flow reads 27 litres.
  The throttle will not open until you tell it what a single line carries.
objective: "Find the per-line flow."
items: [IT-C7-01, IT-C7-02, IT-C7-03]
on_success_md: "The throttle unlocks. Reactor output climbs to thirty percent."
on_failure_md: "The throttle holds. A warning light stays amber."
teach_md: "..."          # payload when the agent chooses TEACH here
revise_md: "..."         # payload when the agent chooses REVISE here
```

**Narrative consequence is bound to correctness, not to progression.** A wrong answer does not end the
mission or block the story — the light stays amber and the agent decides what to do about it. This is
important: the story must never punish the learner for the state the agent is trying to diagnose.

---

## 4. How agent actions appear in the fiction

| Action | Narrative surface |
|---|---|
| `ASSESS` | A station system presents its check. |
| `TEACH` | The station's maintenance archive plays a briefing. |
| `REVISE` | *"Pulling the earlier schematic again."* Shorter, familiar. |
| `HINT` | The station AI offers a nudge. Three levels: an observation, a method, a first step. |
| `EXPLAIN` | *"Flight recorder analysis"* — the station replays your own reasoning and shows where it diverged. This is the contrast case, dramatised. |
| `EASIER` | *"Routing to a secondary system"* — a smaller check, without shame. |
| `HARDER` | *"Bringing the primary array online"* — an escalation, framed as trust. |
| `BRANCH` | A scene transition: lights change, the framing shifts. |
| `CONSOLIDATE` | *"Re-verifying a system you already restored"* — a callback to an earlier beat. |

**The framing rule:** `EASIER` must never read as a demotion and `HARDER` must never read as a
punishment. `EASIER` is *rerouting*; `HARDER` is *promotion*. Adaptive systems fail learners
emotionally far more often than they fail them pedagogically, and the wording is where that happens.

**`EXPLAIN` is the emotional centre of the design.** The station replaying the learner's own faulty
reasoning back to them — *"you treated the three as if it only reached the first term; here is what
that did"* — is a moment no fixed sequence can produce, and it is the moment to land in the demo.

---

## 5. Authoring budget

| Asset | Count | Time |
|---|---|---|
| Beat narratives | 24 (8 x 3) | 90 min |
| Success/failure consequences | 48 | 30 min |
| Teach + revise payloads | 20 | 45 min |
| Misconception remedies (contrast cases) | 8 | 45 min |
| Hint ladders | 84 | 60 min |
| Opening, pre-test, post-test, and ending copy | ~10 | 20 min |
| **Total** | **~250 assets** | **~5 hours, two people in parallel = 2.5 h wall clock** |

Authored in Hours 2–6, frozen at Hour 8. Prose quality may be improved after the freeze; **counts and
structure may not change**, because the item IDs, narrative slots, and branch IDs are referenced by
the seeder, the tests, and the demo fixtures.

---

## 6. Optional local-LLM rewording (off by default)

Behind `LOOM_NARRATIVE_LLM=off` ([`Contract.md`](./Contract.md) C3.2–C3.4):

- **Permitted:** taking an already-selected, pre-authored string and rewording it for tone.
- **Forbidden:** generating an item, a distractor, a hint, an explanation, or *any* selection.
- **Never sees:** `LearnerState`, mastery values, misconception beliefs, or the candidate set.
- **Logged:** every call to `app.llm_calls`, visible on the Model Health panel.

**It is off during the demo**, and the empty `llm_calls` table is part of the pitch. The feature exists
to show we understood exactly where the line is — and then chose to stay well behind it.

---

## 7. Accessibility and tone

| Rule | Reason |
|---|---|
| Every equation is rendered as both LaTeX and a plain-text fallback | Screen readers, and projector rendering failures. |
| Colour is never the only signal | Correct/incorrect also carry an icon and a word. |
| Narrative text stays under 60 words per beat | It is a maths session with a story, not a novel with maths. |
| No timers, no streaks, no loss of progress | Time pressure corrupts the response-time signal M7 depends on, and punishes the P2 Deliberator profile. |
| The station is never disappointed in the learner | Failure is a system state, never a character judgement. |

---

## 8. Why the narrative earns its place in the score

Innovation and demo quality is 5% of the rubric, but the story's real contribution is larger and
indirect:

1. **It makes `BRANCH` a real action.** Without a story, "branch" is meaningless and the PS's own
   action list has a hole in it.
2. **It makes the budget legible.** Reserve power is understood instantly; "100 utility units" is not.
3. **It makes the demo watchable.** A judge watching a learner restore a station remembers it. A judge
   watching a quiz remembers nothing.
4. **It makes `EASIER` humane.** Rerouting to a secondary system is a story beat. "Here is an easier
   question" is a verdict.
