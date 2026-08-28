from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.adaptive_engine import AdaptiveLearningEngine

router = APIRouter(prefix="/api/adaptive", tags=["adaptive"])
engine = AdaptiveLearningEngine()

class NextActionRequest(BaseModel):
    learner_id: str = "default_learner"
    concept_id: str
    current_mastery: Optional[float] = None
    has_misconception: Optional[bool] = None

class RecommendRequest(BaseModel):
    learner_id: str = "default_learner"
    concept_id: str
    candidate_actions: Optional[List[str]] = None

@router.post("/next-action")
def determine_next_action(req: NextActionRequest):
    mastery_rec = engine.repo.get_mastery(req.learner_id, req.concept_id)
    current_m = req.current_mastery if req.current_mastery is not None else (mastery_rec["mastery_score"] if mastery_rec else 0.35)
    
    events = engine.repo.get_events_for_learner(req.learner_id, req.concept_id)
    recent_actions = [e.get("intervention", "") for e in events[-5:]]
    has_misc = req.has_misconception if req.has_misconception is not None else any(
        m.get("has_misconception") for m in engine.repo.get_all_misconceptions(req.learner_id) if m.get("concept_id") == req.concept_id
    )

    diff_res = engine.difficulty_estimator.estimate_optimal_difficulty(
        learner_mastery=current_m,
        has_misconception=has_misc,
    )

    rank_res = engine.action_ranker.rank_interventions(
        concept=req.concept_id,
        current_mastery=current_m,
        learner_ability=diff_res["expected_success_probability"],
        has_misconception=has_misc,
        recent_actions=recent_actions,
    )

    return {
        "concept_id": req.concept_id,
        "current_mastery": current_m,
        "difficulty": diff_res,
        "decision": {
            "action": rank_res["selected_action"],
            "expected_gain": rank_res["expected_gain"],
            "confidence": rank_res["confidence"],
            "reasoning": rank_res["reasoning"],
        },
        "ranked_actions": rank_res["ranked_actions"],
    }

@router.post("/recommend")
def recommend_ranked_interventions(req: RecommendRequest):
    mastery_rec = engine.repo.get_mastery(req.learner_id, req.concept_id)
    current_m = mastery_rec["mastery_score"] if mastery_rec else 0.40
    events = engine.repo.get_events_for_learner(req.learner_id, req.concept_id)
    recent_actions = [e.get("intervention", "") for e in events[-5:]]

    rank_res = engine.action_ranker.rank_interventions(
        concept=req.concept_id,
        current_mastery=current_m,
        learner_ability=0.75,
        recent_actions=recent_actions,
        candidate_actions=req.candidate_actions or engine.action_ranker.ALL_ACTIONS if hasattr(engine.action_ranker, 'ALL_ACTIONS') else [
            "NEW_CONCEPT", "PRACTICE", "REVISION", "HINT", "EXPLANATION",
            "WORKED_EXAMPLE", "EASIER_QUESTION", "SIMILAR_QUESTION", "HARDER_QUESTION",
            "PREREQUISITE_REVIEW", "SCENARIO_CHALLENGE"
        ],
    )
    return rank_res
