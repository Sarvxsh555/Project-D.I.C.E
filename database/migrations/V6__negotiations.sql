-- Counter-offer history. The engines read the live deal, so this table exists
-- for the audit narrative ("what did the customer actually ask for?") rather
-- than to drive evaluation.

CREATE TABLE negotiation_rounds (
    id                   CHAR(36)       PRIMARY KEY,
    deal_id              CHAR(36)       NOT NULL,
    round_number         INTEGER        NOT NULL,
    -- Who moved: CUSTOMER or SALES.
    initiated_by         VARCHAR(32)    NOT NULL,
    requested_discount   NUMERIC(7, 4),
    offered_discount     NUMERIC(7, 4),
    resulting_margin     NUMERIC(7, 4),
    outcome              VARCHAR(32),
    note                 TEXT,
    created_at           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT negotiation_rounds_initiator_valid
        CHECK (initiated_by IN ('CUSTOMER', 'SALES')),
    CONSTRAINT negotiation_rounds_unique_round
        UNIQUE (deal_id, round_number),
    CONSTRAINT fk_negotiation_rounds_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
);

CREATE INDEX idx_negotiation_deal ON negotiation_rounds (deal_id, round_number);
