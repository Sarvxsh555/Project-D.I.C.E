-- Commit 24: idempotency for inbound Odoo/OEEG webhook events.

CREATE TABLE processed_integration_events (
    id                UUID PRIMARY KEY,
    external_event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type        VARCHAR(64)  NOT NULL,
    result            VARCHAR(16)  NOT NULL,
    occurred_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
