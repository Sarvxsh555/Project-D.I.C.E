import 'dotenv/config';
import express from 'express';
import { requireAuth } from './middleware/auth.js';
import { computeHealth, computeDashboard } from './services/healthService.js';

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/deal-health/dashboard', requireAuth, async (req, res, next) => {
  try {
    res.json(await computeDashboard(req.bearerToken));
  } catch (err) {
    next(err);
  }
});

app.get('/api/deal-health/:quotationId', requireAuth, async (req, res, next) => {
  try {
    res.json(await computeHealth(req.params.quotationId, req.bearerToken));
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal error' });
});

const port = process.env.PORT || 8090;
app.listen(port, () => console.log(`deal-health-engine listening on ${port}`));
