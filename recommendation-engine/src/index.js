import 'dotenv/config';
import express from 'express';
import { requireAuth } from './middleware/auth.js';
import { rankRecommendations } from './services/rankingService.js';

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

app.get('/api/recommendations/rank', requireAuth, async (req, res, next) => {
  try {
    const productIds = String(req.query.productIds || '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    if (productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'productIds is required' });
    }
    const minMargin = req.query.minMargin !== undefined
      ? Number(req.query.minMargin)
      : Number(process.env.DEFAULT_MIN_MARGIN_PERCENT || 0);

    res.json(await rankRecommendations(productIds, minMargin, req.bearerToken));
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal error' });
});

const port = process.env.PORT || 8089;
app.listen(port, () => console.log(`recommendation-engine listening on ${port}`));
