import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ml.knowledge_state import KnowledgeStateEstimator
from ml.mastery_predictor import ConceptMasteryPredictor
from ml.misconception_detector import MisconceptionDetector
from ml.difficulty_estimator import DifficultyEstimator
from ml.learning_gain_predictor import LearningGainPredictor
from ml.action_ranker import ActionRanker

app = FastAPI(title="LearnForge PS6 ML Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate models
knowledge_estimator = KnowledgeStateEstimator()
mastery_predictor = ConceptMasteryPredictor()
misconception_detector = MisconceptionDetector()
difficulty_estimator = DifficultyEstimator()
gain_predictor = LearningGainPredictor()
action_ranker = ActionRanker()

# Request Models
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

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "LearnForge PS6 ML Engine",
        "models_loaded": ["knowledge_state", "mastery_predictor", "misconception_detector", "difficulty_estimator", "learning_gain", "action_ranker"]
    }

@app.post("/api/ml/estimate_state")
def estimate_learner_state(req: EstimateStateRequest):
    proficiency = knowledge_estimator.estimate_proficiency(
        req.correctness, req.recency_factor, req.explanation_quality, req.hint_count
    )
    misc_res = misconception_detector.detect(
        req.confidence, req.correctness, req.repeated_error_count
    )
    mastery = mastery_predictor.predict_mastery(
        req.correctness, req.task_difficulty, req.recency_factor,
        req.explanation_quality, req.confidence, 1 if misc_res["has_misconception"] else 0
    )
    opt_diff = difficulty_estimator.estimate_optimal_difficulty(proficiency, req.correctness)

    return {
        "proficiency": proficiency,
        "mastery": mastery,
        "misconception": misc_res,
        "optimal_difficulty": opt_diff
    }

@app.post("/api/ml/predict_gain")
def predict_learning_gain(req: PredictGainRequest):
    gain = gain_predictor.predict_gain(
        req.current_mastery, req.task_difficulty, req.action_type, req.has_misconception
    )
    return {"action_type": req.action_type, "predicted_gain": gain}

@app.post("/api/ml/rank_actions")
def rank_candidate_actions(req: RankActionsRequest):
    ranked = action_ranker.rank_candidate_actions(
        req.concept, req.current_mastery, req.learner_ability,
        req.has_misconception, req.budget_remaining, req.candidate_actions
    )
    selected = ranked[0] if ranked else None
    return {
        "concept": req.concept,
        "budget_remaining": req.budget_remaining,
        "selected_intervention": selected,
        "all_ranked_candidates": ranked
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
