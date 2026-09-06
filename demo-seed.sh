#!/usr/bin/env bash
# Seeds a realistic catalogue, tiered customers and discount policy for the demo.
#
# Additive and idempotent: it never deletes quotes, orders or approvals, so running it
# against a database you have already demoed on is safe. Existing quotes keep the margins
# they were priced at - only newly created quotes see the corrected catalogue.
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-$(docker ps --format '{{.Names}}' | grep -m1 login-postgres)}"
echo "Seeding demo data into container: $PG_CONTAINER"

docker exec -i "$PG_CONTAINER" psql -U loginuser -d dealflow -v ON_ERROR_STOP=1 <<'SQL'
-- ---------------------------------------------------------------------------
-- Catalogue. "mobile" was priced below cost, which made every quote built on it
-- loss-making and every demo path end in a Finance escalation. Give it a real margin.
-- ---------------------------------------------------------------------------
UPDATE product SET cost_price = 52000, category = 'Electronics' WHERE name = 'mobile';

INSERT INTO product (name, category, unit_price, cost_price, tax_rate, unit, description, status)
SELECT v.name, v.category, v.unit_price, v.cost_price, 10, 'ea', v.description, 'active'
FROM (VALUES
  ('Docking Station',      'Accessories', 12000.0,  7000.0, 'Pairs with Laptop Pro'),
  ('Support Plan 12mo',    'Services',    24000.0,  6000.0, 'Thin-margin service line'),
  ('Onsite Install',       'Services',    18000.0,  5000.0, 'Thin-margin service line'),
  ('Carry Case',           'Accessories',  4000.0,  1800.0, 'Low-value add-on')
) AS v(name, category, unit_price, cost_price, description)
WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.name = v.name);

-- ---------------------------------------------------------------------------
-- Customers across every tier, so the tier ladder is visible in one demo.
-- ---------------------------------------------------------------------------
INSERT INTO customer (name, tier, email, region)
SELECT v.name, v.tier, v.email, v.region
FROM (VALUES
  ('Globex Gold Inc',     'Gold',     'buyer@globex.example',   'APAC'),
  ('Northwind Bronze Ltd','Bronze',   'buyer@northwind.example','EMEA'),
  ('Initech Silver LLC',  'Silver',   'buyer@initech.example',  'AMER')
) AS v(name, tier, email, region)
WHERE NOT EXISTS (SELECT 1 FROM customer c WHERE c.name = v.name);

-- ---------------------------------------------------------------------------
-- Admin-configured discount ceilings. D.I.C.E. prefers these over its built-in tier
-- ladder, so editing a row here visibly changes what gets gated.
-- ---------------------------------------------------------------------------
INSERT INTO discount_rule (customer_tier, category, min_discount, max_discount, risk_level, approval_level)
SELECT v.tier, v.category, 0, v.max_discount, v.risk, v.approval
FROM (VALUES
  ('Platinum','Electronics', 20.0, 'low',    'Sales Manager'),
  ('Gold',    'Electronics', 15.0, 'low',    'Sales Manager'),
  ('Silver',  'Electronics', 10.0, 'medium', 'Sales Manager'),
  ('Bronze',  'Electronics',  5.0, 'high',   'Sales Manager'),
  ('Platinum','Services',    10.0, 'medium', 'Finance'),
  ('Gold',    'Services',     8.0, 'medium', 'Finance'),
  ('STANDARD','Electronics', 10.0, 'medium', 'Sales Manager'),
  ('STANDARD','Services',     8.0, 'high',   'Finance')
) AS v(tier, category, max_discount, risk, approval)
WHERE NOT EXISTS (
  SELECT 1 FROM discount_rule d
  WHERE lower(d.customer_tier) = lower(v.tier) AND lower(d.category) = lower(v.category)
);

-- ---------------------------------------------------------------------------
-- Cross-sell rules. Observed co-purchase confidence overrides these scores once the
-- quote history contains the pair, which is the point the demo makes.
-- ---------------------------------------------------------------------------
INSERT INTO recommendation_rule (productaid, productbid, producta, productb, co_purchase_score, minimum_margin, promotion, priority)
SELECT a.id, b.id, a.name, b.name, v.score, v.min_margin, v.promo, v.priority
FROM (VALUES
  ('Laptop Pro','Docking Station',   0.60, 10.0, 'bundle-10', 1),
  ('Laptop Pro','Support Plan 12mo', 0.45, 10.0, 'none',      2),
  ('mobile',    'Carry Case',        0.50, 10.0, 'none',      1)
) AS v(a_name, b_name, score, min_margin, promo, priority)
JOIN product a ON a.name = v.a_name
JOIN product b ON b.name = v.b_name
WHERE NOT EXISTS (
  SELECT 1 FROM recommendation_rule r WHERE r.productaid = a.id AND r.productbid = b.id
);

-- Governance knobs at their defaults (no-op if already present).
INSERT INTO governance_threshold (threshold_key, threshold_value, description) VALUES
  ('auto_approve_risk',40,'Risk at/above this always needs a human'),
  ('margin_floor',20,'Gross margin % below this escalates to Finance'),
  ('deal_value_finance',5000000,'Deal total above this escalates to Finance'),
  ('blended_overage_finance',8,'Stacked category overage points requiring Finance'),
  ('anomaly_discount',25,'Overall discount % treated as an anomaly'),
  ('audit_band_width',10,'Width of the post-hoc audit band below auto_approve_risk'),
  ('ceiling_bronze',5,'Default max discount % for Bronze'),
  ('ceiling_silver',10,'Default max discount % for Silver'),
  ('ceiling_gold',15,'Default max discount % for Gold'),
  ('ceiling_platinum',20,'Default max discount % for Platinum'),
  ('ceiling_default',10,'Max discount % for an unknown tier'),
  ('ceiling_service_cap',10,'Hard cap for thin-margin service categories')
ON CONFLICT (threshold_key) DO NOTHING;

-- Stock, so fulfillment proposes a real warehouse split instead of a pure backorder.
INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, quantity_reserved)
SELECT p.id, w.id, 100, 0
FROM product p CROSS JOIN warehouse w
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.warehouse_id = w.id
);
SQL

echo
echo "Catalogue:"
docker exec "$PG_CONTAINER" psql -U loginuser -d dealflow -c \
 "select id,name,category,unit_price,cost_price,round((((unit_price-cost_price)/nullif(unit_price,0))*100)::numeric,1) as margin_pct from product order by id;"
echo "Customers:"
docker exec "$PG_CONTAINER" psql -U loginuser -d dealflow -c "select id,name,tier from customer order by id;"
echo "Discount policy:"
docker exec "$PG_CONTAINER" psql -U loginuser -d dealflow -c "select customer_tier,category,max_discount,approval_level from discount_rule order by customer_tier,category;"
echo
echo "Demo data ready."
