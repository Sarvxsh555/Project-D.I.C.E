import 'dotenv/config';
import express from 'express';
import { migrate } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { billingRouter } from './routes/billing.js';
import { BillingError } from './services/billingService.js';

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/billing', requireAuth, billingRouter);

app.use((err, req, res, next) => {
  if (err instanceof BillingError) return res.status(err.status).json({ success: false, message: err.message });
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal error' });
});

const port = process.env.PORT || 8091;
migrate()
  .then(() => app.listen(port, () => console.log(`billing-engine listening on ${port}`)))
  .catch((err) => {
    console.error('Failed to migrate database', err);
    process.exit(1);
  });
