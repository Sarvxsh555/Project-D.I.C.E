import 'dotenv/config';
import express from 'express';
import { migrate } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { negotiationsRouter } from './routes/negotiations.js';
import { NegotiationError } from './services/negotiationService.js';

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/negotiations', requireAuth, negotiationsRouter);

app.use((err, req, res, next) => {
  if (err instanceof NegotiationError) {
    return res.status(err.status).json({ success: false, message: err.message, trail: err.detail });
  }
  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal error' });
});

const port = process.env.PORT || 8086;
migrate()
  .then(() => {
    app.listen(port, () => console.log(`negotiation-engine listening on ${port}`));
  })
  .catch((err) => {
    console.error('Failed to migrate database', err);
    process.exit(1);
  });
