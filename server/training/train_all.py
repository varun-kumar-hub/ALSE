import os
import json
import joblib
import datetime
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from dataset_builder import generate_synthetic_dataset, ACTIONS

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

ACTION_ENCODING = {a: i for i, a in enumerate(ACTIONS)}

def train_mastery_model(df):
    print("\n--- [1/2] Training Concept Mastery Predictor ---")
    X = df[[
        "prior_mastery",
        "question_difficulty",
        "correct",
        "response_time_sec",
        "explanation_quality",
        "confidence",
        "has_misconception",
        "learning_gain",
    ]].values
    X[:, 3] = np.clip(X[:, 3] / 60.0, 0, 1.0) # Normalize response time
    y = df["post_mastery"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = float(r2_score(y_test, preds))

    print(f"Mastery Model Metrics -> MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f}")

    path = os.path.join(ARTIFACTS_DIR, "mastery_predictor.joblib")
    joblib.dump(model, path)
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)}

def train_learning_gain_model(df):
    print("\n--- [2/2] Training Learning Gain Predictor ---")
    df_copy = df.copy()
    df_copy["action_code"] = df_copy["action_type"].map(ACTION_ENCODING).fillna(0)

    X = df_copy[[
        "prior_mastery",
        "question_difficulty",
        "action_code",
        "has_misconception",
        "confidence",
    ]].values
    y = df_copy["learning_gain"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = float(r2_score(y_test, preds))

    print(f"Learning Gain Model Metrics -> MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f}")

    path = os.path.join(ARTIFACTS_DIR, "learning_gain_predictor.joblib")
    joblib.dump(model, path)
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)}

def main():
    print("==================================================")
    print("  LearnForge ML Engine Training Pipeline")
    print("==================================================")
    
    df = generate_synthetic_dataset(num_samples=6000)
    mastery_metrics = train_mastery_model(df)
    gain_metrics = train_learning_gain_model(df)

    metadata = {
        "version": "1.0.0",
        "trained_at": datetime.datetime.utcnow().isoformat() + "Z",
        "training_samples": len(df),
        "models": {
            "mastery_predictor": {
                "algorithm": "GradientBoostingRegressor",
                "metrics": mastery_metrics,
            },
            "learning_gain_predictor": {
                "algorithm": "RandomForestRegressor",
                "metrics": gain_metrics,
            },
            "knowledge_state_estimator": {
                "algorithm": "BayesianKnowledgeTracing (BKT)",
                "p_init": 0.30,
                "p_transit": 0.15,
            },
            "difficulty_estimator": {
                "algorithm": "ItemResponseTheory (1PL IRT)",
                "target_success_zone": "70-80%",
            },
            "action_ranker": {
                "algorithm": "MultiFactorUtilityEngine",
                "candidate_actions": 11,
            }
        }
    }

    meta_path = os.path.join(ARTIFACTS_DIR, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n[SUCCESS] All LearnForge ML models trained and serialized to:", ARTIFACTS_DIR)

if __name__ == "__main__":
    main()
