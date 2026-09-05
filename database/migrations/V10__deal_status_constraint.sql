-- deals.status has driven the pipeline since V2 with no DB-level guard on its
-- values, unlike approvals.status (V5). Lock it to DealStatus now that the
-- lifecycle is stable, so a bad write can't silently park a deal outside the
-- state machine.

ALTER TABLE deals ADD CONSTRAINT deals_status_valid CHECK (status IN (
    'DRAFT', 'UNDER_EVALUATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
    'IN_NEGOTIATION', 'CONFIRMED', 'FULFILLING', 'FULFILLED', 'INVOICED', 'CANCELLED'
));
