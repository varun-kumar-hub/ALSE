import os
import sqlite3
import json
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "learnforge_adaptive.db")

class AdaptiveRepository:
    """
    Persistent SQLite storage for learning events, learner states, misconceptions, and traces.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_tables()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Learning Events Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learning_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    learner_id TEXT,
                    session_id TEXT,
                    concept_id TEXT,
                    activity_id TEXT,
                    timestamp TEXT,
                    question_difficulty REAL,
                    correct INTEGER,
                    response_time_ms INTEGER,
                    attempt_number INTEGER,
                    hint_used INTEGER,
                    explanation_used INTEGER,
                    confidence REAL,
                    intervention TEXT,
                    misconception_flag TEXT,
                    mastery_score REAL,
                    learning_gain REAL
                )
            """)

            # Concept Mastery State Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS concept_masteries (
                    learner_id TEXT,
                    concept_id TEXT,
                    concept_name TEXT,
                    mastery_score REAL,
                    confidence REAL,
                    mastery_level TEXT,
                    evidence_count INTEGER,
                    last_updated TEXT,
                    PRIMARY KEY (learner_id, concept_id)
                )
            """)

            # Misconceptions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS misconceptions (
                    learner_id TEXT,
                    concept_id TEXT,
                    concept_name TEXT,
                    has_misconception INTEGER,
                    probability REAL,
                    severity TEXT,
                    misconception_type TEXT,
                    evidence_count INTEGER,
                    description TEXT,
                    last_updated TEXT,
                    PRIMARY KEY (learner_id, concept_id)
                )
            """)

            # Decision Traces Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS decision_traces (
                    id TEXT PRIMARY KEY,
                    learner_id TEXT,
                    concept TEXT,
                    timestamp TEXT,
                    current_mastery REAL,
                    has_misconception INTEGER,
                    detected_gap TEXT,
                    selected_action TEXT,
                    selected_reason TEXT,
                    candidates_json TEXT,
                    outcome_gain REAL
                )
            """)

            conn.commit()

    def save_learning_event(self, event: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO learning_events (
                    learner_id, session_id, concept_id, activity_id, timestamp,
                    question_difficulty, correct, response_time_ms, attempt_number,
                    hint_used, explanation_used, confidence, intervention, misconception_flag,
                    mastery_score, learning_gain
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.get("learner_id", "default"),
                event.get("session_id", "session_1"),
                event.get("concept_id"),
                event.get("activity_id", "act_gen"),
                event.get("timestamp"),
                event.get("question_difficulty", 0.5),
                1 if event.get("correct") else 0,
                event.get("response_time_ms", 15000),
                event.get("attempt_number", 1),
                1 if event.get("hint_used") else 0,
                1 if event.get("explanation_used") else 0,
                event.get("confidence", 0.5),
                event.get("intervention"),
                event.get("misconception_flag"),
                event.get("mastery_score", 0.5),
                event.get("learning_gain", 0.05),
            ))
            conn.commit()

    def get_events_for_learner(self, learner_id: str, concept_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if concept_id:
                cursor.execute("SELECT * FROM learning_events WHERE learner_id = ? AND concept_id = ? ORDER BY id ASC", (learner_id, concept_id))
            else:
                cursor.execute("SELECT * FROM learning_events WHERE learner_id = ? ORDER BY id ASC", (learner_id,))
            return [dict(row) for row in cursor.fetchall()]

    def save_mastery(self, learner_id: str, mastery_data: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO concept_masteries (
                    learner_id, concept_id, concept_name, mastery_score, confidence,
                    mastery_level, evidence_count, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                learner_id,
                mastery_data["concept_id"],
                mastery_data.get("concept_name", mastery_data["concept_id"]),
                mastery_data["mastery_score"],
                mastery_data["confidence"],
                mastery_data["mastery_level"],
                mastery_data["evidence_count"],
                mastery_data["last_updated"],
            ))
            conn.commit()

    def get_all_masteries(self, learner_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM concept_masteries WHERE learner_id = ?", (learner_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_mastery(self, learner_id: str, concept_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM concept_masteries WHERE learner_id = ? AND concept_id = ?", (learner_id, concept_id))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save_misconception(self, learner_id: str, misc_data: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO misconceptions (
                    learner_id, concept_id, concept_name, has_misconception, probability,
                    severity, misconception_type, evidence_count, description, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                learner_id,
                misc_data["concept_id"],
                misc_data.get("concept_name", misc_data["concept_id"]),
                1 if misc_data["has_misconception"] else 0,
                misc_data["probability"],
                misc_data["severity"],
                misc_data["misconception_type"],
                misc_data["evidence_count"],
                misc_data.get("description", ""),
                misc_data.get("last_updated", ""),
            ))
            conn.commit()

    def get_all_misconceptions(self, learner_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM misconceptions WHERE learner_id = ?", (learner_id,))
            rows = cursor.fetchall()
            return [
                {
                    **dict(r),
                    "has_misconception": bool(r["has_misconception"]),
                }
                for r in rows
            ]

    def save_decision_trace(self, trace_data: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO decision_traces (
                    id, learner_id, concept, timestamp, current_mastery,
                    has_misconception, detected_gap, selected_action, selected_reason,
                    candidates_json, outcome_gain
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trace_data["id"],
                trace_data.get("learner_id", "default"),
                trace_data["concept"],
                trace_data["timestamp"],
                trace_data["current_mastery"],
                1 if trace_data.get("has_misconception") else 0,
                trace_data.get("detected_gap", ""),
                trace_data["selected_action"],
                trace_data.get("selected_reason", ""),
                json.dumps(trace_data.get("candidates", [])),
                trace_data.get("outcome_gain", 0.05),
            ))
            conn.commit()

    def get_decision_traces(self, learner_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM decision_traces WHERE learner_id = ? ORDER BY timestamp DESC LIMIT ?", (learner_id, limit))
            rows = cursor.fetchall()
            return [
                {
                    **dict(r),
                    "has_misconception": bool(r["has_misconception"]),
                    "candidates": json.loads(r["candidates_json"]) if r["candidates_json"] else [],
                }
                for r in rows
            ]
