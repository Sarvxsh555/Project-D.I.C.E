-- Per-warehouse stock backing InventoryController and the multi-warehouse
-- allocation engine (AllocationEngine / FulfillmentAllocationService). Without
-- this, every /api/inventory/* read and every /api/fulfillment/{id}/allocate
-- call sees zero available stock everywhere, even though products.stock_on_hand
-- is populated — the two counters must not disagree by omission.
--
-- Splits each product's stock_on_hand roughly 50/30/20 across WH-EAST/WH-WEST/WH-EU.
-- Uses MySQL's integer DIV (not /, which returns a decimal in MySQL, unlike
-- Postgres where / already truncates on integer operands) so the remainder is
-- dropped the same way the original Postgres version intended — under- rather
-- than over-stating total available stock.
INSERT IGNORE INTO inventory (id, warehouse_id, product_id, available_qty, reserved_qty, fulfilled_qty)
SELECT UUID(), w.id, p.id,
       CASE w.code
           WHEN 'WH-EAST' THEN (p.stock_on_hand * 50 DIV 100)
           WHEN 'WH-WEST' THEN (p.stock_on_hand * 30 DIV 100)
           WHEN 'WH-EU'   THEN (p.stock_on_hand * 20 DIV 100)
       END,
       0, 0
FROM products p
CROSS JOIN warehouses w
WHERE w.code IN ('WH-EAST', 'WH-WEST', 'WH-EU');
