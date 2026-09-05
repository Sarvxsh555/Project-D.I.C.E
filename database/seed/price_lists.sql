-- Default list covers every product at list price; the GOLD list undercuts
-- it for a couple of SKUs to demonstrate tier-based resolution.
INSERT INTO price_lists (id, code, name, currency, customer_segment, customer_tier, priority, active)
VALUES
    (gen_random_uuid(), 'STANDARD', 'Standard Pricing', 'USD', NULL, NULL, 100, TRUE),
    (gen_random_uuid(), 'GOLD-TIER', 'Gold Tier Pricing', 'USD', NULL, 'GOLD', 10, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO price_list_items (id, price_list_id, product_id, unit_price)
SELECT gen_random_uuid(), pl.id, p.id, prices.unit_price
FROM (VALUES
    ('STANDARD', 'SKU-1001', 100.00),
    ('STANDARD', 'SKU-1002', 250.00),
    ('STANDARD', 'SKU-2001', 45.00),
    ('STANDARD', 'SKU-2002', 180.00),
    ('GOLD-TIER', 'SKU-1001', 90.00),
    ('GOLD-TIER', 'SKU-1002', 225.00)
) AS prices(price_list_code, sku, unit_price)
JOIN price_lists pl ON pl.code = prices.price_list_code
JOIN products p ON p.sku = prices.sku
ON CONFLICT (price_list_id, product_id) DO NOTHING;
