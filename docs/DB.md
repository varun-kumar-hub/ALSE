# Database — Neon Postgres

**Engine:** Postgres 16 on [Neon](https://neon.tech) (serverless, branchable).
**Local mirror:** Postgres 16 in Docker, restored from a `pg_dump` snapshot, used for the demo.
**Migrations:** Alembic, forward-only. Nobody edits the database by hand
([`Contract.md`](./Contract.md) C10.6).

---

## 1. Why Neon

| Reason | Detail |
|---|---|
| Zero ops | No provisioning, no backups to configure. In a 48-hour build, database administration time is time lost. |
| **Branching** | `neon branches create --name feat/agent-v2` gives an instant copy-on-write branch of the whole database. Each team member develops against their own branch; nobody destroys anyone's data. This alone justifies the choice. |
| Serverless scale-to-zero | Free tier is sufficient for the whole project. |
| Standard Postgres | Schemas, roles, `GRANT`, window functions, `jsonb` — everything the anti-circularity design depends on. |

**The tradeoff we accept:** cold-start latency of 300 ms to several seconds on the first connection
after idle. Mitigations in §8. For the demo we do not depend on Neon at all (§9).

---

## 2. Schema layout

Three schemas, and the separation between them is a **security boundary**, not organisation.

| Schema | Contents | Written by | Readable by `loom_app` |
|---|---|---|---|
| `content` | Concepts, edges, misconceptions, items, options, hints, explanations, story nodes | Seeder | **Yes** (read-only) |
| `app` | Sessions, interactions, state snapshots, decisions, candidate sets, beliefs, models, experiments | Application + harness | **Yes** (read/write) |
| `sim` | **Ground truth.** Simulated learner parameters and true trajectories | Simulator only | **NO — no `USAGE` grant** |

```
┌─────────────────┐   ┌─────────────────────────┐   ┌──────────────────────┐
│    content      │   │          app            │   │         sim          │
│  (read-only)    │   │   (agent's whole world) │   │   (ground truth)     │
│                 │   │                         │   │                      │
│  concepts       │   │  sessions               │   │  cohorts             │
│  concept_edges  │◄──┤  interactions           │   │  learner_truth       │
│  misconceptions │   │  session_state_snapshots│   │  learner_truth_traj  │
│  items          │   │  mastery_estimates      │   │  learner_misconcep.  │
│  item_options   │   │  misconception_beliefs  │   │  sim_item_params     │
│  hints          │   │  decisions              │   │                      │
│  explanations   │   │  actions_considered     │   │                      │
│  story_nodes    │   │  model_registry         │   │                      │
│  story_edges    │   │  model_metrics          │   │                      │
│                 │   │  experiments            │   │                      │
│                 │   │  experiment_runs        │   │                      │
│                 │   │  run_metrics            │   │                      │
│                 │   │  llm_calls              │   │                      │
└─────────────────┘   └─────────────────────────┘   └──────────────────────┘
        ▲                        ▲                             ▲
        │                        │                             │
   loom_app: SELECT      loom_app: ALL              loom_app: ✗ DENIED
   loom_eval: SELECT     loom_eval: SELECT          loom_eval: SELECT
   loom_sim:  SELECT     loom_sim:  SELECT          loom_sim:  ALL
```

---

## 3. DDL — `content` schema

```sql
CREATE SCHEMA IF NOT EXISTS content;

CREATE TABLE content.concepts (
    id                TEXT PRIMARY KEY,              -- 'C1'..'C10'
    name              TEXT NOT NULL,
    definition        TEXT NOT NULL,
    curriculum_weight NUMERIC(4,3) NOT NULL CHECK (curriculum_weight > 0),
    dag_depth         SMALLINT NOT NULL,
    display_order     SMALLINT NOT NULL,
    explanation_md    TEXT NOT NULL,                 -- payload of TEACH
    revision_md       TEXT NOT NULL                  -- payload of REVISE
);

CREATE TABLE content.concept_edges (
    parent_id  TEXT NOT NULL REFERENCES content.concepts(id),
    child_id   TEXT NOT NULL REFERENCES content.concepts(id),
    tau        NUMERIC(4,3) NOT NULL CHECK (tau > 0 AND tau < 1),
    PRIMARY KEY (parent_id, child_id),
    CHECK (parent_id <> child_id)
);

CREATE TABLE content.misconceptions (
    id                   TEXT PRIMARY KEY,           -- 'M1'..'M8'
    name                 TEXT NOT NULL,
    faulty_rule          TEXT NOT NULL,
    signature_error      TEXT NOT NULL,
    primary_concepts     TEXT[] NOT NULL,
    remedy_md            TEXT NOT NULL,              -- payload of EXPLAIN (contrast case)
    remediation_strength NUMERIC(4,3) NOT NULL,      -- simulator uses this; agent estimates its own
    incidental_decay     NUMERIC(4,3) NOT NULL
);

CREATE TYPE content.item_role AS ENUM ('teach', 'probe');

CREATE TABLE content.items (
    id                   TEXT PRIMARY KEY,           -- 'IT-C7-02'
    concept_id           TEXT NOT NULL REFERENCES content.concepts(id),
    secondary_concepts   TEXT[] NOT NULL DEFAULT '{}',
    role                 content.item_role NOT NULL,
    stem                 TEXT NOT NULL,
    difficulty_prior     NUMERIC(5,3) NOT NULL,      -- authored IRT b, NEVER overwritten
    discrimination_prior NUMERIC(5,3) NOT NULL,      -- authored IRT a
    narrative_slot       TEXT,
    explanation_md       TEXT NOT NULL,
    contrasts_misconception TEXT REFERENCES content.misconceptions(id)
);

CREATE TABLE content.item_options (
    item_id         TEXT NOT NULL REFERENCES content.items(id) ON DELETE CASCADE,
    option_id       CHAR(1) NOT NULL,                -- 'A'..'D'
    text            TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    misconception_id TEXT REFERENCES content.misconceptions(id),   -- NULL or exactly one (C6.4)
    PRIMARY KEY (item_id, option_id),
    CHECK (NOT (is_correct AND misconception_id IS NOT NULL))
);

-- Invariant I1: exactly one correct option per item
CREATE UNIQUE INDEX ux_item_one_correct
    ON content.item_options (item_id) WHERE is_correct;

CREATE TABLE content.hints (
    item_id  TEXT NOT NULL REFERENCES content.items(id) ON DELETE CASCADE,
    level    SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    text     TEXT NOT NULL,
    PRIMARY KEY (item_id, level)
);

CREATE TABLE content.story_nodes (
    id            TEXT PRIMARY KEY,                  -- 'beat_01'
    beat_index    SMALLINT NOT NULL,
    branch_id     TEXT NOT NULL,                     -- 'applied' | 'abstract' | 'visual'
    title         TEXT NOT NULL,
    narrative_md  TEXT NOT NULL,
    objective     TEXT NOT NULL,
    UNIQUE (beat_index, branch_id)
);

CREATE TABLE content.story_edges (
    from_node TEXT NOT NULL REFERENCES content.story_nodes(id),
    to_node   TEXT NOT NULL REFERENCES content.story_nodes(id),
    condition TEXT,                                   -- human-readable branch condition
    PRIMARY KEY (from_node, to_node)
);
```

---

## 4. DDL — `app` schema

```sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE TYPE app.session_status AS ENUM ('active','completed','abandoned','budget_exhausted');
CREATE TYPE app.action_type    AS ENUM
    ('ASSESS','TEACH','REVISE','HINT','EXPLAIN','EASIER','HARDER','BRANCH','CONSOLIDATE');
CREATE TYPE app.actor_kind     AS ENUM ('human','simulated');

CREATE TABLE app.sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_kind        app.actor_kind NOT NULL,
    policy_id         TEXT NOT NULL,                 -- 'LOOM' | 'B0' | 'B1' | 'B2' | 'B3' | 'B4'
    experiment_run_id UUID,                          -- FK added after experiment_runs
    learner_seed      BIGINT,
    model_version_set JSONB NOT NULL,                -- {"M1":"1.2.0", ...} — reproducibility (C7.1)
    energy_total      NUMERIC(6,2) NOT NULL DEFAULT 100,
    energy_remaining  NUMERIC(6,2) NOT NULL DEFAULT 100,
    interactions_total     SMALLINT NOT NULL DEFAULT 25,
    interactions_remaining SMALLINT NOT NULL DEFAULT 25,
    current_story_node TEXT REFERENCES content.story_nodes(id),
    current_branch     TEXT,
    step               INTEGER NOT NULL DEFAULT 0,
    status             app.session_status NOT NULL DEFAULT 'active',
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at           TIMESTAMPTZ,
    CHECK (energy_remaining >= 0),
    CHECK (interactions_remaining >= 0)
);

CREATE TABLE app.interactions (
    id               BIGSERIAL PRIMARY KEY,
    session_id       UUID NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
    step             INTEGER NOT NULL,
    item_id          TEXT REFERENCES content.items(id),
    chosen_option_id CHAR(1),
    is_correct       BOOLEAN,
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    hints_used       SMALLINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, step)
);

-- The team-built state engine, snapshotted. Makes the trajectory replayable (Architecture §5).
CREATE TABLE app.session_state_snapshots (
    session_id        UUID NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
    step              INTEGER NOT NULL,
    weighted_mastery  NUMERIC(6,4) NOT NULL,
    weighted_mastery_lcb NUMERIC(6,4) NOT NULL,
    theta             NUMERIC(6,3) NOT NULL,
    engagement        NUMERIC(4,3) NOT NULL,
    gaming_prob       NUMERIC(4,3) NOT NULL,
    fatigue           NUMERIC(4,3) NOT NULL,
    archetype         TEXT,
    archetype_posterior JSONB,
    energy_remaining  NUMERIC(6,2) NOT NULL,
    state_blob        JSONB NOT NULL,                -- full LearnerState for exact replay
    PRIMARY KEY (session_id, step)
);

CREATE TABLE app.mastery_estimates (
    session_id UUID NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
    step       INTEGER NOT NULL,
    concept_id TEXT NOT NULL REFERENCES content.concepts(id),
    mean       NUMERIC(6,4) NOT NULL,
    variance   NUMERIC(6,5) NOT NULL,
    n_evidence SMALLINT NOT NULL,
    PRIMARY KEY (session_id, step, concept_id)
);

CREATE TABLE app.misconception_beliefs (
    session_id       UUID NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
    step             INTEGER NOT NULL,
    misconception_id TEXT NOT NULL REFERENCES content.misconceptions(id),
    posterior        NUMERIC(6,4) NOT NULL,
    evidence_count   SMALLINT NOT NULL DEFAULT 0,
    remediated_at_step INTEGER,
    PRIMARY KEY (session_id, step, misconception_id)
);

CREATE TABLE app.decisions (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          UUID NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
    step                INTEGER NOT NULL,
    selected_action     app.action_type NOT NULL,
    action_params       JSONB NOT NULL,
    cost                NUMERIC(5,2) NOT NULL,
    utility             NUMERIC(8,5) NOT NULL,
    predicted_gain      NUMERIC(8,5) NOT NULL,
    exploration_value   NUMERIC(8,5) NOT NULL,
    risk_value          NUMERIC(8,5) NOT NULL,
    candidates_count    SMALLINT NOT NULL CHECK (candidates_count >= 3),  -- C5.2 enforced in DDL
    trigger_fired       TEXT,                        -- 'T1'..'T5' or NULL
    ranker_disagreement BOOLEAN NOT NULL DEFAULT FALSE,
    rationale           JSONB NOT NULL,              -- Agent_Policy §7 structure
    decision_ms         INTEGER NOT NULL,            -- latency, for NFR-1 evidence
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, step)
);

-- The explainability table. Every alternative the agent weighed (C5.3).
CREATE TABLE app.actions_considered (
    decision_id       BIGINT NOT NULL REFERENCES app.decisions(id) ON DELETE CASCADE,
    rank              SMALLINT NOT NULL,
    action_type       app.action_type NOT NULL,
    action_params     JSONB NOT NULL,
    cost              NUMERIC(5,2) NOT NULL,
    predicted_gain_model   NUMERIC(8,5) NOT NULL,    -- M5
    predicted_gain_rollout NUMERIC(8,5) NOT NULL,    -- planner
    exploration_value NUMERIC(8,5) NOT NULL,
    risk_value        NUMERIC(8,5) NOT NULL,
    ranker_score      NUMERIC(8,5),                  -- M6
    utility           NUMERIC(8,5) NOT NULL,
    selected          BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (decision_id, rank)
);

CREATE TABLE app.model_registry (
    id             TEXT PRIMARY KEY,                 -- 'M3'
    name           TEXT NOT NULL,
    version        TEXT NOT NULL,
    family         TEXT NOT NULL,
    artifact_path  TEXT NOT NULL,
    config_hash    TEXT NOT NULL,
    trained_at     TIMESTAMPTZ NOT NULL,
    training_rows  INTEGER NOT NULL,
    is_required    BOOLEAN NOT NULL,                 -- 6 required, 2 bonus
    UNIQUE (id, version)
);

CREATE TABLE app.model_metrics (
    model_id   TEXT NOT NULL,
    version    TEXT NOT NULL,
    metric     TEXT NOT NULL,                        -- 'auc','macro_f1','rmse','ndcg@3'
    value      NUMERIC(10,5) NOT NULL,
    baseline   NUMERIC(10,5),                        -- what we beat
    split      TEXT NOT NULL,                        -- 'holdout' | 'cv'
    PRIMARY KEY (model_id, version, metric, split),
    FOREIGN KEY (model_id, version) REFERENCES app.model_registry(id, version)
);

CREATE TABLE app.experiments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    config_yaml  TEXT NOT NULL,                      -- the whole config, inlined (C7.3)
    config_hash  TEXT NOT NULL,
    n_learners   INTEGER NOT NULL,
    seeds        BIGINT[] NOT NULL,
    policies     TEXT[] NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE app.experiment_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES app.experiments(id) ON DELETE CASCADE,
    policy_id     TEXT NOT NULL,
    learner_seed  BIGINT NOT NULL,
    profile_id    TEXT NOT NULL,
    session_id    UUID REFERENCES app.sessions(id),
    UNIQUE (experiment_id, policy_id, learner_seed)
);

ALTER TABLE app.sessions
    ADD CONSTRAINT fk_sessions_run
    FOREIGN KEY (experiment_run_id) REFERENCES app.experiment_runs(id) ON DELETE SET NULL;

CREATE TABLE app.run_metrics (
    run_id UUID NOT NULL REFERENCES app.experiment_runs(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value  NUMERIC(12,6) NOT NULL,
    PRIMARY KEY (run_id, metric)
);

-- Exists so a judge can see it is empty (C3.3).
CREATE TABLE app.llm_calls (
    id         BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES app.sessions(id) ON DELETE CASCADE,
    purpose    TEXT NOT NULL CHECK (purpose IN ('narrative_flavor')),
    model_name TEXT NOT NULL,
    is_local   BOOLEAN NOT NULL,
    input_text TEXT NOT NULL,
    output_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. DDL — `sim` schema (ground truth)

```sql
CREATE SCHEMA IF NOT EXISTS sim;

CREATE TABLE sim.cohorts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    seed        BIGINT NOT NULL,
    profile_mix JSONB NOT NULL,
    n_learners  INTEGER NOT NULL,
    purpose     TEXT NOT NULL CHECK (purpose IN ('pretraining','development','evaluation')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sim.learner_truth (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id     UUID NOT NULL REFERENCES sim.cohorts(id) ON DELETE CASCADE,
    learner_seed  BIGINT NOT NULL,
    profile_id    TEXT NOT NULL,
    theta_true    JSONB NOT NULL,       -- {concept: float}
    learn_rate    JSONB NOT NULL,
    forget_rate   NUMERIC(5,4) NOT NULL,
    transfer      NUMERIC(5,4) NOT NULL,
    slip          NUMERIC(5,4) NOT NULL,
    guess_skill   NUMERIC(5,4) NOT NULL,
    fatigue_rate  NUMERIC(5,4) NOT NULL,
    hint_reliance NUMERIC(5,4) NOT NULL,
    reading_speed NUMERIC(5,3) NOT NULL,
    UNIQUE (cohort_id, learner_seed)
);

CREATE TABLE sim.learner_misconceptions (
    learner_id       UUID NOT NULL REFERENCES sim.learner_truth(id) ON DELETE CASCADE,
    misconception_id TEXT NOT NULL,
    initial_strength NUMERIC(5,4) NOT NULL,
    PRIMARY KEY (learner_id, misconception_id)
);

-- True trajectory, written per step. Joined ONLY by loom_eval, ONLY after a run (C4.5).
CREATE TABLE sim.learner_truth_trajectory (
    session_id            UUID NOT NULL,
    step                  INTEGER NOT NULL,
    true_weighted_mastery NUMERIC(6,4) NOT NULL,
    theta_true            JSONB NOT NULL,
    misconception_strength JSONB NOT NULL,
    engagement_true       NUMERIC(5,4) NOT NULL,
    PRIMARY KEY (session_id, step)
);

-- Simulator's item parameters: authored prior + noise. The agent's M4 must ESTIMATE these.
CREATE TABLE sim.sim_item_params (
    cohort_id UUID NOT NULL REFERENCES sim.cohorts(id) ON DELETE CASCADE,
    item_id   TEXT NOT NULL,
    a_true    NUMERIC(6,3) NOT NULL,
    b_true    NUMERIC(6,3) NOT NULL,
    PRIMARY KEY (cohort_id, item_id)
);
```

---

## 6. Roles and grants — the enforced boundary

This is [`Contract.md`](./Contract.md) C4.3 in executable form. It is the single most valuable
twenty lines of SQL in the project.

```sql
CREATE ROLE loom_app  LOGIN PASSWORD :'app_password';
CREATE ROLE loom_sim  LOGIN PASSWORD :'sim_password';
CREATE ROLE loom_eval LOGIN PASSWORD :'eval_password';

-- Application: full access to app, read-only content, NOTHING on sim.
GRANT USAGE ON SCHEMA app, content TO loom_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app     TO loom_app;
GRANT SELECT                          ON ALL TABLES IN SCHEMA content TO loom_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO loom_app;
-- Deliberately absent: GRANT USAGE ON SCHEMA sim TO loom_app;
REVOKE ALL ON SCHEMA sim FROM loom_app;

-- Simulator: owns sim, reads content, writes nothing in app.
GRANT USAGE ON SCHEMA sim, content, app TO loom_sim;
GRANT ALL    ON ALL TABLES IN SCHEMA sim     TO loom_sim;
GRANT SELECT ON ALL TABLES IN SCHEMA content TO loom_sim;
GRANT SELECT ON ALL TABLES IN SCHEMA app     TO loom_sim;

-- Evaluation harness: read everything, write nothing. The only role that may join app x sim.
GRANT USAGE  ON SCHEMA app, content, sim TO loom_eval;
GRANT SELECT ON ALL TABLES IN SCHEMA app, content, sim TO loom_eval;

-- Future tables inherit the same policy.
ALTER DEFAULT PRIVILEGES IN SCHEMA sim REVOKE ALL ON TABLES FROM loom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO loom_app;
```

**The demo verification.** Run this on stage:

```bash
psql "$LOOM_APP_DATABASE_URL" -c "SELECT count(*) FROM sim.learner_truth;"
```

Expected output — and this is the point:

```
ERROR:  permission denied for schema sim
LINE 1: SELECT count(*) FROM sim.learner_truth;
```

A test asserts this too (`tests/test_permission_boundary.py`), so a migration can never silently
loosen it.

---

## 7. Indexes and read models

```sql
CREATE INDEX ix_interactions_session_step   ON app.interactions (session_id, step);
CREATE INDEX ix_decisions_session_step      ON app.decisions (session_id, step);
CREATE INDEX ix_mastery_session_concept     ON app.mastery_estimates (session_id, concept_id, step);
CREATE INDEX ix_misbelief_session_step      ON app.misconception_beliefs (session_id, step);
CREATE INDEX ix_runs_experiment_policy      ON app.experiment_runs (experiment_id, policy_id);
CREATE INDEX ix_run_metrics_metric          ON app.run_metrics (metric);
CREATE INDEX ix_sessions_run                ON app.sessions (experiment_run_id);
CREATE INDEX ix_decisions_trigger           ON app.decisions (trigger_fired) WHERE trigger_fired IS NOT NULL;
```

### Views the dashboard reads (Architecture principle A6)

```sql
-- Learning trajectory panel: one row per step, everything the timeline needs.
CREATE VIEW app.v_session_trajectory AS
SELECT s.session_id, s.step, s.weighted_mastery, s.weighted_mastery_lcb, s.theta,
       s.engagement, s.energy_remaining,
       d.selected_action, d.action_params, d.cost, d.utility,
       d.predicted_gain, d.trigger_fired, d.candidates_count, d.rationale,
       i.item_id, i.is_correct, i.response_time_ms, i.hints_used
FROM app.session_state_snapshots s
LEFT JOIN app.decisions    d ON d.session_id = s.session_id AND d.step = s.step
LEFT JOIN app.interactions i ON i.session_id = s.session_id AND i.step = s.step;

-- Chosen-interventions panel: action mix per policy.
CREATE VIEW app.v_policy_action_mix AS
SELECT se.policy_id, r.profile_id, d.selected_action, count(*) AS n,
       count(*)::NUMERIC / sum(count(*)) OVER (PARTITION BY se.policy_id, r.profile_id) AS share
FROM app.decisions d
JOIN app.sessions se ON se.id = d.session_id
LEFT JOIN app.experiment_runs r ON r.id = se.experiment_run_id
GROUP BY se.policy_id, r.profile_id, d.selected_action;

-- Baseline comparison panel: mean and 95% CI per policy per metric.
CREATE VIEW app.v_policy_outcomes AS
SELECT r.policy_id, m.metric,
       avg(m.value)                                   AS mean,
       stddev_samp(m.value)                           AS sd,
       count(*)                                       AS n,
       avg(m.value) - 1.96 * stddev_samp(m.value)/sqrt(count(*)) AS ci_low,
       avg(m.value) + 1.96 * stddev_samp(m.value)/sqrt(count(*)) AS ci_high
FROM app.run_metrics m
JOIN app.experiment_runs r ON r.id = m.run_id
GROUP BY r.policy_id, m.metric;
```

**The calibration view lives in the `sim`-readable world only** and is created owned by `loom_eval`:

```sql
CREATE VIEW sim.v_calibration AS
SELECT me.session_id, me.step, me.concept_id,
       me.mean                                       AS estimated,
       (t.theta_true ->> me.concept_id)::NUMERIC     AS truth,
       me.mean - (t.theta_true ->> me.concept_id)::NUMERIC AS error
FROM app.mastery_estimates me
JOIN sim.learner_truth_trajectory t
  ON t.session_id = me.session_id AND t.step = me.step;
```

Its results are **materialised into `app.run_metrics`** after a run, so the dashboard (running as
`loom_app`) can show the calibration panel without ever holding a grant on `sim`. This is the design
detail that makes the honesty panel possible without breaking the boundary — worth pointing out.

---

## 8. Connection handling

```python
# loom/repo/engine.py
engine = create_async_engine(
    settings.database_url,          # Neon POOLED endpoint: ...-pooler.neon.tech
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,             # Neon idle connections get closed; this survives that
    pool_recycle=280,               # under Neon's ~300s idle timeout
    connect_args={"ssl": "require", "server_settings": {"application_name": "loom"}},
)
```

| Concern | Handling |
|---|---|
| **Cold start** | A startup task issues `SELECT 1` so the first real request is not the one that pays the wake-up cost. |
| **Idle disconnects** | `pool_pre_ping=True` and `pool_recycle=280`. |
| **Connection limits** | Use the **pooled** Neon endpoint (`-pooler`) for the app; the **direct** endpoint for Alembic migrations, since PgBouncer in transaction mode does not support all DDL session state. |
| **Bulk writes from the harness** | The experiment runner buffers 2,000 rows and uses `execute_many` / `COPY`. Per-step commits would make a 12-minute experiment a 90-minute one. |
| **Transactions** | One transaction per learner step in the live path: interaction + snapshot + estimates + decision + candidates commit together, or not at all. A half-written step would corrupt the trajectory. |

**Environment variables:**

```
LOOM_DATABASE_URL=postgresql+asyncpg://loom_app:***@ep-xxx-pooler.region.aws.neon.tech/loom?sslmode=require
LOOM_MIGRATION_URL=postgresql://loom_app:***@ep-xxx.region.aws.neon.tech/loom?sslmode=require
LOOM_SIM_DATABASE_URL=postgresql://loom_sim:***@ep-xxx.region.aws.neon.tech/loom?sslmode=require
LOOM_EVAL_DATABASE_URL=postgresql://loom_eval:***@ep-xxx.region.aws.neon.tech/loom?sslmode=require
```

---

## 9. Branching, snapshots, and the demo plan

**During the build** — each member works on a Neon branch off `main`:

```bash
neonctl branches create --name dev-santh --parent main
```

Branches are copy-on-write and instant, so a destructive migration experiment costs nothing.

**Before the demo** — freeze and localise:

```bash
pg_dump "$LOOM_EVAL_DATABASE_URL" --schema=content --schema=app --schema=sim -Fc -f snapshots/demo.dump
```

Then restore into local Docker Postgres and point the demo at it. Rationale: the demo must not depend
on venue wifi or a Neon cold start ([`Contract.md`](./Contract.md) C8.4, NFR-6). The snapshot is
committed (it is a few MB) so it can be restored from a USB stick if the laptop dies.

```bash
docker run -d --name loom-db -e POSTGRES_PASSWORD=loom -p 5432:5432 postgres:16
```

```bash
pg_restore -d "postgresql://postgres:loom@localhost:5432/loom" --create snapshots/demo.dump
```

---

## 10. Migration discipline

| Rule | Reason |
|---|---|
| Alembic only, forward-only, no downgrades written | Downgrades are never tested and give false confidence. |
| One migration per logical change, with a descriptive slug | `alembic revision -m "add_actions_considered"` |
| Grants live in a migration, not in a README | Otherwise the boundary is lost the first time someone recreates the DB. |
| Migrations run against the **direct** endpoint | PgBouncer transaction pooling breaks some DDL. |
| The seeder is idempotent (`ON CONFLICT DO UPDATE`) | Re-running it is a normal operation, not a repair. |

**Migration order:**

| # | Migration | Contents |
|---|---|---|
| 001 | `create_schemas_and_roles` | Schemas, roles, grants (§6) |
| 002 | `content_tables` | §3 |
| 003 | `app_core` | sessions, interactions, snapshots |
| 004 | `app_beliefs` | mastery_estimates, misconception_beliefs |
| 005 | `app_decisions` | decisions, actions_considered |
| 006 | `app_models_experiments` | registry, metrics, experiments, runs |
| 007 | `sim_tables` | §5 |
| 008 | `views_and_indexes` | §7 |
| 009 | `llm_calls` | §4 |

---

## 11. Data volume estimate

| Table | Rows after the headline experiment | Note |
|---|---|---|
| `app.sessions` | 900 learners x 5 policies x 5 seeds = 22,500 | |
| `app.interactions` | ~450,000 | ~20 steps per session |
| `app.session_state_snapshots` | ~450,000 | `state_blob` jsonb is the bulk of storage |
| `app.mastery_estimates` | ~4,500,000 | 10 concepts per step — **the big table** |
| `app.decisions` | ~450,000 | |
| `app.actions_considered` | ~3,600,000 | ~8 candidates per decision |
| `sim.learner_truth_trajectory` | ~450,000 | |
| **Estimated size** | **~3–5 GB** | Exceeds the Neon free tier (0.5 GB) |

**Mitigation, decided up front:** the harness writes **per-step detail only for a sampled 5% of runs**
(`config.detail_sample_rate`), plus 100% of a designated "showcase" cohort of 40 sessions used in the
demo. Aggregate `run_metrics` are always written for every run. This keeps the database near 300 MB
while preserving both the statistics and the drill-down. The sampling rate is recorded on the
experiment row so the provenance of every chart is unambiguous.
