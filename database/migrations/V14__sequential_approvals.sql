-- DealFlow360 sequential quotation approval chain (SALES_MANAGER then
-- FINANCE_OPERATIONS), layered alongside the existing per-policy-violation
-- approvals rather than replacing them — approval_level is null for those.

ALTER TABLE approvals ADD COLUMN approval_level VARCHAR(32);

ALTER TABLE approvals
    ADD CONSTRAINT approvals_level_valid
        CHECK (approval_level IS NULL OR approval_level IN ('SALES_MANAGER', 'FINANCE_OPERATIONS'));

CREATE INDEX idx_approvals_level ON approvals (deal_id, approval_level, status);

ALTER TABLE approvals DROP CONSTRAINT approvals_status_valid;
ALTER TABLE approvals ADD CONSTRAINT approvals_status_valid CHECK (status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'ESCALATED', 'WITHDRAWN'));

-- Every decided request (approve/reject/return) must say why.
ALTER TABLE approvals DROP CONSTRAINT approvals_decided_has_actor;
ALTER TABLE approvals ADD CONSTRAINT approvals_decided_has_actor CHECK (
    status IN ('PENDING', 'ESCALATED') OR decided_by IS NOT NULL);
ALTER TABLE approvals ADD CONSTRAINT approvals_decided_has_reason CHECK (
    status IN ('PENDING', 'ESCALATED') OR (reason IS NOT NULL AND TRIM(reason) <> ''));

ALTER TABLE deals DROP CONSTRAINT deals_status_valid;
ALTER TABLE deals ADD CONSTRAINT deals_status_valid CHECK (status IN (
    'DRAFT', 'UNDER_EVALUATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
    'RETURNED_FOR_REVISION', 'IN_NEGOTIATION', 'CONFIRMED', 'FULFILLING',
    'FULFILLED', 'INVOICED', 'CANCELLED'
));
