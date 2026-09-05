import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://loginuser:loginpass@127.0.0.1:5433/dealflow';

export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

const sessions = new Map<string, { client: pg.PoolClient; timer: NodeJS.Timeout }>();
const TX_TTL_MS = 30_000;

export async function migrate() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(dir, '../sql/schema.sql'), 'utf8');
  await pool.query(sql);
}

function touch(txId: string) {
  const s = sessions.get(txId);
  if (!s) return;
  clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    s.client.query('ROLLBACK').catch(() => {});
    s.client.release();
    sessions.delete(txId);
  }, TX_TTL_MS);
}

export async function sqlQuery(text: string, params: unknown[] = []) {
  return pool.query(text, params);
}

export async function beginTx() {
  const client = await pool.connect();
  await client.query('BEGIN');
  const txId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const timer = setTimeout(() => {
    client.query('ROLLBACK').catch(() => {});
    client.release();
    sessions.delete(txId);
  }, TX_TTL_MS);
  sessions.set(txId, { client, timer });
  return txId;
}

export async function txQuery(txId: string, text: string, params: unknown[] = []) {
  const s = sessions.get(txId);
  if (!s) throw Object.assign(new Error('Unknown or expired transaction'), { statusCode: 400 });
  touch(txId);
  return s.client.query(text, params);
}

export async function commitTx(txId: string) {
  const s = sessions.get(txId);
  if (!s) throw Object.assign(new Error('Unknown or expired transaction'), { statusCode: 400 });
  clearTimeout(s.timer);
  await s.client.query('COMMIT');
  s.client.release();
  sessions.delete(txId);
}

export async function rollbackTx(txId: string) {
  const s = sessions.get(txId);
  if (!s) return;
  clearTimeout(s.timer);
  await s.client.query('ROLLBACK').catch(() => {});
  s.client.release();
  sessions.delete(txId);
}
