import numpy as np
from sklearn.linear_model import LogisticRegression

class KnowledgeStateEstimator:
    """
    Estimates current learner knowledge state across concepts
    using response history, correctness, and recency weighting.
    """
    def __init__(self):
        self.model = LogisticRegression()
        # Synthetic baseline fit for initialization
        X_dummy = np.array([
            [0.1, 1.0, 0.2, 0],
            [0.9, 0.1, 0.9, 1],
            [0.5, 0.5, 0.5, 1],
            [0.2, 0.8, 0.3, 0]
        ])
        y_dummy = np.array([0, 1, 1, 0])
        self.model.fit(X_dummy, y_dummy)

    def estimate_proficiency(self, correctness: float, recency_factor: float, explanation_quality: float, hint_count: int) -> float:
        """
        Returns estimated probability of concept proficiency in [0.0, 1.0].
        """
        features = np.array([[correctness, recency_factor, explanation_quality, float(hint_count)]])
        prob = float(self.model.predict_proba(features)[0][1])
        # Smooth with prior
        return round(float(np.clip(prob, 0.05, 0.98)), 3)
