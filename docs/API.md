# LearnForge API Reference

The LearnForge ML & Adaptive Learning backend exposes high-performance REST endpoints built with FastAPI.

Base URL: `http://127.0.0.1:8000`

---

## 1. Learning Events & Orchestration

### `POST /api/learning/events`
Records a learner interaction, updates knowledge state via BKT, evaluates misconceptions, determines IRT difficulty, ranks next interventions, and persists state in SQLite.

**Request Body (`LearningEvent`)**:
```json
{
  "learner_id": "learner_123",
  "session_id": "session_1",
  "concept_id": "cpu_scheduling",
  "question_difficulty": 0.65,
  "correct": true,
  "response_time_ms": 14000,
  "attempt_number": 1,
  "hint_used": false,
  "explanation_used": false,
  "confidence": 0.85,
  "intervention": "PRACTICE"
}
```

**Response (`AdaptiveDecisionResponse`)**:
```json
{
  "concept_id": "cpu_scheduling",
  "concept_name": "Cpu Scheduling",
  "learner_state": {
    "mastery_score": 0.62,
    "confidence": 0.86,
    "mastery_level": "Intermediate",
    "evidence_count": 4,
    "learning_gain": 0.08
  },
  "misconception": {
    "has_misconception": false,
    "probability": 0.12,
    "severity": "NONE",
    "misconception_type": "none"
  },
  "difficulty": {
    "recommended_difficulty": 0.58,
    "difficulty_tier": "MEDIUM",
    "expected_success_probability": 0.74,
    "reason": "Calibrated to MEDIUM difficulty to target a productive 74% challenge zone."
  },
  "decision": {
    "action": "PRACTICE",
    "expected_gain": 0.09,
    "confidence": 0.88,
    "reasoning": [
      "Balanced progression (62% mastery).",
      "PRACTICE maximizes predicted learning velocity."
    ]
  },
  "ranked_actions": [ ... ]
}
```

---

## 2. Learner State & Mastery Telemetry

### `GET /api/learner/{learner_id}/state`
Returns the overall state including all mastered concepts, detected misconceptions, and event counts.

### `GET /api/learner/{learner_id}/mastery`
Returns the concept mastery matrix with scores, confidence, and mastery tiers (`Beginner`, `Developing`, `Intermediate`, `Proficient`, `Mastered`).

### `GET /api/learner/{learner_id}/misconceptions`
Returns active and suspected misconceptions with severity classifications.

### `GET /api/learner/{learner_id}/trajectory`
Returns time-series trajectory records of mastery, difficulty, and intervention points.

---

## 3. Analytics & Projections

### `GET /api/analytics/{learner_id}`
Assembles real telemetry data for the LearnForge Adaptive Dashboard:
- `overall_mastery`
- `mastery_graph`
- `misconception_map`
- `learning_trajectory`
- `chosen_interventions`
- `predicted_final_mastery`
- `before_after_outcomes`

### `GET /api/analytics/{learner_id}/predicted-mastery`
Returns asymptotic trajectory growth projection and estimated sessions required to reach $>85\%$ mastery.

---

## 4. Models Status

### `GET /api/models/status`
Returns loaded model artifact names, versions, training timestamps, and validation metrics.
