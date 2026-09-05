import pg from 'pg';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      type TEXT NOT NULL, -- ONE_TIME | RECURRING
      status TEXT NOT NULL DEFAULT 'ISSUED', -- DRAFT | ISSUED | PAID
      amount DOUBLE PRECISION NOT NULL,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      due_at TIMESTAMPTZ,
      period_start DATE,
      period_end DATE
    );

    CREATE TABLE IF NOT EXISTS invoice_line (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL,
      unit_price DOUBLE PRECISION NOT NULL,
      amount DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id BIGINT,
      product_name TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL,
      unit_price DOUBLE PRECISION NOT NULL,
      billing_cycle TEXT NOT NULL, -- MONTHLY | QUARTERLY | YEARLY
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | CANCELLED
      start_date DATE NOT NULL DEFAULT CURRENT_DATE,
      next_billing_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS billing_schedule (
      id SERIAL PRIMARY KEY,
      subscription_id INTEGER NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | BILLED
      invoice_id INTEGER REFERENCES invoice(id)
    );

    CREATE TABLE IF NOT EXISTS credit_note (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      subscription_id INTEGER REFERENCES subscription(id),
      amount DOUBLE PRECISION NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS refund (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      subscription_id INTEGER REFERENCES subscription(id),
      amount DOUBLE PRECISION NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_invoice_order ON invoice(order_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_order ON subscription(order_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_subscription ON billing_schedule(subscription_id);
  `);
}
