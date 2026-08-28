# Demo Script

**Length:** 5 minutes presentation + Q&A. A 10-minute variant is in §4.
**Mode:** offline, local Postgres, pinned showcase sessions ([`User_Flow.md`](./User_Flow.md) F8).
**Rule:** nothing is live-random. Every session shown is a committed replay
([`Contract.md`](./Contract.md) C7.2).

---

## 0. Before you walk up

| # | Check |
|---|---|
| 1 | Wifi **off**. Prove to yourself it still works. |
| 2 | Local Postgres running; `make demo` serving; browser at `/session/SHOWCASE-A`. |
| 3 | Four showcase tabs pre-loaded: A, B, C(split with A), and `/lab`. |
| 4 | A terminal open at the repo root for the `psql` permission demo. |
| 5 | Display scaling set so numbers are legible from the back of the room. |
| 6 | Fallback video on the desktop and on a USB stick. |
| 7 | Printed [`Rubric_Mapping.md`](./Rubric_Mapping.md) handed to judges **before** you start. |
| 8 | Phone silenced. Screen sleep disabled. Notifications off. |

---

## 1. The 5-minute run of show

### 0:00–0:35 · The problem, and the one sentence that positions you

> "Conventional learning systems give every learner the same sequence. The hard part isn't content —
> it's the decision a good teacher makes every ninety seconds: revise or advance, hint or explain,
> harder or easier. And *is this worth the time it costs?*
>
> LOOM is a tutor that budgets its own attention. Eight team-built models, a planning agent, and a
> hard budget of a hundred units of learner attention."

Do **not** say "we built an AI tutor". Every team says that. Say "budgets its own attention".

---

### 0:35–1:40 · The hero moment — the backwards walk

Open **SHOWCASE-A** (P5 Cracked Foundation, LOOM). Play from step 6. Agent Console visible.

> "This learner looks strong on the surface — they're handling two-step equations. Watch what happens
> when they hit variables on both sides."

Let it run to the T3 trigger. Point at the console as the frames land:

```
step 11  ── TRIGGER ──
         T3 prerequisite gap: C8 blocked by C3 (0.31)
step 11  ── GENERATE ──
         action space restricted to ancestors of C8
step 11  ── DECIDE ──
         REVISE(C3) · 94ms
```

> "It failed twice on C8. Rather than drilling C8 harder — which is what a threshold system does — it
> checked upstream, found the balance model at 0.31, and **went backwards**."

Point at P1 as the focus marker travels down the DAG.

> "That's four models talking to each other: the state estimator flagged the gap, the mastery
> predictor said C8 was unreachable, the risk term priced the failure, and the planner found that
> spending ten units on C3 now returns more than twenty units on C8 ever will."

**This is the moment the demo is built around. Do not rush it.**

---

### 1:40–2:30 · Explainability — "why not something else?"

Click step 11 on the trajectory. Open the candidate table.

> "Every decision stores everything it considered. Nine candidates here. Each scored on predicted
> gain, information value, risk, and cost."

Toggle the counterfactual.

> "The runner-up was HARDER on C8. Had it chosen that, our forward model projects 0.512 weighted
> mastery two steps out, versus 0.547 for what it actually did. That comparison is stored, not
> reconstructed."

Tap the model chips.

> "Six models were consulted for that one decision, and their versions are stamped on it."

---

### 2:30–3:10 · The misconception story

Switch to **SHOWCASE-B** (P4 Anchored, M3). Open P2 Misconception Map.

> "Different learner. Watch this band."

Trace it with a finger: rising → EXPLAIN marker → falling.

> "Partial distribution — applying the multiplier to only the first term inside a bracket. The belief
> crosses 0.65 at step 8. The agent spends nine units on a contrast case: it replays the learner's own
> reasoning and shows where it diverged. Then — and this is the part that matters — it **verifies**.
> Step 12 is an item that would have caught that error. They get it right. The belief collapses."

> "Detect. Remediate. Verify. A fixed sequence can't do any of the three, because it never knew
> *which* rule was broken."

