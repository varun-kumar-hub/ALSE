import os
import joblib
import numpy as np
from typing import Dict, Any, Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "artifacts", "learning_gain_predictor.joblib")

ACTION_ENCODING = {
    "EXPLANATION": 0,
    "HINT": 1,
    "WORKED_EXAMPLE": 2,
    "EASIER_QUESTION": 3,
    "SIMILAR_QUESTION": 4,
    "HARDER_QUESTION": 5,
    "REVISION": 6,
    "CONCEPT_RECAP": 7,
    "PRACTICE": 8,
    "SCENARIO_CHALLENGE": 9,
    "PREREQUISITE_REVIEW": 10,
}

class LearningGainPredictor:
    """
    Trained Regressor predicting continuous expected learning gains per intervention type.
    """

    def __init__(self):
        self.model = None
        self.version = "1.0.0"
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"[LearningGainPredictor] Model load error: {e}")
                self.model = None

    def predict_gain(
        self,
        current_mastery: float,
        task_difficulty: float,
        action_type: str,
        has_misconception: bool = False,
        learner_ability: float = 0.5,
    ) -> Dict[str, Any]:
        action_code = ACTION_ENCODING.get(action_type.upper(), 0)

        features = np.array([[
            current_mastery,
            task_difficulty,
            action_code,
            1.0 if has_misconception else 0.0,
            learner_ability,
        ]])

        if self.model is not None:
            try:
                pred = float(self.model.predict(features)[0])
                gain = round(max(0.01, min(0.35, pred)), 4)
            except Exception:
                gain = self._baseline_gain(action_type, current_mastery, has_misconception)
        else:
            gain = self._baseline_gain(action_type, current_mastery, has_misconception)

        return {
            "intervention": action_type,
            "predicted_gain": gain,
            "confidence": 0.85,
            "model_version": self.version,
        }

    def _baseline_gain(self, action: str, mastery: float, has_misconception: bool) -> float:
        act = action.upper()
        if has_misconception:
            if act in ["EXPLANATION", "WORKED_EXAMPLE", "MISCONCEPTION_REMEDIATION"]:
                return 0.14
            elif act == "PREREQUISITE_REVIEW":
                return 0.12
            elif act in ["HARDER_QUESTION", "SCENARIO_CHALLENGE"]:
                return 0.02
            return 0.06

        if mastery < 0.35:
            if act in ["WORKED_EXAMPLE", "EXPLANATION", "HINT"]:
                return 0.12
            return 0.05
        elif mastery > 0.70:
            if act in ["HARDER_QUESTION", "SCENARIO_CHALLENGE", "PRACTICE"]:
                return 0.11
            return 0.04
        return 0.08
