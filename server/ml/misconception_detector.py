from typing import Dict, Any, List, Optional, Literal

class MisconceptionDetector:
    """
    Multi-evidence misconception analysis and classification engine for LearnForge.
    Distinguishes careless slips from knowledge gaps and persistent misconceptions.
    """

    def __init__(self):
        pass

    def evaluate_misconception(
        self,
        concept_id: str,
        concept_name: str,
        recent_correctness: List[bool],
        repeated_error_count: int,
        confidence: float = 0.5,
        misconception_flag: Optional[str] = None,
        failed_after_explanation: bool = False,
    ) -> Dict[str, Any]:
        """
        Evaluates interaction history to compute misconception probability, severity, and taxonomy.
        """
        total_recent = len(recent_correctness)
        wrong_count = sum(1 for c in recent_correctness if not c)
        
        # High confidence + wrong answer is a primary hallmark of a misconception
        misconception_probability = 0.0
        
        if total_recent == 0:
            return {
                "concept_id": concept_id,
                "concept_name": concept_name,
                "has_misconception": False,
                "probability": 0.0,
                "severity": "NONE",
                "misconception_type": "none",
                "evidence_count": 0,
                "description": "No prior interaction evidence.",
            }

        wrong_ratio = wrong_count / max(1, total_recent)

        # 1. Base probability from error rate and repetition
        if repeated_error_count >= 2:
            misconception_probability += 0.35 + (repeated_error_count * 0.12)
        elif wrong_count >= 1:
            misconception_probability += 0.15

        # 2. Confident errors increase misconception likelihood
        if wrong_count > 0 and confidence > 0.65:
            misconception_probability += 0.25

        # 3. Explicit distractor flag (e.g. from quiz option)
        if misconception_flag:
            misconception_probability += 0.30

        # 4. Failure persisting even after explanation
        if failed_after_explanation:
            misconception_probability += 0.20

        misconception_probability = round(min(0.98, max(0.02, misconception_probability)), 4)

        # Determine Classification Type
        if misconception_probability < 0.25:
            m_type: Literal["none", "careless_error", "knowledge_gap", "persistent_misconception"] = "none"
            severity: Literal["NONE", "LOW", "MEDIUM", "HIGH"] = "NONE"
            has_misc = False
        elif repeated_error_count <= 1 and confidence < 0.5:
            m_type = "careless_error"
            severity = "LOW"
            has_misc = False
        elif repeated_error_count < 3 and not failed_after_explanation:
            m_type = "knowledge_gap"
            severity = "MEDIUM"
            has_misc = misconception_probability >= 0.50
        else:
            m_type = "persistent_misconception"
            severity = "HIGH"
            has_misc = True

        desc = misconception_flag or (
            f"Persistent conceptual error on {concept_name} after {repeated_error_count} repeated attempts."
            if has_misc
            else f"No active misconception detected on {concept_name}."
        )

        return {
            "concept_id": concept_id,
            "concept_name": concept_name,
            "has_misconception": has_misc,
            "probability": misconception_probability,
            "severity": severity,
            "misconception_type": m_type,
            "evidence_count": total_recent,
            "description": desc,
        }