---

### 3:10–4:10 · The evidence

Switch to **`/lab`**. Panel P8.

> "Nine hundred simulated learners, five seeds, four and a half thousand paired runs per policy.
> Same learners, same items, same budget — only the decision rule changes."

Read the headline off the screen. Then immediately:

> "Note the third bar. That's a mastery-threshold heuristic — three-correct-then-advance, the rule most
> real adaptive systems actually use. We tuned it with the same care we tuned ourselves. It's the
> honest competitor, and beating it is the number that means something."

Switch the metric selector to `items_attempted`.

> "And here we lose. The threshold system gets through more items than we do. It just learns less per
> unit of attention. We show both."

Open the per-profile view.

> "This is the result, not the average. Our margin is smallest on already-strong learners — as it
> should be, they need less help — and largest on the two profiles a fixed sequence structurally
> cannot serve: prerequisite gaps and entrenched misconceptions."

---

### 4:10–4:45 · The credibility close

Open panel **P9 Calibration**.

> "One more thing, because it's the question you should be asking. We wrote the simulator. So how do
> you know we didn't build a world designed to make us win?"

Switch to the terminal:

```bash
psql "$LOOM_APP_DATABASE_URL" -c "SELECT count(*) FROM sim.learner_truth;"
```

```
ERROR:  permission denied for schema sim
```

> "Ground truth lives in a database schema our application role has no grant on. The agent physically
> cannot read the answer key. The simulator and our estimator are different model families — the agent
> can't even represent what the simulator does."

Back to P9.

> "And here's how wrong we are anyway. Mean absolute error 0.11 against ground truth. We publish that,
> because a system claiming perfect knowledge of a hidden state is claiming something impossible."

---

### 4:45–5:00 · Close

> "Eight team-built components. No hosted LLM anywhere in the decision path — that counter reads zero
> and it's queryable. Every decision reproducible from a seed.
>
> Not a chatbot with a quiz attached. A planner that decides what's worth a learner's attention, and
> shows its work."

---

## 2. If something breaks

| Failure | Recovery |
|---|---|
| A panel errors | Switch tabs. All four showcase tabs are pre-loaded and independent. |
| The backend dies | `make demo` in the spare terminal — 8 seconds. Keep talking. |
| The database is unreachable | Fallback video. Narrate over it; the script is unchanged. |
| The laptop dies | USB stick to a teammate's machine. Snapshot + repo are on it. |
| You are cut short at 3 minutes | Do 0:00–0:35, 0:35–1:40, then jump to 3:10–4:10. The hero moment and the evidence. |
| A judge interrupts with a question | Answer it, then say "that's actually the next thing" and continue. Never defer twice. |

**Never debug live.** If something breaks, switch to the next artefact and keep moving. A five-minute
slot has no room for troubleshooting, and a judge remembers the flailing far longer than the bug.

---

## 3. Judge Q&A — prepared answers

### "How do you know this isn't circular? You wrote the simulator."
> "Four barriers. The simulator and our estimator are different model families — the agent uses
> discrete-state BKT, the simulator uses continuous latent ability with misconception interference;
> neither is a special case of the other. Parameters are drawn per learner and never exposed. There's
> an AST test in CI that fails the build if the agent module imports the simulator. And ground truth
> lives in a Postgres schema our app role has no grant on — I just showed you the permission error. On
> top of that, we publish our calibration error rather than hiding it."

### "Could an LLM just do this?"
> "It could produce plausible-sounding tutoring text. It couldn't maintain a calibrated posterior over
> ten concepts and eight misconceptions across twenty interactions, price nine candidate actions
> against a budget, and tell you *why* it chose one — with numbers you can audit. We have an LLM-only
> arm in our evaluation harness, run offline, precisely so we could test that rather than assert it."

### "Why not use a real dataset?"
> "We looked at ASSISTments and EdNet. Neither has per-response misconception labels or latent
> ground-truth mastery. Without ground truth we couldn't have shown you the calibration plot, and the
> misconception model — which is the most valuable component we have — would have had nothing to train
> on. We'd have had to author the taxonomy anyway. So we'd get realism we couldn't verify and lose the
> thing that makes our claim checkable."

