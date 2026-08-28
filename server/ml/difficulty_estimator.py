import numpy as np

class DifficultyEstimator:
    """
    Item Response Theory (IRT) based difficulty estimator.
    Computes optimal challenge level theta for next activity.
    """
    def estimate_optimal_difficulty(self, learner_ability: float, recent_success_rate: float) -> float:
        # Zone of Proximal Development (ZPD) targeting ~70-75% expected success
        target_diff = learner_ability + (0.15 if recent_success_rate > 0.8 else -0.15 if recent_success_rate < 0.4 else 0.0)
        return round(float(np.clip(target_diff, 0.1, 0.95)), 2)

    def calculate_success_probability(self, learner_ability: float, task_difficulty: float) -> float:
        # Standard 1PL IRT logistic function
        logit = 1.7 * (learner_ability - task_difficulty)
        prob = 1.0 / (1.0 + np.exp(-logit))
        return round(float(prob), 3)
