-- Extend approval_snapshots with the fields needed for material-change comparison:
--   deal_version     : the JPA @Version counter at snapshot time, so the pipeline
--                      can detect that the deal row changed after approval.
--   discount_percent : blended discount at snapshot time (derived, but captured for
--                      direct comparison without re-loading deal lines).
--   risk_level       : risk classification at approval time.
--   approval_level   : which chain level finalised this snapshot.

ALTER TABLE approval_snapshots
    ADD COLUMN deal_version     BIGINT,
    ADD COLUMN discount_percent NUMERIC(7, 4),
    ADD COLUMN risk_level       VARCHAR(16),
    ADD COLUMN approval_level   VARCHAR(32);

-- Existing rows pre-date these columns; allow NULLs so Flyway doesn't fail on live data.
-- New rows written by ApprovalService will always populate them.
