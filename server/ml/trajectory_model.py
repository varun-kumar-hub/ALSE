import math
from typing import List, Dict, Any

class TrajectoryModel:
    """
    Learning Trajectory & Predicted Final Mastery Engine for LearnForge.
    Computes asymptotic growth curves, final mastery forecasts, and before/after outcome matrices.
    """

    def __init__(self):
        pass

    def predict_final_mastery(
        self,
        current_mastery: float,
        interaction_count: int,
        recent_gains: List[float] = [],
        has_misconception: bool = False,
    ) -> Dict[str, Any]:
        """
        Projects asymptotic final mastery curve: M(t) = M_max - (M_max - M_0) * e^(-k * t)
        """
        avg_gain = sum(recent_gains) / max(1, len(recent_gains)) if recent_gains else 0.05
        learning_velocity = max(0.01, avg_gain)

        # Growth decay coefficient calibrated to learning velocity
        k = learning_velocity * 2.5
        target_ceiling = 0.82 if has_misconception else 0.96

        # Project simulated session trajectory
        projected = []
        m = current_mastery
        for step in range(1, 9):
            m = m + (target_ceiling - m) * (1.0 - math.exp(-k))
            projected.append(round(min(0.99, m), 3))

        predicted_final = projected[-1]
        
        # Estimate remaining sessions needed to achieve >= 0.85 mastery
        if current_mastery >= 0.85:
            estimated_sessions = 0
        else:
            needed = max(0.05, 0.85 - current_mastery)
            estimated_sessions = max(1, math.ceil(needed / max(0.02, avg_gain)))

        conf = round(min(0.95, 0.70 + (interaction_count * 0.03)), 2)

        summary = (
            f"On track to achieve {int(predicted_final*100)}% final mastery within ~{estimated_sessions} additional session(s) "
            f"at current velocity (+{avg_gain*100:.1f}%/interaction)."
        )

        return {
            "current_mastery": round(current_mastery, 4),
            "predicted_final_mastery": round(predicted_final, 4),
            "confidence": conf,
            "estimated_sessions": estimated_sessions,
            "trajectory": projected,
            "summary": summary,
        }

    def compute_before_after_outcomes(
        self,
        events: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Extracts verified Before/After outcomes per concept from recorded events.
        """
        outcomes = []
        for i, ev in enumerate(events):
            concept = ev.get("concept_id", "general")
            gain = ev.get("learning_gain", 0.06)
            after_m = ev.get("mastery_score", 0.5)
            before_m = max(0.05, round(after_m - gain, 4))
            rel_gain = round(((after_m - before_m) / max(0.01, before_m)) * 100, 1)

            outcomes.append({
                "concept": concept,
                "session": ev.get("session_id", f"Session {i+1}"),
                "before_mastery": before_m,
                "after_mastery": after_m,
                "absolute_gain": round(gain, 4),
                "relative_gain": rel_gain,
                "intervention_used": ev.get("intervention", "EXPLANATION"),
                "status": "Mastered" if after_m >= 0.80 else "Progressing",
            })
        return outcomes
