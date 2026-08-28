import os
import json
from fastapi import APIRouter

router = APIRouter(prefix="/api/models", tags=["models"])

META_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "artifacts", "model_metadata.json")

@router.get("/status")
def get_models_status():
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, "r") as f:
                data = json.load(f)
            return {
                "status": "active",
                "loaded_models": list(data.get("models", {}).keys()),
                "metadata": data,
            }
        except Exception as e:
            return {"status": "degraded", "error": str(e)}
    return {
        "status": "baseline_active",
        "loaded_models": ["knowledge_state_bkt", "difficulty_irt", "action_ranker_utility", "trajectory_growth"],
    }
