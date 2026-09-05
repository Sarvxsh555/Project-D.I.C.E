import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS negotiation_event (
      id SERIAL PRIMARY KEY,
      quotation_id BIGINT NOT NULL,
      line_id BIGINT,
      event_type TEXT NOT NULL, -- LINE_COMMENT | CHANGE_REQUEST | COUNTER_DISCOUNT
      message TEXT,
      payload JSONB,
      status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | APPLIED | DISMISSED | FAILED
      requested_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS quote_negotiation_version (
      id SERIAL PRIMARY KEY,
      quotation_id BIGINT NOT NULL,
      negotiation_event_id INTEGER REFERENCES negotiation_event(id),
      version_label TEXT NOT NULL, -- 'before' | 'after'
      stage TEXT NOT NULL,
      subtotal DOUBLE PRECISION NOT NULL,
      discount_total DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL,
      margin_percent DOUBLE PRECISION NOT NULL,
      snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_negotiation_event_quotation ON negotiation_event(quotation_id);
    CREATE INDEX IF NOT EXISTS idx_quote_negotiation_version_quotation ON quote_negotiation_version(quotation_id);
  `);
}
