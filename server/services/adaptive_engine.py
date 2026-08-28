import datetime
import uuid
from typing import Dict, Any, List, Optional

from ml.knowledge_state import KnowledgeStateEstimator
from ml.mastery_predictor import ConceptMasteryPredictor
from ml.misconception_detector import MisconceptionDetector
from ml.difficulty_estimator import DifficultyEstimator
from ml.learning_gain_predictor import LearningGainPredictor
from ml.action_ranker import ActionRanker
from ml.trajectory_model import TrajectoryModel
from storage.repository import AdaptiveRepository

class AdaptiveLearningEngine:
    """
    Central Orchestration Service for LearnForge Adaptive Learning.
    Coordinates real probabilistic & trained ML models into a unified feedback loop.
    """

    def __init__(self, repo: Optional[AdaptiveRepository] = None):
        self.repo = repo or AdaptiveRepository()
        self.knowledge_estimator = KnowledgeStateEstimator()
        self.mastery_predictor = ConceptMasteryPredictor()
        self.misconception_detector = MisconceptionDetector()
        self.difficulty_estimator = DifficultyEstimator()
        self.gain_predictor = LearningGainPredictor()
        self.action_ranker = ActionRanker(self.gain_predictor)
        self.trajectory_model = TrajectoryModel()

    def process_learning_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests a learner interaction event, updates knowledge state via BKT,
        detects misconceptions, calculates IRT difficulty, ranks next candidate actions,
        and saves state to persistent SQLite storage.
        """
        learner_id = event_data.get("learner_id", "default_learner")
        concept_id = event_data["concept_id"]
        correct = bool(event_data.get("correct", True))
        difficulty = float(event_data.get("question_difficulty", 0.5))
        hint_used = bool(event_data.get("hint_used", False))
        explanation_used = bool(event_data.get("explanation_used", False))
        response_time_ms = int(event_data.get("response_time_ms", 15000))
        confidence = float(event_data.get("confidence", 0.5))
        misconception_flag = event_data.get("misconception_flag")

        # 1. Fetch current prior state from DB
        current_mastery_record = self.repo.get_mastery(learner_id, concept_id)
        prior_mastery = current_mastery_record["mastery_score"] if current_mastery_record else 0.30
        prior_count = current_mastery_record["evidence_count"] if current_mastery_record else 0

        # 2. Update Knowledge State via Bayesian Knowledge Tracing (BKT)
        bkt_res = self.knowledge_estimator.update_state(
            prior_mastery=prior_mastery,
            correct=correct,
            question_difficulty=difficulty,
            hint_used=hint_used,
            explanation_used=explanation_used,
            response_time_ms=response_time_ms,
            evidence_count=prior_count + 1,
        )
        updated_mastery = bkt_res["mastery_score"]
        learning_gain = round(max(0.01, updated_mastery - prior_mastery if correct else 0.02), 4)

        # 3. Retrieve recent history for misconception evaluation
        recent_events = self.repo.get_events_for_learner(learner_id, concept_id)
        recent_correctness = [bool(e["correct"]) for e in recent_events[-5:]] + [correct]
        repeated_errors = sum(1 for c in recent_correctness if not c)

        misc_res = self.misconception_detector.evaluate_misconception(
            concept_id=concept_id,
            concept_name=concept_id.replace("_", " ").title(),
            recent_correctness=recent_correctness,
            repeated_error_count=repeated_errors,
            confidence=confidence,
            misconception_flag=misconception_flag,
            failed_after_explanation=explanation_used and not correct,
        )

        # 4. Calibrate next optimal challenge difficulty via Item Response Theory
        recent_success_rate = sum(1 for c in recent_correctness if c) / max(1, len(recent_correctness))
        diff_res = self.difficulty_estimator.estimate_optimal_difficulty(
            learner_mastery=updated_mastery,
            recent_success_rate=recent_success_rate,
            has_misconception=misc_res["has_misconception"],
            recent_gain=learning_gain,
        )

        # 5. Predict expected gains and rank candidate pedagogical actions
        recent_actions = [e.get("intervention", "") for e in recent_events[-5:]]
        rank_res = self.action_ranker.rank_interventions(
            concept=concept_id,
            current_mastery=updated_mastery,
            learner_ability=diff_res["expected_success_probability"],
            has_misconception=misc_res["has_misconception"],
            recent_actions=recent_actions,
        )

        # 6. Persist event, updated mastery, misconception, and decision trace
        event_record = {
            **event_data,
            "timestamp": event_data.get("timestamp") or datetime.datetime.utcnow().isoformat() + "Z",
            "mastery_score": updated_mastery,
            "learning_gain": learning_gain,
        }
        self.repo.save_learning_event(event_record)

        self.repo.save_mastery(learner_id, {
            "concept_id": concept_id,
            "concept_name": concept_id.replace("_", " ").title(),
            "mastery_score": updated_mastery,
            "confidence": bkt_res["confidence"],
            "mastery_level": bkt_res["mastery_level"],
            "evidence_count": prior_count + 1,
            "last_updated": bkt_res["last_updated"],
        })

        self.repo.save_misconception(learner_id, {
            "concept_id": concept_id,
            "concept_name": concept_id.replace("_", " ").title(),
            "has_misconception": misc_res["has_misconception"],
            "probability": misc_res["probability"],
            "severity": misc_res["severity"],
            "misconception_type": misc_res["misconception_type"],
            "evidence_count": len(recent_correctness),
            "description": misc_res["description"],
            "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
        })

        trace_id = f"trace_{uuid.uuid4().hex[:8]}"
        self.repo.save_decision_trace({
            "id": trace_id,
            "learner_id": learner_id,
            "concept": concept_id,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "current_mastery": updated_mastery,
            "has_misconception": misc_res["has_misconception"],
            "detected_gap": misc_res["description"],
            "selected_action": rank_res["selected_action"],
            "selected_reason": rank_res["reasoning"][0] if rank_res["reasoning"] else "",
            "candidates": rank_res["ranked_actions"],
            "outcome_gain": learning_gain,
        })

        return {
            "concept_id": concept_id,
            "concept_name": concept_id.replace("_", " ").title(),
            "learner_state": {
                "mastery_score": updated_mastery,
                "confidence": bkt_res["confidence"],
                "mastery_level": bkt_res["mastery_level"],
                "evidence_count": prior_count + 1,
                "learning_gain": learning_gain,
            },
            "misconception": misc_res,
            "difficulty": diff_res,
            "decision": {
                "action": rank_res["selected_action"],
                "expected_gain": rank_res["expected_gain"],
                "confidence": rank_res["confidence"],
                "reasoning": rank_res["reasoning"],
            },
            "ranked_actions": rank_res["ranked_actions"],
            "timestamp": event_record["timestamp"],
        }

    def get_dashboard_analytics(self, learner_id: str) -> Dict[str, Any]:
        """
        Assembles real analytics for the LearnForge adaptive dashboard.
        """
        masteries = self.repo.get_all_masteries(learner_id)
        misconceptions = self.repo.get_all_misconceptions(learner_id)
        events = self.repo.get_events_for_learner(learner_id)
        traces = self.repo.get_decision_traces(learner_id)

        # Compute average mastery
        avg_mastery = sum(m["mastery_score"] for m in masteries) / max(1, len(masteries)) if masteries else 0.40
        recent_gains = [e.get("learning_gain", 0.05) for e in events[-10:]]

        # Predicted final mastery projection
        final_proj = self.trajectory_model.predict_final_mastery(
            current_mastery=avg_mastery,
            interaction_count=len(events),
            recent_gains=recent_gains,
            has_misconception=any(m.get("has_misconception") for m in misconceptions),
        )

        # Before / After outcomes
        before_after_outcomes = self.trajectory_model.compute_before_after_outcomes(events[-8:])

        # Trajectory progression points
        trajectory_points = [
            {
                "session": e.get("session_id", "Session"),
                "timestamp": e.get("timestamp", ""),
                "concept_id": e.get("concept_id", ""),
                "mastery": e.get("mastery_score", 0.5),
                "difficulty": e.get("question_difficulty", 0.5),
                "intervention": e.get("intervention", "EXPLANATION"),
                "learning_gain": e.get("learning_gain", 0.05),
                "misconception_detected": bool(e.get("misconception_flag")),
            }
            for e in events
        ]

        return {
            "learner_id": learner_id,
            "overall_mastery": round(avg_mastery, 4),
            "mastery_graph": masteries,
            "misconception_map": misconceptions,
            "learning_trajectory": trajectory_points,
            "chosen_interventions": traces,
            "predicted_final_mastery": final_proj,
            "before_after_outcomes": before_after_outcomes,
            "total_events_recorded": len(events),
        }
