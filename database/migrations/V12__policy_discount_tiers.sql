-- Lets a DISCOUNT_LIMIT policy scope to a customer loyalty tier (Bronze/
-- Silver/Gold) in addition to the existing segment/category scoping, so
-- discount ceilings can be configured per tier without touching engine code.

ALTER TABLE policies ADD COLUMN customer_tier VARCHAR(32);

CREATE INDEX idx_policies_customer_tier ON policies (customer_tier);

-- A discount-limit threshold is a percentage; keep it in range at the DB
-- layer so a bad config row can't silently produce a nonsensical ceiling.
ALTER TABLE policies ADD CONSTRAINT policies_discount_limit_range
    CHECK (type <> 'DISCOUNT_LIMIT' OR (threshold_value >= 0 AND threshold_value <= 100));

-- One active policy per (type, tier, category, segment) combination — two
-- policies with identical scope would leave "most specific wins" to pick
-- arbitrarily between them. MySQL has no partial index, so this generated
-- column collapses to NULL for inactive rows (NULLs never collide in a
-- UNIQUE index, in MySQL same as Postgres), reproducing the original
-- `WHERE active` partial-unique-index semantics exactly.
ALTER TABLE policies ADD COLUMN scope_key VARCHAR(255) GENERATED ALWAYS AS (
    CASE WHEN active THEN
        CONCAT(type, '|', COALESCE(customer_tier, ''), '|', COALESCE(product_category, ''), '|', COALESCE(segment, ''))
    END
) STORED;

CREATE UNIQUE INDEX idx_policies_unique_scope ON policies (scope_key);
