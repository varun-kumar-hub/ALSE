# LearnForge Model Training Pipeline

## 1. Overview
The LearnForge machine learning pipeline trains and serializes supervised regression and probabilistic models used for real-time mastery prediction, item difficulty estimation, and intervention ranking.

---

## 2. Dataset Generation (`server/training/dataset_builder.py`)
Generates 6,000 synthetic interaction samples parameterized across 8 distinct psychological learner archetypes:
1. **Fast Learner**: High initial ability, rapid mastery transition, low slip rate.
2. **Struggling Learner**: Low baseline ability, frequent slips, requires scaffolded hints/examples.
3. **High Performer**: Mastery $>0.85$, benefits from harder challenges and scenarios.
4. **Misconception-Heavy**: Persistent incorrect options chosen with high confidence; requires direct explanation.
5. **Inconsistent Learner**: Fluctuating accuracy depending on question difficulty.
6. **Hint-Reliant**: Significantly higher gains when scaffolded with hints.
7. **Explanation-Reliant**: Gains spike after conceptual explanation rather than repeated practice.
8. **Steady Learner**: Predictable, linear learning velocity.

---

## 3. Running the Training Pipeline

Execute the training script from the repository root:
```bash
python server/training/train_all.py
```

### Output & Artifacts
Models are serialized to `server/models/artifacts/`:
- `mastery_predictor.joblib` (`GradientBoostingRegressor`)
- `learning_gain_predictor.joblib` (`RandomForestRegressor`)
- `model_metadata.json` (Training metadata, version, MAE, RMSE, and $R^2$)

---

## 4. Evaluation Metrics
- **Concept Mastery Predictor**:
  - MAE: **0.0026**
  - RMSE: **0.0035**
  - $R^2$: **0.9997**
- **Learning Gain Predictor**:
  - MAE: **0.0176**
  - RMSE: **0.0213**
  - $R^2$: **0.5938**
