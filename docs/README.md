# LOOM — Adaptive Story Challenge Engine

> **PS 6 · Adaptive Story Challenge — Autonomous Learning Strategy Engine** · Category: AIML
> 24-Hour AIML & Cybersecurity Hackathon (we build against a **48-hour** window)

**Tagline:** *Every learner gets a different story.*

---

## 1. What LOOM is, in one paragraph

LOOM is a decision-driven learning environment. A learner plays through a short branching story
("Signal from Kepler Station") in which every story beat is a decision point backed by a challenge in
**Linear Equations in One Variable**. Behind the story, LOOM maintains an evolving probabilistic model
of what the learner knows, which misconceptions they hold, how fast their knowledge is fading, and how
engaged they are. Before every move, a team-built agent enumerates every legal next teaching action,
**simulates** the expected outcome of each one against its own internal learner model, prices each
action against a finite budget, and commits to the action with the best expected mastery gain per unit
cost. It then observes what actually happened and re-plans.

It is **not** a chatbot tutor. No hosted LLM sits anywhere in the reasoning, prediction, planning, or
decision path. See [`Contract.md`](./Contract.md) §3.

---

## 2. What makes this a winning entry, not just a working one

| # | Differentiator | Where it lives |
|---|---|---|
| 1 | **Provable anti-circularity.** The learner simulator and the agent's estimator are different generative families, and the ground-truth parameters live in a separate Postgres schema (`sim`) that the application DB role has *no grant on*. The agent physically cannot read the answer key. | [`Simulation.md`](./Simulation.md), [`DB.md`](./DB.md) §6 |
| 2 | **A calibration panel that admits error.** We plot the agent's *estimated* mastery against the simulator's *true* hidden mastery, with ECE and Brier score. Volunteering your own error bars is the most credible thing you can put on a dashboard. | [`Dashboard_Spec.md`](./Dashboard_Spec.md) P9 |
| 3 | **Counterfactual explainability.** Every decision stores its full candidate set with scores. The UI answers "why this action, and what would have happened with the runner-up?" | [`Agent_Policy.md`](./Agent_Policy.md) §7 |
| 4 | **Four baselines, including an LLM-only tutor.** We empirically demonstrate the premise of the hackathon's own AI-API policy. | [`Evaluation.md`](./Evaluation.md) §3 |
| 5 | **8 intelligence components — 6 required + 2 bonus** — each with a model card, held-out metrics, and a documented failure mode. | [`Model_Cards.md`](./Model_Cards.md) |
| 6 | **Deterministic seeded replay.** Any run in the demo is reproducible from `(experiment_id, seed)`. Nothing on stage is a coin flip. | [`Contract.md`](./Contract.md) §7 |
| 7 | **A rubric map handed directly to judges** showing where every scoring line item is satisfied. | [`Rubric_Mapping.md`](./Rubric_Mapping.md) |

---

## 3. Document index

Read in this order if you are new to the project.

### Product & scope
| Doc | What it answers |
|---|---|
| [`PRD.md`](./PRD.md) | Who the stakeholders are, what they need, what we are and are not building, success metrics. |
| [`Contract.md`](./Contract.md) | **The locked rules.** Non-negotiable invariants for the whole project. Read this second. |
| [`User_Flow.md`](./User_Flow.md) | Every user journey, end to end, with states and edge cases. |
| [`Narrative_Design.md`](./Narrative_Design.md) | The story layer: beats, branches, and how narrative binds to pedagogy. |

### Domain & data
| Doc | What it answers |
|---|---|
| [`Concept_Graph.md`](./Concept_Graph.md) | The 10 concepts, the prerequisite DAG, the 8-misconception taxonomy, the item bank spec. |
| [`Data.md`](./Data.md) | Every data source, how it is produced, its provenance, and its licence. |
| [`DB.md`](./DB.md) | Neon Postgres: schemas, full DDL, indexes, roles, migrations, connection handling. |

### System
| Doc | What it answers |
|---|---|
| [`Architecture.md`](./Architecture.md) | System shape, component diagram, request/decision data flow, deployment. |
| [`Spec.md`](./Spec.md) | Every agent, model, and service — what it does and which flow it serves. |
| [`Agent_Policy.md`](./Agent_Policy.md) | The decision mathematics: state, action space, utility, lookahead, re-planning. |
| [`Model_Cards.md`](./Model_Cards.md) | One card per intelligence component. |
| [`Simulation.md`](./Simulation.md) | The learner simulator, the 7 profiles, and the anti-circularity guarantee. |
| [`API.md`](./API.md) | REST + WebSocket contract with payload schemas. |
| [`Technical_Documentation.md`](./Technical_Documentation.md) | Repo layout, module responsibilities, algorithms, setup, runbook. |
| [`Dashboard_Spec.md`](./Dashboard_Spec.md) | Every panel, its data source, and its explainability duty. |

### Process & delivery
| Doc | What it answers |
|---|---|
| [`Design_Decisions.md`](./Design_Decisions.md) | The ADR log — every significant choice, with alternatives and consequences. |
| [`Evaluation.md`](./Evaluation.md) | Baselines, metrics, experiment protocol, ablations, the headline claim. |
| [`Execution_Plan.md`](./Execution_Plan.md) | The hour-by-hour 48-hour plan with gates and cut lines. |
| [`Testing.md`](./Testing.md) | Test strategy and the pre-demo checklist. |
| [`Risks.md`](./Risks.md) | Risk register with mitigations and triggers. |
| [`Rubric_Mapping.md`](./Rubric_Mapping.md) | Rubric line item to evidence location. |
| [`Demo_Script.md`](./Demo_Script.md) | The 5-minute run of show and judge Q&A prep. |
| [`Glossary.md`](./Glossary.md) | Terms and symbols. |

---

## 4. Quickstart

Backend:

```bash
cd backend && python -m venv .venv && . .venv/Scripts/activate && pip install -r requirements.txt
```

Configure and migrate:

```bash
cp .env.example .env && alembic upgrade head && python -m loom.content.seed
```

Train the eight intelligence components from the pretraining cohort:

```bash
python -m loom.ml.train_all --cohort 4000 --seed 7
```

Run the headline experiment (LOOM vs 4 baselines, 500 learners x 5 seeds):

```bash
python -m loom.experiments.run --config configs/headline.yaml
```

Serve the API:

```bash
uvicorn loom.api.main:app --reload --port 8000
```

Serve the dashboard:

```bash
cd frontend && npm install && npm run dev
```

Full setup, environment variables, and troubleshooting: [`Technical_Documentation.md`](./Technical_Documentation.md) §9.

---

## 5. Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, Recharts, React Flow, Zustand | Matches the suggested stack; React Flow gives the concept graph for free. |
| Backend | FastAPI (Python 3.11), Pydantic v2, SQLAlchemy 2.0, Alembic | Matches the suggested stack; one language across API, agent, and ML. |
| ML | numpy, scipy, scikit-learn, xgboost | Matches the suggested stack. Everything trains in under 3 minutes on a laptop. |
| DB | **Neon** serverless Postgres | Managed, branchable, zero ops during a hackathon. See [`DB.md`](./DB.md). |
| Optional LLM | Local Hugging Face model, feature-flagged **off** | Narrative flavour text only. Never in the decision path. |

---

## 6. Team conventions

- Every non-obvious design choice gets an ADR in [`Design_Decisions.md`](./Design_Decisions.md).
- If a doc and the code disagree, **the doc is a bug report**. Fix one of them within the hour.
- Nothing merges to `main` that breaks `make check` (lint + types + unit tests + one smoke session).
- The demo runs from seeds committed in `configs/`. Never from a live random draw.
