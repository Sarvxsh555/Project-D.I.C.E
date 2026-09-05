-- Append-only record of what the engines concluded, and when.

CREATE TABLE evaluations (
    id                CHAR(36)      PRIMARY KEY,
    deal_id           CHAR(36)      NOT NULL,
    triggered_by      VARCHAR(64)   NOT NULL,
    margin_percent    NUMERIC(7, 4),
    discount_percent  NUMERIC(7, 4),
    risk_level        VARCHAR(16),
    health_score      INTEGER,
    outcome           VARCHAR(32)   NOT NULL,
    -- Serialised violations. TEXT rather than JSON so the shape can evolve
    -- without a migration; nothing queries into it server-side.
    policy_results    TEXT,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evaluations_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
);

CREATE INDEX idx_evaluations_deal_created ON evaluations (deal_id, created_at DESC);

CREATE TABLE decisions (
    id               CHAR(36)    PRIMARY KEY,
    deal_id          CHAR(36)    NOT NULL,
    evaluation_id    CHAR(36)    UNIQUE,
    outcome          VARCHAR(32) NOT NULL,
    rationale        TEXT        NOT NULL,
    recommendations  TEXT,
    created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_decisions_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_decisions_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE
);

CREATE INDEX idx_decisions_deal_created ON decisions (deal_id, created_at DESC);

CREATE TABLE audit_events (
    id              CHAR(36)     PRIMARY KEY,
    aggregate_type  VARCHAR(64)  NOT NULL,
    aggregate_id    CHAR(36)     NOT NULL,
    event_type      VARCHAR(64)  NOT NULL,
    actor           VARCHAR(128) NOT NULL DEFAULT 'system',
    payload         TEXT,
    occurred_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_aggregate ON audit_events (aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX idx_audit_occurred ON audit_events (occurred_at DESC);
