import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_request (
      id SERIAL PRIMARY KEY,
      quotation_id BIGINT NOT NULL,
      quote_version_hash TEXT NOT NULL,
      risk_score DOUBLE PRECISION NOT NULL,
      required_level TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      requested_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approval_step (
      id SERIAL PRIMARY KEY,
      approval_request_id INTEGER NOT NULL REFERENCES approval_request(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      required_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      decided_by TEXT,
      decided_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS approval_decision (
      id SERIAL PRIMARY KEY,
      approval_request_id INTEGER NOT NULL REFERENCES approval_request(id) ON DELETE CASCADE,
      approval_step_id INTEGER REFERENCES approval_step(id),
      decided_by TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT,
      quote_version_hash_at_decision TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_approval_request_quotation ON approval_request(quotation_id);
    CREATE INDEX IF NOT EXISTS idx_approval_step_request ON approval_step(approval_request_id);
    CREATE INDEX IF NOT EXISTS idx_approval_decision_request ON approval_decision(approval_request_id);
  `);
}
