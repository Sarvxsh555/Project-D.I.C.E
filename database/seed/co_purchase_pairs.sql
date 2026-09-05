-- Co-purchase seed data built from the 4 demo products:
--   SKU-1001  Standard Widget   (WIDGETS)
--   SKU-1002  Premium Widget    (WIDGETS)
--   SKU-2001  Basic Gadget      (GADGETS)
--   SKU-2002  Pro Gadget        (GADGETS)
--
-- Pairs are directional: SKU-1001→SKU-2001 means "customers who bought
-- Standard Widget also bought Basic Gadget." The engine aggregates by
-- paired_sku so a high-weight reverse pair will also surface.

INSERT IGNORE INTO co_purchase_pairs (product_sku, paired_sku, weight, promotion_label)
VALUES
    -- Widget → Gadget cross-category pairs (core pairings)
    ('SKU-1001', 'SKU-2001', 8,  NULL),                  -- Widget customers often add a Gadget
    ('SKU-1001', 'SKU-2002', 4,  NULL),                  -- Some upgrade to Pro Gadget
    ('SKU-1001', 'SKU-1002', 6,  'Upgrade to Premium'),  -- Upsell opportunity (promoted)
    ('SKU-1002', 'SKU-2002', 9,  'Bundle Deal'),          -- Premium + Pro → high-value bundle
    ('SKU-1002', 'SKU-2001', 5,  NULL),
    ('SKU-2001', 'SKU-1001', 7,  NULL),                  -- Gadget buyers often add a Widget
    ('SKU-2001', 'SKU-2002', 6,  'Upgrade to Pro'),       -- Upsell within GADGETS (promoted)
    ('SKU-2001', 'SKU-1002', 3,  NULL),
    ('SKU-2002', 'SKU-1002', 8,  NULL),                  -- Pro customers typically want Premium
    ('SKU-2002', 'SKU-1001', 4,  NULL);
