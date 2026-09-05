import Fastify from 'fastify';
import { beginTx, commitTx, rollbackTx, sqlQuery, txQuery } from './db.js';

const DATA_KEY = process.env.DATA_SERVICE_KEY || 'data-demo-key';

function requireKey(header: string | string[] | undefined) {
  const v = Array.isArray(header) ? header[0] : header;
  if (v !== DATA_KEY) {
    const err = new Error('Invalid X-Data-Key') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
}

function pack(result: { rows: unknown[]; rowCount: number | null }) {
  return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
}

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok', service: 'data-service', orm: 'none' }));

  app.post('/internal/sql', async (request) => {
    requireKey(request.headers['x-data-key']);
    const body = request.body as { text?: string; params?: unknown[] };
    if (!body?.text) {
      const err = new Error('text is required') as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
    return pack(await sqlQuery(body.text, body.params || []));
  });

  app.post('/internal/tx/begin', async (request) => {
    requireKey(request.headers['x-data-key']);
    const txId = await beginTx();
    return { txId };
  });

  app.post('/internal/tx/:txId/query', async (request) => {
    requireKey(request.headers['x-data-key']);
    const { txId } = request.params as { txId: string };
    const body = request.body as { text?: string; params?: unknown[] };
    if (!body?.text) {
      const err = new Error('text is required') as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
    return pack(await txQuery(txId, body.text, body.params || []));
  });

  app.post('/internal/tx/:txId/commit', async (request) => {
    requireKey(request.headers['x-data-key']);
    await commitTx((request.params as { txId: string }).txId);
    return { ok: true };
  });

  app.post('/internal/tx/:txId/rollback', async (request) => {
    requireKey(request.headers['x-data-key']);
    await rollbackTx((request.params as { txId: string }).txId);
    return { ok: true };
  });

  app.get('/api/tasks', async (request) => {
    const user = String(request.headers['x-user-sub'] || '');
    if (!user) return [];
    const { rows } = await sqlQuery(
      `SELECT id, title, due_date AS due, done FROM task WHERE username = $1 ORDER BY due_date NULLS LAST, id`,
      [user]
    );
    return rows;
  });

  app.post('/api/tasks', async (request) => {
    const user = String(request.headers['x-user-sub'] || '');
    const body = request.body as { title?: string; due?: string };
    if (!user || !body?.title) {
      const err = new Error('title required') as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
    const { rows } = await sqlQuery(
      `INSERT INTO task (username, title, due_date) VALUES ($1, $2, $3) RETURNING id, title, due_date AS due, done`,
      [user, body.title, body.due || null]
    );
    return rows[0];
  });

  app.patch('/api/tasks/:id', async (request) => {
    const user = String(request.headers['x-user-sub'] || '');
    const { id } = request.params as { id: string };
    const body = request.body as { done?: boolean; title?: string };
    const { rows } = await sqlQuery(
      `UPDATE task SET done = COALESCE($3, done), title = COALESCE($4, title)
       WHERE id = $1 AND username = $2
       RETURNING id, title, due_date AS due, done`,
      [id, user, body.done ?? null, body.title ?? null]
    );
    return rows[0] || null;
  });

  app.get('/api/notifications', async (request) => {
    const user = String(request.headers['x-user-sub'] || '');
    if (!user) return [];
    const { rows } = await sqlQuery(
      `SELECT id, icon, title, unread,
              to_char(created_at, 'YYYY-MM-DD HH24:MI') AS time
       FROM notification WHERE username = $1 ORDER BY id DESC`,
      [user]
    );
    return rows;
  });

  app.patch('/api/notifications/:id', async (request) => {
    const user = String(request.headers['x-user-sub'] || '');
    const { id } = request.params as { id: string };
    const { rows } = await sqlQuery(
      `UPDATE notification SET unread = FALSE WHERE id = $1 AND username = $2
       RETURNING id, icon, title, unread, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS time`,
      [id, user]
    );
    return rows[0] || null;
  });

  app.get('/api/notifications/unread-count', async (request) => {
    const user = String(request.headers['x-user-sub'] || '');
    if (!user) return { count: 0 };
    const { rows } = await sqlQuery(
      `SELECT COUNT(*)::int AS count FROM notification WHERE username = $1 AND unread = TRUE`,
      [user]
    );
    return rows[0];
  });

  return app;
}
