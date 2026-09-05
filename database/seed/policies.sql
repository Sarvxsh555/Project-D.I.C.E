-- Starter policy set. Add/edit rows here rather than changing engine code.
INSERT IGNORE INTO policies (id, code, name, description, type, severity, segment, product_category, threshold_value, required_role, priority, active)
VALUES
    (UUID(), 'GLOBAL_DISCOUNT_CAP', 'Global discount cap', 'No deal may discount more than 20% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, NULL, 20.00, 'SALES_MANAGER', 100, TRUE),
    (UUID(), 'GLOBAL_MARGIN_FLOOR', 'Global margin floor', 'Deals may not fall below 15% blended margin.', 'MARGIN_FLOOR', 'BLOCKING', NULL, NULL, 15.00, 'ADMIN', 100, TRUE),
    (UUID(), 'ENTERPRISE_CREDIT_LIMIT', 'Enterprise credit exposure', 'Enterprise deals may not consume more than 80% of available credit without Finance sign-off.', 'CREDIT_LIMIT', 'APPROVAL_REQUIRED', 'ENTERPRISE', NULL, 80.00, 'FINANCE', 90, TRUE),
    (UUID(), 'HIGH_VALUE_APPROVAL', 'High value approval threshold', 'Deals over 100,000 require Sales Manager sign-off regardless of other checks.', 'APPROVAL_THRESHOLD', 'APPROVAL_REQUIRED', NULL, NULL, 100000.00, 'SALES_MANAGER', 80, TRUE);
