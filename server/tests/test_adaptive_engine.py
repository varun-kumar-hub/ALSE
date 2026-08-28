import sys
import os
import unittest
import tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.adaptive_engine import AdaptiveLearningEngine
from storage.repository import AdaptiveRepository

class TestAdaptiveEngineIntegration(unittest.TestCase):

    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.repo = AdaptiveRepository(db_path=self.temp_db.name)
        self.engine = AdaptiveLearningEngine(repo=self.repo)

    def tearDown(self):
        try:
            self.temp_db.close()
            if os.path.exists(self.temp_db.name):
                os.remove(self.temp_db.name)
        except Exception:
            pass

    def test_full_learning_event_lifecycle(self):
        # 1. First interaction: Correct answer
        ev1 = {
            "learner_id": "test_user_1",
            "session_id": "sess_1",
            "concept_id": "process_scheduling",
            "correct": True,
            "question_difficulty": 0.45,
            "response_time_ms": 12000,
            "confidence": 0.7,
            "intervention": "EXPLANATION",
        }
        res1 = self.engine.process_learning_event(ev1)
        self.assertIn("learner_state", res1)
        self.assertGreater(res1["learner_state"]["mastery_score"], 0.30)
        self.assertIn("difficulty", res1)
        self.assertIn("decision", res1)

        # 2. Second interaction: Incorrect answer on harder question
        ev2 = {
            "learner_id": "test_user_1",
            "session_id": "sess_1",
            "concept_id": "process_scheduling",
            "correct": False,
            "question_difficulty": 0.65,
            "response_time_ms": 22000,
            "confidence": 0.8,
            "intervention": "PRACTICE",
            "misconception_flag": "Confused preemptive with non-preemptive SJF",
        }
        res2 = self.engine.process_learning_event(ev2)
        self.assertEqual(res2["learner_state"]["evidence_count"], 2)

        # 3. Retrieve Dashboard Analytics from persistent storage
        analytics = self.engine.get_dashboard_analytics("test_user_1")
        self.assertEqual(len(analytics["mastery_graph"]), 1)
        self.assertEqual(len(analytics["learning_trajectory"]), 2)
        self.assertEqual(len(analytics["chosen_interventions"]), 2)
        self.assertIn("predicted_final_mastery", analytics)

if __name__ == "__main__":
    unittest.main()
