# API Contract

**Base:** `/api/v1` · **Transport:** JSON over HTTP, plus one WebSocket channel
**Errors:** RFC 7807 `application/problem+json`
**Auth:** none — LOOM is a single-learner prototype with no accounts
([`PRD.md`](./PRD.md) N2)

All payloads are Pydantic v2 models ([`Contract.md`](./Contract.md) C10.3). The OpenAPI schema at
`/openapi.json` generates the typed frontend client, so the contract below and the client cannot
drift.

---

## 1. Sessions

### `POST /api/v1/sessions`
Start a session.

```json
// request
{
  "actor_kind": "human",
  "policy_id": "LOOM",
  "branch_id": "applied",
  "energy_total": 100,
  "interactions_total": 25,
  "learner_seed": null
}
```

```json
// 201 response
{
  "session_id": "0f9c...",
  "step": 0,
  "status": "active",
  "budget": {"energy_remaining": 100.0, "energy_total": 100.0,
             "interactions_remaining": 25, "interactions_total": 25},
  "beat": {
    "node_id": "beat_01", "beat_index": 1, "branch_id": "applied",
    "title": "Airlock Diagnostic",
    "narrative_md": "The dock seals behind you...",
    "objective": "Bring the airlock diagnostic online.",
    "phase": "pretest"
  },
  "model_version_set": {"M1":"1.2.0","M2":"1.1.0","M3":"1.3.0","M4":"1.0.1",
                        "M5":"1.2.0","M6":"1.0.0","M7":"1.0.0","M8":"1.0.0"}
}
```

`model_version_set` is returned so any client-side capture is self-describing for reproducibility
([`Contract.md`](./Contract.md) C7.1).

---

### `POST /api/v1/sessions/{id}/respond`
The core endpoint. One call per learner response: state update, decision, and next beat.

```json
// request
{ "item_id": "IT-C7-02", "chosen_option_id": "B", "response_time_ms": 14200, "hints_used": 1 }
```

```json
// 200 response
{
  "step": 8,
  "feedback": {
    "is_correct": false,
    "correct_option_id": "A",
    "narrative_consequence": "The throttle holds. A warning light stays amber.",
    "explanation_md": "..."
  },
  "state_delta": {
    "weighted_mastery": {"before": 0.412, "after": 0.398},
    "concepts_changed": [
      {"concept_id": "C7", "before": 0.44, "after": 0.31, "variance": 0.021}
    ],
    "misconceptions_changed": [
      {"misconception_id": "M3", "before": 0.52, "after": 0.71, "crossed_threshold": true}
    ],
    "engagement": 0.62
  },
  "decision": {
    "step": 8,
    "selected": {"type": "EXPLAIN", "params": {"misconception_id": "M3"}, "cost": 9.0},
    "utility": 0.01254,
    "predicted_gain": 0.0829,
    "exploration_value": 0.0,
    "risk_value": 0.041,
    "trigger_fired": "T1",
    "candidates_count": 9,
    "decision_ms": 118,
    "rationale": {
      "headline": "Remediating partial distribution before advancing.",
      "because": [
        "P(M3) rose to 0.71 after two distractor matches on IT-C7-02 and IT-C7-03.",
        "Trigger T1 fired: misconception confirmed.",
        "Predicted weighted mastery gain 0.083 at cost 9 gives utility 0.0125.",
        "Runner-up HARDER(C7) scored 0.0078: gain 0.061 but risk 0.34, because P(correct) is 0.21 while M3 is active."
      ],
      "counterfactual": {
        "action": {"type": "HARDER", "params": {"concept_id": "C7"}},
        "predicted_wm_after_2_steps": 0.512,
        "selected_predicted_wm_after_2_steps": 0.547
      },
      "models_consulted": ["M1@1.2.0","M2@1.1.0","M3@1.3.0","M4@1.0.1","M5@1.2.0","M6@1.0.0"]
    }
  },
  "beat": {
    "node_id": "beat_05", "branch_id": "applied",
    "title": "Flight Recorder Analysis",
    "narrative_md": "The station replays your reasoning...",
    "payload_type": "explanation",
    "payload": {
      "misconception_id": "M3",
      "misconception_name": "Partial Distribution",
      "contrast_md": "You applied the 3 to x but not to 4. Here is what that does..."
    }
  },
  "budget": {"energy_remaining": 43.0, "interactions_remaining": 11}
}
```

**Errors**

| Status | Type | When |
|---|---|---|
| 409 | `session-not-active` | Session already completed or abandoned. |
| 422 | `item-not-open` | `item_id` is not the currently open item. |
| 422 | `option-invalid` | `chosen_option_id` not on that item. |
| 500 | `insufficient-candidates` | Fewer than 3 candidates after relaxation — a defect ([`Contract.md`](./Contract.md) C5.2). |

