from fastapi import APIRouter
from services.adaptive_engine import AdaptiveLearningEngine

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
engine = AdaptiveLearningEngine()

@router.get("/{learner_id}")
def get_dashboard_analytics(learner_id: str):
    return engine.get_dashboard_analytics(learner_id)

@router.get("/{learner_id}/predicted-mastery")
def get_predicted_final_mastery(learner_id: str):
    analytics = engine.get_dashboard_analytics(learner_id)
    return analytics["predicted_final_mastery"]
