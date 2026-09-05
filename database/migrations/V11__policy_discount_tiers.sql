-- Lets a DISCOUNT_LIMIT policy scope to a customer loyalty tier (Bronze/
-- Silver/Gold) in addition to the existing segment/category scoping, so
-- discount ceilings can be configured per tier without touching engine code.

ALTER TABLE policies ADD COLUMN customer_tier VARCHAR(32);

CREATE INDEX idx_policies_customer_tier ON policies (customer_tier) WHERE active;

-- A discount-limit threshold is a percentage; keep it in range at the DB
-- layer so a bad config row can't silently produce a nonsensical ceiling.
ALTER TABLE policies ADD CONSTRAINT policies_discount_limit_range
    CHECK (type <> 'DISCOUNT_LIMIT' OR (threshold_value >= 0 AND threshold_value <= 100));

-- One active policy per (type, tier, category) combination — two policies
-- with identical scope would leave "most specific wins" to pick arbitrarily
-- between them.
CREATE UNIQUE INDEX idx_policies_unique_scope
    ON policies (type, COALESCE(customer_tier, ''), COALESCE(product_category, ''), COALESCE(segment, ''))
    WHERE active;
