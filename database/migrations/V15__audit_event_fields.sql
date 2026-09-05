-- Adds structured old/new value columns to the audit_events table so that the
-- AuditService can store machine-readable before/after state rather than encoding
-- it inside the opaque payload blob.

ALTER TABLE audit_events
    ADD COLUMN old_value TEXT,
    ADD COLUMN new_value TEXT,
    ADD COLUMN reason    TEXT;

-- Index for efficient per-entity audit history queries. Already indexed by
-- idx_audit_aggregate from V4 with the same column list — this migration is
-- a no-op on the MySQL port, kept only so the version number isn't skipped.