---

### `GET /api/v1/sessions/{id}`
Session header: status, step, budget, current beat. Used by F7 resume.

### `GET /api/v1/sessions/{id}/state`
The full believed learner state — the Mastery Graph panel's source.

```json
{
  "step": 8,
  "weighted_mastery": 0.398,
  "weighted_mastery_lcb": 0.331,
  "theta": -0.42,
  "concepts": [
    {"concept_id":"C1","name":"Variables & Expressions","mean":0.86,"variance":0.008,
     "n_evidence":4,"status":"mastered","prerequisites_met":true},
    {"concept_id":"C7","name":"Distributive Property","mean":0.31,"variance":0.021,
     "n_evidence":3,"status":"struggling","prerequisites_met":true,
     "blocking_misconception":"M3"}
  ],
  "misconceptions": [
    {"misconception_id":"M3","name":"Partial Distribution","posterior":0.71,
     "evidence_count":2,"status":"confirmed","remediated_at_step":null}
  ],
  "engagement": {"level":0.62,"gaming_prob":0.11,"fatigue":0.28,"label":"engaged"},
  "archetype": {"top":"P5","posterior":{"P5":0.41,"P4":0.22,"P2":0.14,"P1":0.09,
                                        "P3":0.07,"P6":0.04,"P7":0.03}}
}
```

### `GET /api/v1/sessions/{id}/trace`
The trajectory — one row per step, from `app.v_session_trajectory`. Feeds the Trajectory and
Difficulty panels.

### `GET /api/v1/sessions/{id}/decisions/{step}`
**The explainability endpoint (F2).** Decision plus the full candidate table.

```json
{
  "step": 8,
  "selected_rank": 1,
  "trigger_fired": "T1",
  "policy_modulation": {"alpha":0.85,"beta":0.15,"gamma":0.30,
                        "action_bonuses":{"EXPLAIN":0.25}},
  "candidates": [
    {"rank":1,"action":{"type":"EXPLAIN","params":{"misconception_id":"M3"}},
     "cost":9.0,"predicted_gain_model":0.0791,"predicted_gain_rollout":0.0854,
     "exploration_value":0.0,"risk_value":0.041,"ranker_score":0.88,
     "utility":0.01254,"selected":true},
    {"rank":2,"action":{"type":"HARDER","params":{"concept_id":"C7"}},
     "cost":8.0,"predicted_gain_model":0.0612,"predicted_gain_rollout":0.0588,
     "exploration_value":0.0233,"risk_value":0.341,"ranker_score":0.61,
     "utility":0.00780,"selected":false}
  ],
  "ranker_disagreement": false
}
```

### `GET /api/v1/sessions/{id}/projection`
Predicted final mastery under the remaining budget, with a confidence band. Feeds the Projection
panel. Produced by rolling the agent's forward model forward under the current policy, 64 samples.

### `GET /api/v1/sessions/{id}/outcome`
Pre-test vs post-test per concept. Feeds the Before/After panel. `404` until the post-test completes.

### `POST /api/v1/sessions/{id}/hint`
Learner-requested hint. Recorded as an *observation*, not an agent action
([`Contract.md`](./Contract.md) C6.8):

- **Costs energy** at the `HINT` rate.
- Does **not** consume an interaction.
- Does **not** trigger a new agent decision. The response carries the hint text and the learner
  returns to the same open item.
- Feeds M7's `hint_reliance` and discounts the mastery credit of a subsequent correct answer.

Asking for help is not the tutor making a move, and modelling it that way keeps the agent's turn
structure clean. The distinction is visible in the trace and in M7's features.

---

## 2. Content

| Endpoint | Returns |
|---|---|
| `GET /api/v1/concepts/graph` | 10 concepts, 15 edges with `tau`, weights, depths. Feeds the React Flow graph. |
| `GET /api/v1/misconceptions` | The 8-misconception taxonomy with plain-language descriptions. |
| `GET /api/v1/items/{id}` | Item with options, hints, and explanation. Correct answer omitted while the item is open in an active session. |
| `GET /api/v1/items/diagnostics` | Curriculum Designer view: authored vs estimated `b`, discrimination, infit, misconceptions caught. |
| `GET /api/v1/story/graph` | Beat and branch structure. |

---

## 3. Experiments

### `POST /api/v1/sim/cohort`

```json
{
  "name": "headline",
  "n_learners": 900,
  "seeds": [9001, 9002, 9003, 9004, 9005],
  "policies": ["LOOM", "B0", "B1", "B2", "B3"],
  "profile_mix": "stratified",
  "detail_sample_rate": 0.05
}
```
→ `202 {"experiment_id": "...", "status": "running", "total_runs": 22500}`

