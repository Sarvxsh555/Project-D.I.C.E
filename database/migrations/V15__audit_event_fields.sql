-- Adds structured old/new value columns to the audit_events table so that the
-- AuditService can store machine-readable before/after state rather than encoding
-- it inside the opaque payload blob.

ALTER TABLE audit_events
    ADD COLUMN old_value TEXT,
    ADD COLUMN new_value TEXT,
    ADD COLUMN reason    TEXT;

-- Index for efficient per-entity audit history queries.
CREATE INDEX IF NOT EXISTS idx_audit_events_aggregate
    ON audit_events (aggregate_type, aggregate_id, occurred_at DESC);
