-- Sign-off requests raised by the approval engine.

CREATE TABLE approvals (
    id             UUID PRIMARY KEY,
    deal_id        UUID        NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    evaluation_id  UUID REFERENCES evaluations (id) ON DELETE SET NULL,
    -- Comma-separated when several breaches route to the same role.
    policy_code    VARCHAR(64),
    required_role  VARCHAR(64) NOT NULL,
    status         VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    requested_by   VARCHAR(128),
    decided_by     VARCHAR(128),
    reason         TEXT,
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sla_due_at     TIMESTAMPTZ,
    decided_at     TIMESTAMPTZ,

    CONSTRAINT approvals_status_valid CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'WITHDRAWN')),
    -- A decided request must say who decided it.
    CONSTRAINT approvals_decided_has_actor CHECK (
        status IN ('PENDING', 'ESCALATED') OR decided_by IS NOT NULL)
);

CREATE INDEX idx_approvals_deal ON approvals (deal_id);
-- The approver's inbox query.
CREATE INDEX idx_approvals_queue ON approvals (required_role, status, requested_at);