### `GET /api/v1/experiments/{id}/status`
→ `{"status":"running","completed":8420,"total":22500,"eta_seconds":214}`

### `GET /api/v1/experiments/{id}/results`

```json
{
  "experiment_id": "...", "n_learners": 900, "seeds": [9001,"..."],
  "primary_metric": "mastery_gain_per_100_energy",
  "policies": [
    {"policy_id":"LOOM","mean":0.284,"sd":0.091,"n":4500,
     "ci_low":0.281,"ci_high":0.287},
    {"policy_id":"B2","mean":0.216,"sd":0.088,"n":4500,
     "ci_low":0.213,"ci_high":0.219},
    {"policy_id":"B0","mean":0.191,"sd":0.079,"n":4500,
     "ci_low":0.188,"ci_high":0.194}
  ],
  "headline": {
    "comparison":"LOOM vs B0","relative_improvement":0.487,
    "absolute_improvement":0.093,"ci_low":0.088,"ci_high":0.098,
    "p_value":1.2e-41,"test":"Welch t-test on run-level metric"
  }
}
```

*(Values are the response shape, not results. Real numbers come from the run.)*

| Endpoint | Returns |
|---|---|
| `GET /api/v1/experiments/{id}/by-profile` | The same comparison split across the 7 profiles. |
| `GET /api/v1/experiments/{id}/ablations` | One row per ablated component with delta and CI. |
| `GET /api/v1/experiments/{id}/action-mix` | Action mix by policy and profile — the sensitivity heatmap. |
| `GET /api/v1/experiments/{id}/calibration` | Estimated vs true mastery, ECE, Brier, from materialised `run_metrics`. |

---

## 4. Models

### `GET /api/v1/models`

```json
{
  "models": [
    {"id":"M3","name":"Misconception Detector","version":"1.3.0",
     "family":"multinomial logistic + Bayesian accumulator",
     "is_required":true,"trained_at":"...","training_rows":85210,
     "metrics":[{"metric":"macro_f1","value":0.734,"baseline":0.31,"split":"holdout"},
                {"metric":"false_positive_rate","value":0.094,"split":"holdout"}]}
  ],
  "ranker_disagreement_rate": 0.163,
  "llm_calls_total": 0
}
```

`llm_calls_total: 0` is deliberately part of this payload. It is the machine-readable form of the AI
policy claim, and the Model Health panel displays it prominently
([`Contract.md`](./Contract.md) C3.3).

---

## 5. WebSocket

### `WS /ws/sessions/{id}`
Live agent trace for the Agent Console. Server-push only; the client sends nothing but a heartbeat.

```json
{"type":"state_update","step":8,"weighted_mastery":0.398,
 "concepts_changed":[{"concept_id":"C7","delta":-0.13}]}

{"type":"candidates_generated","step":8,"count":9,
 "actions":["EXPLAIN(M3)","HARDER(C7)","EASIER(C7)","REVISE(C6)","..."]}

{"type":"scoring_complete","step":8,
 "top3":[{"action":"EXPLAIN(M3)","utility":0.01254},
         {"action":"HARDER(C7)","utility":0.00780},
         {"action":"REVISE(C6)","utility":0.00701}]}

{"type":"trigger_fired","step":8,"trigger":"T1",
 "message":"Misconception confirmed: partial distribution (P=0.71)."}

{"type":"decision","step":8,"selected":"EXPLAIN(M3)","decision_ms":118}
```

Emitting the phases **separately** is a deliberate design choice: the console shows candidates
appearing, then scores landing, then the decision. A judge watching that sequence sees the loop
happen rather than being told about it.

### `WS /ws/experiments/{id}`
Progress frames for long cohort runs.

---

## 6. Conventions

| | |
|---|---|
| **IDs** | Sessions and experiments are UUIDv4. Concepts, misconceptions, and items are stable human-readable strings (`C7`, `M3`, `IT-C7-02`) — they appear in charts, logs, and conversation. |
| **Numbers** | Probabilities and masteries are floats in `[0,1]` at 4 dp. `theta` and IRT `b` are on a logit scale, roughly `[-3,3]`. |
| **Time** | Server time is UTC ISO-8601. `response_time_ms` is client-measured and capped server-side at the 99th percentile before it reaches M7. |
| **Nulls** | A model that has not produced a value yet returns `null`, never `0`. `0` and "unknown" are different states and conflating them would corrupt the panels. |
| **Errors** | RFC 7807. Every problem response carries `type`, `title`, `detail`, and `session_id` where relevant. |
| **Versioning** | `/api/v1`. No breaking changes after Hour 40. |
| **Caching** | Content endpoints are immutable per deploy and carry `Cache-Control: max-age=3600`. Session endpoints are `no-store`. |
