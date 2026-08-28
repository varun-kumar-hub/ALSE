from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from services.adaptive_engine import AdaptiveLearningEngine

router = APIRouter(prefix="/api/learner", tags=["learner"])
engine = AdaptiveLearningEngine()

@router.get("/{learner_id}/state")
def get_learner_state(learner_id: str):
    masteries = engine.repo.get_all_masteries(learner_id)
    misconceptions = engine.repo.get_all_misconceptions(learner_id)
    events = engine.repo.get_events_for_learner(learner_id)
    return {
        "learner_id": learner_id,
        "masteries": masteries,
        "misconceptions": misconceptions,
        "total_events": len(events),
    }

@router.get("/{learner_id}/mastery")
def get_learner_mastery(learner_id: str):
    masteries = engine.repo.get_all_masteries(learner_id)
    return {"learner_id": learner_id, "concepts": masteries}

@router.get("/{learner_id}/misconceptions")
def get_learner_misconceptions(learner_id: str):
    misconceptions = engine.repo.get_all_misconceptions(learner_id)
    return {"learner_id": learner_id, "misconceptions": misconceptions}

@router.get("/{learner_id}/trajectory")
def get_learner_trajectory(learner_id: str):
    events = engine.repo.get_events_for_learner(learner_id)
    trajectory = [
        {
            "session": e.get("session_id", "Session"),
            "timestamp": e.get("timestamp"),
            "concept_id": e.get("concept_id"),
            "mastery": e.get("mastery_score", 0.5),
            "difficulty": e.get("question_difficulty", 0.5),
            "intervention": e.get("intervention", "EXPLANATION"),
            "learning_gain": e.get("learning_gain", 0.05),
            "misconception_detected": bool(e.get("misconception_flag")),
        }
        for e in events
    ]
    return {"learner_id": learner_id, "trajectory": trajectory}
