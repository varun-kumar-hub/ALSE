import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

class ConceptMasteryPredictor:
    """
    Predicts concept mastery level incorporating correctness, difficulty,
    recency, explanation quality, problem solving, and confidence.
    """
    def __init__(self):
        self.model = GradientBoostingRegressor(n_estimators=20, max_depth=3, random_state=42)
        # Train baseline dummy model
        X_train = np.array([
            [0.0, 0.5, 0.0, 0.0, 0.0, 0], # beginner
            [0.5, 0.6, 0.5, 0.6, 0.5, 0], # intermediate
            [0.9, 0.8, 0.9, 0.9, 0.9, 0], # advanced
            [0.3, 0.9, 0.2, 0.3, 0.3, 1]  # struggling with misconceptions
        ])
        y_train = np.array([0.15, 0.52, 0.94, 0.25])
        self.model.fit(X_train, y_train)

    def predict_mastery(self, correctness: float, task_difficulty: float, consistency: float,
                        explanation_quality: float, confidence: float, active_misconceptions: int) -> float:
        features = np.array([[correctness, task_difficulty, consistency, explanation_quality, confidence, float(active_misconceptions)]])
        pred = float(self.model.predict(features)[0])
        return round(float(np.clip(pred, 0.0, 1.0)), 3)
