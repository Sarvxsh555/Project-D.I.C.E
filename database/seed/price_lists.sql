-- Default list covers every product at list price; the GOLD list undercuts
-- it for a couple of SKUs to demonstrate tier-based resolution.
INSERT IGNORE INTO price_lists (id, code, name, currency, customer_segment, customer_tier, priority, active)
VALUES
    (UUID(), 'STANDARD', 'Standard Pricing', 'USD', NULL, NULL, 100, TRUE),
    (UUID(), 'GOLD-TIER', 'Gold Tier Pricing', 'USD', NULL, 'GOLD', 10, TRUE);

-- Rewritten from Postgres's `(VALUES ...) AS prices(...)` derived table into
-- a UNION ALL, since that construct isn't portable to MySQL.
INSERT IGNORE INTO price_list_items (id, price_list_id, product_id, unit_price)
SELECT UUID(), pl.id, p.id, prices.unit_price
FROM (
    SELECT 'STANDARD' AS price_list_code, 'SKU-1001' AS sku, 100.00 AS unit_price
    UNION ALL SELECT 'STANDARD', 'SKU-1002', 250.00
    UNION ALL SELECT 'STANDARD', 'SKU-2001', 45.00
    UNION ALL SELECT 'STANDARD', 'SKU-2002', 180.00
    UNION ALL SELECT 'GOLD-TIER', 'SKU-1001', 90.00
    UNION ALL SELECT 'GOLD-TIER', 'SKU-1002', 225.00
) AS prices
JOIN price_lists pl ON pl.code = prices.price_list_code
JOIN products p ON p.sku = prices.sku;
