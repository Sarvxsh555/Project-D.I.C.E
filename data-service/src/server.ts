import { buildApp } from './app.js';
import { migrate, pool } from './db.js';

await migrate();
const app = await buildApp();
const port = Number(process.env.PORT || 8093);

try {
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`data-service on :${port} (Postgres, no ORM)`);
} catch (err) {
  app.log.error(err);
  await pool.end();
  process.exit(1);
}
