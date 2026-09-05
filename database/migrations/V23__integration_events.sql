-- Commit 24: idempotency for inbound Odoo/OEEG webhook events.

CREATE TABLE processed_integration_events (
    id                CHAR(36)     PRIMARY KEY,
    external_event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type        VARCHAR(64)  NOT NULL,
    result            VARCHAR(16)  NOT NULL,
    occurred_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
