# LearnForge Adaptive Engine: Dynamic Feedback Loop

## 1. Adaptive Interaction Cycle

```
Learner Action
      ↓
[POST /api/learning/events]
      ↓
Bayesian Knowledge Tracing (BKT) State Update
      ↓
Multi-Evidence Misconception Evaluation
      ↓
Item Response Theory (IRT) Challenge Zone Calibration
      ↓
Action-Conditioned Learning Gain Regression
      ↓
Multi-Factor Intervention Ranking
      ↓
Next Pedagogical Intervention & Dashboard Update
```

---

## 2. Mathematical Formulations

### Bayesian Knowledge Tracing (BKT)
- **Prior Knowledge**: $P(L_{t-1})$
- **Slip**: $P(S) = 0.10$, **Guess**: $P(G) = 0.20$, **Transit**: $P(T) = 0.15$
- **Posterior Update**:
  $$P(L_t | \text{Obs}) = \frac{P(L_{t-1}) \cdot P(\text{Obs} | \text{Known})}{P(L_{t-1}) \cdot P(\text{Obs} | \text{Known}) + (1 - P(L_{t-1})) \cdot P(\text{Obs} | \text{Unknown})}$$
- **Transition**:
  $$P(L_{t+1}) = P(L_t | \text{Obs}) + (1 - P(L_t | \text{Obs})) \cdot P(T)$$

### Item Response Theory (IRT 1PL)
- **Learner Ability**: $\theta = \ln\left(\frac{M}{1 - M}\right)$
- **Target Difficulty**: $b^* = \theta - \ln\left(\frac{P^*}{1 - P^*}\right)$ where $P^* = 0.75$

### Transparent Intervention Utility
$$\text{Utility}(a) = 2.0 \cdot \Delta M(a) + 0.3 \cdot P(\text{Success}) + 0.4 \cdot \text{MiscReduction} - 0.05 \cdot \text{Cost}(a) - \text{FatiguePenalty}(a)$$

---

## 3. Cold Start & Zero-Downtime Resilience
- **New Learners**: Initialized with a neutral prior $P(L_0) \approx 0.30$ and calibrated uncertainty confidence.
- **Offline / Cloud Fallback**: If the Python FastAPI service is offline, the embedded TypeScript engine in `ps6MlClient.ts` executes exact mathematical fallbacks to guarantee continuous zero-latency operation.
