import random
import numpy as np
import pandas as pd
from typing import List, Dict, Any

LEARNER_PROFILES = [
    {"name": "fast_learner", "base_ability": 0.85, "slip_rate": 0.05, "hint_benefit": 0.08, "has_misc": False},
    {"name": "struggling_learner", "base_ability": 0.25, "slip_rate": 0.25, "hint_benefit": 0.15, "has_misc": True},
    {"name": "high_performer", "base_ability": 0.90, "slip_rate": 0.03, "hint_benefit": 0.04, "has_misc": False},
    {"name": "misconception_heavy", "base_ability": 0.40, "slip_rate": 0.35, "hint_benefit": 0.20, "has_misc": True},
    {"name": "inconsistent_learner", "base_ability": 0.50, "slip_rate": 0.30, "hint_benefit": 0.10, "has_misc": False},
    {"name": "hint_reliant", "base_ability": 0.45, "slip_rate": 0.15, "hint_benefit": 0.25, "has_misc": False},
    {"name": "explanation_reliant", "base_ability": 0.48, "slip_rate": 0.12, "hint_benefit": 0.22, "has_misc": True},
    {"name": "steady_learner", "base_ability": 0.60, "slip_rate": 0.10, "hint_benefit": 0.12, "has_misc": False},
]

ACTIONS = [
    "NEW_CONCEPT", "PRACTICE", "REVISION", "HINT", "EXPLANATION",
    "WORKED_EXAMPLE", "EASIER_QUESTION", "SIMILAR_QUESTION", "HARDER_QUESTION",
    "PREREQUISITE_REVIEW", "SCENARIO_CHALLENGE"
]

CONCEPTS = [
    "arrays", "linked_lists", "binary_trees", "hash_tables", "recursion",
    "dynamic_programming", "graph_algorithms", "sorting", "operating_systems",
    "concurrency", "memory_management", "virtual_memory"
]

def generate_synthetic_dataset(num_samples: int = 5000) -> pd.DataFrame:
    """
    Generates realistic learner interaction records across 8 behavioral profiles.
    """
    random.seed(42)
    np.random.seed(42)
    rows = []

    for i in range(num_samples):
        profile = random.choice(LEARNER_PROFILES)
        concept = random.choice(CONCEPTS)
        action = random.choice(ACTIONS)

        # Baseline prior mastery
        prior_mastery = np.clip(np.random.normal(profile["base_ability"] * 0.7, 0.15), 0.05, 0.95)
        difficulty = np.clip(np.random.beta(2, 2), 0.10, 0.95)

        # Correctness probability via logistic IRT curve
        prob_correct = 1.0 / (1.0 + np.exp(-(profile["base_ability"] * 3.0 - difficulty * 3.0)))
        prob_correct = np.clip(prob_correct - (0.25 if profile["has_misc"] else 0.0), 0.05, 0.95)
        correct = np.random.rand() < prob_correct

        response_time_ms = int(np.random.exponential(15000) + (5000 if not correct else 2000))
        confidence = np.clip(prior_mastery + np.random.normal(0, 0.1), 0.1, 0.99)

        # Learning gain calculation
        base_gain = 0.06 if correct else 0.02
        if action in ["EXPLANATION", "WORKED_EXAMPLE"] and profile["has_misc"]:
            base_gain += 0.08
        elif action in ["HINT", "PRACTICE"] and not profile["has_misc"]:
            base_gain += 0.05

        learning_gain = np.clip(base_gain + np.random.normal(0, 0.015), 0.01, 0.30)
        post_mastery = np.clip(prior_mastery + learning_gain, 0.05, 0.99)

        rows.append({
            "learner_profile": profile["name"],
            "concept_id": concept,
            "prior_mastery": prior_mastery,
            "question_difficulty": difficulty,
            "correct": 1 if correct else 0,
            "response_time_sec": response_time_ms / 1000.0,
            "explanation_quality": round(random.uniform(0.6, 0.95), 2),
            "confidence": confidence,
            "has_misconception": 1 if profile["has_misc"] else 0,
            "action_type": action,
            "learning_gain": learning_gain,
            "post_mastery": post_mastery,
        })

    return pd.DataFrame(rows)

if __name__ == "__main__":
    df = generate_synthetic_dataset(1000)
    print(f"Generated {len(df)} synthetic interaction samples.")
    print(df.head())
