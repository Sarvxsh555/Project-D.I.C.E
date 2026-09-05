-- Per-warehouse stock backing InventoryController and the multi-warehouse
-- allocation engine (AllocationEngine / FulfillmentAllocationService). Without
-- this, every /api/inventory/* read and every /api/fulfillment/{id}/allocate
-- call sees zero available stock everywhere, even though products.stock_on_hand
-- is populated — the two counters must not disagree by omission.
--
-- Splits each product's stock_on_hand roughly 50/30/20 across WH-EAST/WH-WEST/WH-EU
-- (rounding down; the remainder is dropped, which only ever under- rather than
-- over-states total available stock).
INSERT INTO inventory (id, warehouse_id, product_id, available_qty, reserved_qty, fulfilled_qty)
SELECT gen_random_uuid(), w.id, p.id,
       CASE w.code
           WHEN 'WH-EAST' THEN (p.stock_on_hand * 50 / 100)
           WHEN 'WH-WEST' THEN (p.stock_on_hand * 30 / 100)
           WHEN 'WH-EU'   THEN (p.stock_on_hand * 20 / 100)
       END,
       0, 0
FROM products p
CROSS JOIN warehouses w
WHERE w.code IN ('WH-EAST', 'WH-WEST', 'WH-EU')
ON CONFLICT (warehouse_id, product_id) DO NOTHING;
