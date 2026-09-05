-- Per-tier and per-category discount ceilings. Add/edit rows here rather
-- than changing engine code — see DiscountPolicyService / PolicyEngine.
INSERT INTO policies (id, code, name, description, type, severity, segment, customer_tier, product_category, threshold_value, required_role, priority, active)
VALUES
    (gen_random_uuid(), 'BRONZE_DISCOUNT_CAP', 'Bronze tier discount ceiling', 'Bronze-tier customers may not be discounted beyond 5% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, 'BRONZE', NULL, 5.00, 'SALES_MANAGER', 50, TRUE),
    (gen_random_uuid(), 'SILVER_DISCOUNT_CAP', 'Silver tier discount ceiling', 'Silver-tier customers may not be discounted beyond 10% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, 'SILVER', NULL, 10.00, 'SALES_MANAGER', 50, TRUE),
    (gen_random_uuid(), 'GOLD_DISCOUNT_CAP', 'Gold tier discount ceiling', 'Gold-tier customers may not be discounted beyond 15% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, 'GOLD', NULL, 15.00, 'SALES_MANAGER', 50, TRUE),
    (gen_random_uuid(), 'HARDWARE_DISCOUNT_CAP', 'Hardware category discount ceiling', 'Hardware lines may not be discounted beyond 12% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, NULL, 'Hardware', 12.00, 'SALES_MANAGER', 60, TRUE),
    (gen_random_uuid(), 'SERVICE_DISCOUNT_CAP', 'Service category discount ceiling', 'Service lines may not be discounted beyond 20% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, NULL, 'Service', 20.00, 'SALES_MANAGER', 60, TRUE),
    (gen_random_uuid(), 'SOFTWARE_DISCOUNT_CAP', 'Software category discount ceiling', 'Software lines may not be discounted beyond 15% without sign-off.', 'DISCOUNT_LIMIT', 'APPROVAL_REQUIRED', NULL, NULL, 'Software', 15.00, 'SALES_MANAGER', 60, TRUE)
ON CONFLICT (code) DO NOTHING;
