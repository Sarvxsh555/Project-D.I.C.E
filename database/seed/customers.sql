-- TODO: add more customers per segment as demo scenarios require.
INSERT IGNORE INTO customers (id, odoo_partner_id, name, segment, tier, region, credit_limit, outstanding_balance, payment_terms_days, risk_score, on_time_payment_rate, active)
VALUES
    (UUID(), 201, 'Acme Enterprises', 'ENTERPRISE', 'GOLD', 'US-EAST', 500000.00, 50000.00, 45, 20, 96.50, TRUE),
    (UUID(), 202, 'Midtown Supply Co', 'MID_MARKET', 'SILVER', 'US-WEST', 100000.00, 15000.00, 30, 35, 88.00, TRUE),
    (UUID(), 203, 'Bright Retail SMB', 'SMB', 'BRONZE', 'EU', 25000.00, 5000.00, 15, 55, 72.00, TRUE);
