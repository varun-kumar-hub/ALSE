import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.learning import router as learning_router
from api.routes.learner import router as learner_router
from api.routes.interventions import router as interventions_router
from api.routes.analytics import router as analytics_router
from api.routes.models import router as models_router

app = FastAPI(
    title="LearnForge Adaptive Learning Engine",
    description="Production-grade AI Adaptive Learning Backend with Bayesian Knowledge Tracing, IRT Difficulty, and Multi-Factor Intervention Ranking.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modern modular API routes
app.include_router(learning_router)
app.include_router(learner_router)
app.include_router(interventions_router)
app.include_router(analytics_router)
app.include_router(models_router)

from services.adaptive_engine import AdaptiveLearningEngine
from pydantic import BaseModel
from typing import List, Optional

engine = AdaptiveLearningEngine()

class EstimateStateRequest(BaseModel):
    correctness: float = 0.5
    recency_factor: float = 1.0
    explanation_quality: float = 0.5
    hint_count: int = 0
    task_difficulty: float = 0.5
    confidence: float = 0.5
    repeated_error_count: int = 0

class PredictGainRequest(BaseModel):
    current_mastery: float
    task_difficulty: float
    action_type: str
    has_misconception: bool = False

class RankActionsRequest(BaseModel):
    concept: str
    current_mastery: float = 0.2
    learner_ability: float = 0.5
    has_misconception: bool = False
    budget_remaining: int = 10
    candidate_actions: List[str] = [
        "REVISION", "NEW_CONCEPT", "HINT", "EXPLANATION",
        "EASIER_CHALLENGE", "HARDER_CHALLENGE", "SCENARIO_BRANCH",
        "MISCONCEPTION_REMEDIATION", "PREREQUISITE_REVIEW"
    ]

# Backwards compatible legacy routes
@app.post("/api/ml/estimate_state")
def legacy_estimate_state(req: EstimateStateRequest):
    bkt = engine.knowledge_estimator.update_state(
        prior_mastery=0.30,
        correct=req.correctness >= 0.5,
        question_difficulty=req.task_difficulty,
        hint_used=req.hint_count > 0,
    )
    misc = engine.misconception_detector.evaluate_misconception(
        concept_id="general",
        concept_name="General",
        recent_correctness=[req.correctness >= 0.5],
        repeated_error_count=req.repeated_error_count,
        confidence=req.confidence,
    )
    diff = engine.difficulty_estimator.estimate_optimal_difficulty(
        learner_mastery=bkt["mastery_score"],
        has_misconception=misc["has_misconception"],
    )
    return {
        "proficiency": bkt["mastery_score"],
        "mastery": bkt["mastery_score"],
        "misconception": {
            "has_misconception": misc["has_misconception"],
            "probability": misc["probability"],
            "status": "active" if misc["has_misconception"] else "none",
            "severity": misc["severity"].lower(),
        },
        "optimal_difficulty": diff["recommended_difficulty"],
    }

@app.post("/api/ml/predict_gain")
def legacy_predict_gain(req: PredictGainRequest):
    res = engine.gain_predictor.predict_gain(
        current_mastery=req.current_mastery,
        task_difficulty=req.task_difficulty,
        action_type=req.action_type,
        has_misconception=req.has_misconception,
    )
    return {"action_type": req.action_type, "predicted_gain": res["predicted_gain"]}

@app.post("/api/ml/rank_actions")
def legacy_rank_actions(req: RankActionsRequest):
    ranked = engine.action_ranker.rank_interventions(
        concept=req.concept,
        current_mastery=req.current_mastery,
        learner_ability=req.learner_ability,
        has_misconception=req.has_misconception,
        candidate_actions=req.candidate_actions,
    )
    candidates = [
        {
            "action": a["action"],
            "predicted_gain": a["predicted_gain"],
            "cost": a["cost"],
            "utility": a["utility"],
            "target_difficulty": req.learner_ability,
            "reason": f"Ranked #{i+1} by ML Utility Engine",
        }
        for i, a in enumerate(ranked["ranked_actions"])
    ]
    return {
        "concept": req.concept,
        "budget_remaining": req.budget_remaining,
        "selected_intervention": candidates[0] if candidates else None,
        "all_ranked_candidates": candidates,
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "LearnForge Adaptive Learning Engine",
        "version": "1.0.0",
        "engine": "active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

