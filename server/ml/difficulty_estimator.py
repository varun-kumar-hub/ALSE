import math
from typing import Dict, Any, Literal

class DifficultyEstimator:
    """
    Item Response Theory (IRT) Adaptive Difficulty Estimator for LearnForge.
    Calibrates continuous difficulty targeting the learner's productive challenge zone (70–80% success probability).
    """

    def __init__(self, target_success_rate: float = 0.75):
        self.target_success_rate = target_success_rate

    def get_difficulty_tier(self, difficulty: float) -> Literal["EASY", "MEDIUM", "HARD", "EXPERT"]:
        if difficulty >= 0.80:
            return "EXPERT"
        elif difficulty >= 0.60:
            return "HARD"
        elif difficulty >= 0.35:
            return "MEDIUM"
        return "EASY"

    def estimate_optimal_difficulty(
        self,
        learner_mastery: float,
        recent_success_rate: float = 0.75,
        has_misconception: bool = False,
        recent_gain: float = 0.05,
    ) -> Dict[str, Any]:
        """
        Uses IRT ability mapping to calibrate next optimal difficulty.
        """
        # Map 0..1 mastery to IRT theta logit space [-3, +3]
        safe_mastery = max(0.02, min(0.98, learner_mastery))
        theta = math.log(safe_mastery / (1.0 - safe_mastery))

        # Adjust theta for active misconception or high friction
        if has_misconception:
            theta -= 0.60
        elif recent_success_rate > 0.85 and recent_gain > 0.08:
            theta += 0.40

        # Calculate optimal item difficulty logit b for target success probability P*
        p_star = max(0.60, min(0.85, self.target_success_rate))
        logit_diff = math.log(p_star / (1.0 - p_star))
        optimal_b = theta - logit_diff

        # Map logit b back to continuous [0..1]
        recommended_difficulty = 1.0 / (1.0 + math.exp(-optimal_b))
        recommended_difficulty = round(min(0.95, max(0.10, recommended_difficulty)), 4)

        # Expected success probability at recommended difficulty
        expected_success = 1.0 / (1.0 + math.exp(-(theta - optimal_b)))
        expected_success = round(expected_success, 4)

        tier = self.get_difficulty_tier(recommended_difficulty)
        
        reason = (
            f"Calibrated to {tier} difficulty to target a productive {int(expected_success*100)}% challenge zone "
            f"based on current mastery ({int(learner_mastery*100)}%)."
        )
        if has_misconception:
            reason = f"Scaled back to {tier} difficulty due to an active conceptual misconception."

        return {
            "recommended_difficulty": recommended_difficulty,
            "difficulty_tier": tier,
            "expected_success_probability": expected_success,
            "confidence": 0.88,
            "reason": reason,
        }
