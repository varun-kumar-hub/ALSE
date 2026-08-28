from fastapi import APIRouter, HTTPException
from models.schemas import LearningEvent, AdaptiveDecisionResponse
from services.adaptive_engine import AdaptiveLearningEngine

router = APIRouter(prefix="/api/learning", tags=["learning"])
engine = AdaptiveLearningEngine()

@router.post("/events", response_model=AdaptiveDecisionResponse)
def record_learning_event(event: LearningEvent):
    try:
        res = engine.process_learning_event(event.dict())
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process learning event: {str(e)}")
