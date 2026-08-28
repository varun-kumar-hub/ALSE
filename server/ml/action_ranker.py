from typing import List, Dict, Any
from .learning_gain_predictor import LearningGainPredictor
from .difficulty_estimator import DifficultyEstimator

class ActionRanker:
    """
    Ranks candidate learning interventions based on expected learning gain
    subject to remaining session learning budget.
    """
    def __init__(self):
        self.gain_predictor = LearningGainPredictor()
        self.difficulty_estimator = DifficultyEstimator()

    def rank_candidate_actions(
        self,
        concept: str,
        current_mastery: float,
        learner_ability: float,
        has_misconception: bool,
        budget_remaining: int,
        candidate_actions: List[str]
    ) -> List[Dict[str, Any]]:
        action_costs = {
            "REVISION": 1,
            "HINT": 1,
            "EXPLANATION": 2,
            "PREREQUISITE_REVIEW": 2,
            "EASIER_CHALLENGE": 2,
            "HARDER_CHALLENGE": 3,
            "MISCONCEPTION_REMEDIATION": 3,
            "SCENARIO_BRANCH": 3
        }

        ranked_list = []
        for action in candidate_actions:
            cost = action_costs.get(action, 2)
            if cost > budget_remaining and budget_remaining > 0:
                continue # Skip actions exceeding remaining budget

            target_diff = self.difficulty_estimator.estimate_optimal_difficulty(learner_ability, current_mastery)
            pred_gain = self.gain_predictor.predict_gain(current_mastery, target_diff, action, has_misconception)
            
            # Efficiency score = gain per budget unit
            utility = pred_gain / max(cost, 1)

            reason = f"Maximizes gain ({pred_gain:.2f}) for concept '{concept}' within budget {cost}/{budget_remaining}"
            if has_misconception and action == "MISCONCEPTION_REMEDIATION":
                utility *= 1.4
                reason = "Priority remediation for detected active misconception"

            ranked_list.append({
                "action": action,
                "predicted_gain": pred_gain,
                "cost": cost,
                "utility": round(utility, 3),
                "target_difficulty": target_diff,
                "reason": reason
            })

        # Sort descending by utility
        ranked_list.sort(key=lambda x: x["utility"], reverse=True)
        return ranked_list
