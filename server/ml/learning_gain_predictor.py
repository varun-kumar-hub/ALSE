import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    XGBRegressor = None
    HAS_XGBOOST = False

class LearningGainPredictor:
    """
    Predicts expected learning gain delta_M = f(learner_state, concept, intervention, difficulty, history)
    using XGBoost / GradientBoosting.
    """
    def __init__(self):
        if HAS_XGBOOST and XGBRegressor is not None:
            self.model = XGBRegressor(n_estimators=30, max_depth=3, learning_rate=0.1, random_state=42, verbosity=0)
        else:
            self.model = GradientBoostingRegressor(n_estimators=30, max_depth=3, learning_rate=0.1, random_state=42)

        # Train baseline dummy model mapping (current_mastery, difficulty, action_type_id, misconception_flag) -> gain
        X_train = np.array([
            [0.1, 0.3, 8.0, 0], # NEW_CONCEPT at low mastery
            [0.1, 0.2, 2.0, 1], # MISCONCEPTION_REMEDIATION for active misconception
            [0.8, 0.9, 3.0, 0], # HARDER_CHALLENGE at high mastery
            [0.8, 0.2, 4.0, 0], # EASIER_CHALLENGE at high mastery (low gain)
            [0.2, 0.8, 3.0, 0]  # HARDER_CHALLENGE at low mastery (too hard, low gain)
        ])
        y_train = np.array([0.25, 0.35, 0.18, 0.05, 0.02])
        self.model.fit(X_train, y_train)

    def predict_gain(self, current_mastery: float, task_difficulty: float, action_type: str, has_misconception: bool) -> float:
        action_map = {
            "REVISION": 0.0,
            "EXPLANATION": 1.0,
            "MISCONCEPTION_REMEDIATION": 2.0,
            "HARDER_CHALLENGE": 3.0,
            "EASIER_CHALLENGE": 4.0,
            "HINT": 5.0,
            "SCENARIO_BRANCH": 6.0,
            "PREREQUISITE_REVIEW": 7.0,
            "NEW_CONCEPT": 8.0
        }
        action_id = action_map.get(action_type, 1.0)
        misc_flag = 1.0 if has_misconception else 0.0
        
        features = np.array([[current_mastery, task_difficulty, action_id, misc_flag]])
        predicted_gain = float(self.model.predict(features)[0])
        return round(float(np.clip(predicted_gain, 0.01, 0.50)), 3)

