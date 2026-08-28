import numpy as np
from sklearn.linear_model import SGDClassifier

class MisconceptionDetector:
    """
    Detects active conceptual misconceptions based on error frequency,
    repeated error patterns, and response confidence vs correctness mismatch.
    """
    def __init__(self):
        self.clf = SGDClassifier(loss='log_loss', max_iter=1000, random_state=42)
        X_dummy = np.array([
            [0.9, 0.9, 0.0], # high confidence + high score = no misconception
            [0.8, 0.2, 0.9], # high confidence + low score = active misconception
            [0.3, 0.3, 0.4], # low confidence + low score = gap, not misconception
            [0.9, 0.1, 1.0]  # repeated error with high certainty = active misconception
        ])
        y_dummy = np.array([0, 1, 0, 1])
        self.clf.fit(X_dummy, y_dummy)

    def detect(self, confidence: float, correctness: float, repeated_error_count: int) -> dict:
        features = np.array([[confidence, correctness, float(repeated_error_count)]])
        prob = float(self.clf.predict_proba(features)[0][1])
        is_misconception = prob > 0.45
        
        status = "none"
        if is_misconception:
            status = "active" if repeated_error_count >= 2 or confidence > 0.7 else "suspected"
            
        return {
            "has_misconception": is_misconception,
            "probability": round(prob, 3),
            "status": status,
            "severity": "high" if (confidence > 0.8 and correctness < 0.3) else "medium" if is_misconception else "low"
        }
