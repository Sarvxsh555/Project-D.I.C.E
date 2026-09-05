/** pg-compatible client that talks to data-service over HTTP. Used by Node engines. */

const BASE = process.env.DATA_SERVICE_URL || 'http://127.0.0.1:8093';
const KEY = process.env.DATA_SERVICE_KEY || 'data-demo-key';

async function rpc(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-data-key': KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `data-service ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function migrate() {
  /* schema lives in data-service */
}

export const pool = {
  async query(text, params = []) {
    return rpc('/internal/sql', { text, params });
  },
  async connect() {
    let txId = null;
    return {
      async query(text, params = []) {
        const t = String(text).trim().toUpperCase();
        if (t === 'BEGIN') {
          const r = await rpc('/internal/tx/begin', {});
          txId = r.txId;
          return { rows: [], rowCount: 0 };
        }
        if (t === 'COMMIT') {
          await rpc(`/internal/tx/${txId}/commit`, {});
          txId = null;
          return { rows: [], rowCount: 0 };
        }
        if (t === 'ROLLBACK') {
          if (txId) await rpc(`/internal/tx/${txId}/rollback`, {});
          txId = null;
          return { rows: [], rowCount: 0 };
        }
        if (txId) return rpc(`/internal/tx/${txId}/query`, { text, params });
        return rpc('/internal/sql', { text, params });
      },
      release() {
        if (txId) {
          const id = txId;
          txId = null;
          rpc(`/internal/tx/${id}/rollback`, {}).catch(() => {});
        }
      },
    };
  },
};
