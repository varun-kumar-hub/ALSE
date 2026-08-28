import sys
import os
import unittest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ml.knowledge_state import KnowledgeStateEstimator
from ml.misconception_detector import MisconceptionDetector
from ml.difficulty_estimator import DifficultyEstimator
from ml.learning_gain_predictor import LearningGainPredictor
from ml.action_ranker import ActionRanker
from ml.trajectory_model import TrajectoryModel

class TestLearnForgeMLModels(unittest.TestCase):

    def setUp(self):
        self.knowledge_estimator = KnowledgeStateEstimator()
        self.misconception_detector = MisconceptionDetector()
        self.difficulty_estimator = DifficultyEstimator()
        self.gain_predictor = LearningGainPredictor()
        self.action_ranker = ActionRanker(self.gain_predictor)
        self.trajectory_model = TrajectoryModel()

    def test_bkt_mastery_update_on_correct_answer(self):
        res = self.knowledge_estimator.update_state(
            prior_mastery=0.30,
            correct=True,
            question_difficulty=0.6,
            evidence_count=1
        )
        self.assertGreater(res["mastery_score"], 0.30)
        self.assertIn(res["mastery_level"], ["Beginner", "Developing", "Intermediate", "Proficient", "Mastered"])
        self.assertGreaterEqual(res["confidence"], 0.20)

    def test_bkt_mastery_update_on_incorrect_answer(self):
        res = self.knowledge_estimator.update_state(
            prior_mastery=0.70,
            correct=False,
            question_difficulty=0.5,
            evidence_count=2
        )
        self.assertLess(res["mastery_score"], 0.70)

    def test_misconception_detection_requires_evidence(self):
        # Single wrong answer should NOT trigger high severity misconception
        res_single = self.misconception_detector.evaluate_misconception(
            concept_id="deadlock",
            concept_name="Deadlock",
            recent_correctness=[False],
            repeated_error_count=1,
            confidence=0.4
        )
        self.assertFalse(res_single["has_misconception"])
        self.assertNotEqual(res_single["severity"], "HIGH")

        # Repeated wrong answers with confident misconceptions
        res_repeated = self.misconception_detector.evaluate_misconception(
            concept_id="deadlock",
            concept_name="Deadlock",
            recent_correctness=[False, False, False],
            repeated_error_count=3,
            confidence=0.8,
            failed_after_explanation=True
        )
        self.assertTrue(res_repeated["has_misconception"])
        self.assertEqual(res_repeated["severity"], "HIGH")
        self.assertEqual(res_repeated["misconception_type"], "persistent_misconception")

    def test_irt_difficulty_adaptation(self):
        # Struggling learner with misconception gets easier difficulty
        res_struggling = self.difficulty_estimator.estimate_optimal_difficulty(
            learner_mastery=0.25,
            recent_success_rate=0.3,
            has_misconception=True
        )
        self.assertEqual(res_struggling["difficulty_tier"], "EASY")
        self.assertLess(res_struggling["recommended_difficulty"], 0.40)

        # Advanced learner gets harder challenge
        res_advanced = self.difficulty_estimator.estimate_optimal_difficulty(
            learner_mastery=0.85,
            recent_success_rate=0.9,
            has_misconception=False
        )
        self.assertIn(res_advanced["difficulty_tier"], ["HARD", "EXPERT"])
        self.assertGreater(res_advanced["recommended_difficulty"], 0.55)

    def test_action_ranker_utility_prioritizes_remediation_on_misconception(self):
        res = self.action_ranker.rank_interventions(
            concept="paging",
            current_mastery=0.40,
            learner_ability=0.5,
            has_misconception=True
        )
        self.assertIn(res["selected_action"], ["EXPLANATION", "WORKED_EXAMPLE", "PREREQUISITE_REVIEW"])
        self.assertGreater(len(res["ranked_actions"]), 5)
        self.assertTrue(any("misconception" in r.lower() for r in res["reasoning"]))

    def test_trajectory_growth_and_final_mastery(self):
        res = self.trajectory_model.predict_final_mastery(
            current_mastery=0.50,
            interaction_count=5,
            recent_gains=[0.08, 0.07, 0.09],
            has_misconception=False
        )
        self.assertGreaterEqual(res["predicted_final_mastery"], 0.80)
        self.assertEqual(len(res["trajectory"]), 8)

if __name__ == "__main__":
    unittest.main()
