from typing import List, Dict, Any
from ml.learning_gain_predictor import LearningGainPredictor

ALL_ACTIONS = [
    "NEW_CONCEPT",
    "PRACTICE",
    "REVISION",
    "HINT",
    "EXPLANATION",
    "WORKED_EXAMPLE",
    "EASIER_QUESTION",
    "SIMILAR_QUESTION",
    "HARDER_QUESTION",
    "PREREQUISITE_REVIEW",
    "SCENARIO_CHALLENGE",
]

ACTION_COSTS = {
    "HINT": 1,
    "SIMILAR_QUESTION": 1,
    "PRACTICE": 1,
    "EASIER_QUESTION": 1,
    "REVISION": 1,
    "EXPLANATION": 2,
    "WORKED_EXAMPLE": 2,
    "NEW_CONCEPT": 2,
    "PREREQUISITE_REVIEW": 2,
    "HARDER_QUESTION": 2,
    "SCENARIO_CHALLENGE": 3,
}

class ActionRanker:
    """
    Transparent Multi-Factor Intervention Ranking Engine for LearnForge.
    Computes real utility rankings across 11 educational actions.
    """

    def __init__(self, gain_predictor: LearningGainPredictor):
        self.gain_predictor = gain_predictor

    def rank_interventions(
        self,
        concept: str,
        current_mastery: float,
        learner_ability: float,
        has_misconception: bool = False,
        recent_actions: List[str] = [],
        candidate_actions: List[str] = ALL_ACTIONS,
    ) -> Dict[str, Any]:
        scored_actions = []

        for action in candidate_actions:
            pred_gain_res = self.gain_predictor.predict_gain(
                current_mastery=current_mastery,
                task_difficulty=0.5,
                action_type=action,
                has_misconception=has_misconception,
                learner_ability=learner_ability,
            )
            predicted_gain = pred_gain_res["predicted_gain"]

            # Expected success probability
            if action in ["EASIER_QUESTION", "HINT", "WORKED_EXAMPLE"]:
                expected_success = 0.88
            elif action in ["HARDER_QUESTION", "SCENARIO_CHALLENGE"]:
                expected_success = 0.55 if current_mastery > 0.70 else 0.35
            else:
                expected_success = 0.75

            # Misconception reduction potential
            if has_misconception:
                if action in ["EXPLANATION", "WORKED_EXAMPLE", "PREREQUISITE_REVIEW"]:
                    misc_reduction = 0.85
                elif action in ["HINT", "REVISION"]:
                    misc_reduction = 0.50
                else:
                    misc_reduction = 0.10
            else:
                misc_reduction = 0.0

            # Repetition / fatigue penalty
            repetition_count = sum(1 for a in recent_actions[-3:] if a == action)
            fatigue_penalty = repetition_count * 0.08

            cost = ACTION_COSTS.get(action, 1)

            # Transparent Multi-Factor Utility Formula:
            # Utility = (w1 * Gain) + (w2 * Success) + (w3 * MiscReduction) - Penalty
            utility = (
                (2.0 * predicted_gain)
                + (0.3 * expected_success)
                + (0.4 * misc_reduction)
                - (0.05 * cost)
                - fatigue_penalty
            )
            utility = round(utility, 4)

            scored_actions.append({
                "action": action,
                "predicted_gain": predicted_gain,
                "expected_success": round(expected_success, 4),
                "misconception_reduction": round(misc_reduction, 4),
                "utility": utility,
                "cost": cost,
                "confidence": 0.88,
            })

        # Sort descending by utility score
        scored_actions.sort(key=lambda x: x["utility"], reverse=True)
        best = scored_actions[0]

        # Generate signal-derived pedagogical reasoning
        reasoning = []
        if has_misconception:
            reasoning.append("Active conceptual misconception detected.")
            reasoning.append(f"{best['action']} prioritized for targeted misconception resolution.")
        elif current_mastery < 0.35:
            reasoning.append(f"Foundational mastery is developing ({int(current_mastery*100)}%).")
            reasoning.append(f"{best['action']} selected to build core concept understanding.")
        elif current_mastery >= 0.75:
            reasoning.append(f"High mastery achieved ({int(current_mastery*100)}%).")
            reasoning.append(f"{best['action']} chosen to deepen application and edge-case mastery.")
        else:
            reasoning.append(f"Balanced progression ({int(current_mastery*100)}% mastery).")
            reasoning.append(f"{best['action']} maximizes predicted learning velocity.")

        return {
            "selected_action": best["action"],
            "ranked_actions": scored_actions,
            "expected_gain": best["predicted_gain"],
            "confidence": 0.88,
            "reasoning": reasoning,
        }
