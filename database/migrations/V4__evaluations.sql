-- Append-only record of what the engines concluded, and when.

CREATE TABLE evaluations (
    id                UUID PRIMARY KEY,
    deal_id           UUID          NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    triggered_by      VARCHAR(64)   NOT NULL,
    margin_percent    NUMERIC(7, 4),
    discount_percent  NUMERIC(7, 4),
    risk_level        VARCHAR(16),
    health_score      INTEGER,
    outcome           VARCHAR(32)   NOT NULL,
    -- Serialised violations. TEXT rather than JSONB so the shape can evolve
    -- without a migration; nothing queries into it server-side.
    policy_results    TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evaluations_deal_created ON evaluations (deal_id, created_at DESC);

CREATE TABLE decisions (
    id               UUID PRIMARY KEY,
    deal_id          UUID        NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    evaluation_id    UUID UNIQUE REFERENCES evaluations (id) ON DELETE CASCADE,
    outcome          VARCHAR(32) NOT NULL,
    rationale        TEXT        NOT NULL,
    recommendations  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decisions_deal_created ON decisions (deal_id, created_at DESC);

CREATE TABLE audit_events (
    id              UUID PRIMARY KEY,
    aggregate_type  VARCHAR(64)  NOT NULL,
    aggregate_id    UUID         NOT NULL,
    event_type      VARCHAR(64)  NOT NULL,
    actor           VARCHAR(128) NOT NULL DEFAULT 'system',
    payload         TEXT,
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_aggregate ON audit_events (aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX idx_audit_occurred ON audit_events (occurred_at DESC);
