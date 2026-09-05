-- Commercial rules as data. Adding a rule is an INSERT, not a release.

CREATE TABLE policies (
    id                UUID PRIMARY KEY,
    code              VARCHAR(64)    NOT NULL UNIQUE,
    name              VARCHAR(255)   NOT NULL,
    description       VARCHAR(1000),
    type              VARCHAR(32)    NOT NULL,
    severity          VARCHAR(32)    NOT NULL DEFAULT 'APPROVAL_REQUIRED',
    -- NULL in either scope column means "applies to everything".
    segment           VARCHAR(32),
    product_category  VARCHAR(64),
    threshold_value   NUMERIC(18, 4) NOT NULL,
    required_role     VARCHAR(64),
    priority          INTEGER        NOT NULL DEFAULT 100,
    active            BOOLEAN        NOT NULL DEFAULT TRUE,

    CONSTRAINT policies_type_valid CHECK (type IN (
        'DISCOUNT_LIMIT', 'MARGIN_FLOOR', 'CREDIT_LIMIT',
        'APPROVAL_THRESHOLD', 'QUANTITY_LIMIT', 'PAYMENT_TERMS')),
    CONSTRAINT policies_severity_valid CHECK (severity IN (
        'ADVISORY', 'APPROVAL_REQUIRED', 'BLOCKING'))
);

CREATE INDEX idx_policies_active_priority ON policies (priority) WHERE active;
