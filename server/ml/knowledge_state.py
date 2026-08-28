import math
import datetime
from typing import Dict, Any, Literal

class KnowledgeStateEstimator:
    """
    Probabilistic Bayesian Knowledge Tracing (BKT) Engine for LearnForge.
    Performs incremental Bayesian posterior updates after every learning event.
    """

    def __init__(
        self,
        default_p_init: float = 0.30,
        default_p_transit: float = 0.15,
        default_p_guess: float = 0.20,
        default_p_slip: float = 0.10,
    ):
        self.p_init = default_p_init
        self.p_transit = default_p_transit
        self.p_guess = default_p_guess
        self.p_slip = default_p_slip

    def get_mastery_level(self, score: float) -> Literal["Beginner", "Developing", "Intermediate", "Proficient", "Mastered"]:
        if score >= 0.85:
            return "Mastered"
        elif score >= 0.70:
            return "Proficient"
        elif score >= 0.50:
            return "Intermediate"
        elif score >= 0.30:
            return "Developing"
        return "Beginner"

    def calculate_confidence(self, evidence_count: int, consistency: float = 0.8) -> float:
        """
        Confidence grows asymptotically with the number of observations (evidence_count).
        """
        base_conf = 1.0 - (1.0 / math.sqrt(evidence_count + 1))
        return min(0.98, max(0.20, base_conf * consistency + 0.15))

    def update_state(
        self,
        prior_mastery: float,
        correct: bool,
        question_difficulty: float = 0.5,
        hint_used: bool = False,
        explanation_used: bool = False,
        response_time_ms: int = 15000,
        evidence_count: int = 1,
    ) -> Dict[str, Any]:
        """
        Calculates exact Bayesian posterior mastery and transitions.
        """
        prior = max(0.01, min(0.99, prior_mastery if prior_mastery > 0 else self.p_init))

        # Adjust guess and slip based on task difficulty and hints
        effective_p_guess = min(0.40, self.p_guess + (0.10 if hint_used else 0.0))
        effective_p_slip = min(0.35, self.p_slip + (0.05 if question_difficulty > 0.7 else 0.0))
        effective_p_transit = self.p_transit + (0.08 if explanation_used else 0.0)

        # 1. Observation Update (Bayes Rule)
        if correct:
            p_obs_given_known = 1.0 - effective_p_slip
            p_obs_given_unknown = effective_p_guess
            posterior = (prior * p_obs_given_known) / max(1e-6, (prior * p_obs_given_known + (1.0 - prior) * p_obs_given_unknown))
        else:
            p_obs_given_known = effective_p_slip
            p_obs_given_unknown = 1.0 - effective_p_guess
            posterior = (prior * p_obs_given_known) / max(1e-6, (prior * p_obs_given_known + (1.0 - prior) * p_obs_given_unknown))

        # 2. Learning Transition
        updated_mastery = posterior + (1.0 - posterior) * effective_p_transit
        updated_mastery = round(min(0.99, max(0.05, updated_mastery)), 4)

        level = self.get_mastery_level(updated_mastery)
        conf = round(self.calculate_confidence(evidence_count), 4)

        return {
            "mastery_score": updated_mastery,
            "confidence": conf,
            "mastery_level": level,
            "evidence_count": evidence_count,
            "posterior_before_transit": round(posterior, 4),
            "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
        }