### "Your baseline seems weak."
> "B0 is weak — it's the fixed sequence the problem statement asks us to beat. That's why we added
> three more. B2 is a tuned mastery-threshold heuristic, which is what most production adaptive systems
> actually do, and we tuned it on the same cohort with the same effort we gave our own parameters.
> B3 is our own system with the planner switched off, which isolates what the planning machinery is
> worth. The B2 and B3 numbers are the ones I'd judge us on."

### "What happens with a real student?"
> "We don't know, and we don't claim to. Every axis on those charts says 'simulated'. What we've
> established is narrower and actually answerable: given a stated learner model, does budget-aware
> planning with misconception diagnosis beat a fixed sequence and a threshold heuristic? Yes, with
> confidence intervals. The next step would be a small human pilot, and the calibration panel is
> exactly the instrument you'd use to check whether the model transfers."

### "How is this different from adaptive difficulty?"
> "Adaptive difficulty has one action — go easier or harder. We have nine, including remediating a
> *specific named misconception* and walking backwards through a prerequisite graph. Watch the action
> mix by profile" — open P10 — "on an anchored learner it's mostly EXPLAIN; on a prerequisite-gap
> learner it's REVISE on low-depth concepts; on a strong learner it's mostly HARDER. Adaptive
> difficulty can't produce that spread because it has nothing to spread across."

### "Which component matters most?"
> "The misconception detector. Ablating it costs us the most — it's the largest single bar on the
> ablation chart. Ablating the ranker costs almost nothing, about one percent, and we report that too.
> An ablation table where every component conveniently matters would be a table you shouldn't trust."

### "What would you do with another week?"
> "Three things, in order. A small human pilot to test whether the simulator's assumptions transfer.
> Off-policy evaluation so we could compare policies without re-simulating. And a proper POMDP
> treatment of the budget — our depth-2 lookahead is an engineering compromise and we've been explicit
> about that rather than calling it optimal."

### "Did you use AI to build this?"
> "To write code and prose, yes, like any team here. Nothing in the running system calls a hosted
> model — that `llm_calls` counter reads zero, and there's a test that fails the build if any module
> in the decision path imports a network client."

---

## 4. The 10-minute variant

Add, in this order:

| Minutes | Addition |
|---|---|
| +1:30 | **The A/B split view.** SHOWCASE-A beside SHOWCASE-C — same learner seed, LOOM vs fixed sequence, both trajectories advancing together. This is the single most persuasive artefact you have; if you get ten minutes, lead the evidence section with it. |
| +1:00 | **The ablation chart.** Walk the top three bars and the one near-zero bar. |
| +1:00 | **Panel P11 Model Health.** Eight cards, metrics beside baselines, the M6 disagreement rate, `llm_calls: 0`. |
| +1:00 | **Cold start (F5).** Steps 1–3 of any session: the exploration term dominating, the archetype posterior landing at step 3, the visible switch from diagnosis to instruction. |
| +0:30 | **Architecture slide.** One diagram: the eight components, the loop, and the two database roles. |

---

## 5. Presentation discipline

| Rule | Why |
|---|---|
| **Show, then explain.** Let the console frames land before narrating them. | Judges believe what they watch happen more than what they are told happened. |
| **Never read a slide.** | The dashboard is the slide. |
| **Say a number, then point at where it came from.** | Every claim should be checkable on screen within a second. |
| **State a limitation before they find one.** | The calibration panel and the `items_attempted` loss both do this. It costs nothing and buys everything. |
| **One person drives, one person talks.** | Nobody narrates while hunting for a tab. |
| **Practise the first 35 seconds until it is automatic.** | It is the only part you will deliver while nervous. |
| **Never say "we didn't have time to..."** | Say "we scoped that out deliberately — here is what we chose instead." Both are true; only one reads as judgement. |
