import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 8094;
const LOG_DIR = '/tmp/dice-logs';

const SERVICES = [
  { name: 'gateway', port: 8000, healthPath: '/health' },
  { name: 'backend', port: 8080, healthPath: '/' },
  { name: 'quotation-service', port: 8082, healthPath: '/' },
  { name: 'deal-engine', port: 8083, healthPath: '/' },
  { name: 'governance-engine', port: 8084, healthPath: '/' },
  { name: 'approval-engine', port: 8085, healthPath: '/' },
  { name: 'negotiation-engine', port: 8086, healthPath: '/' },
  { name: 'inventory-engine', port: 8087, healthPath: '/' },
  { name: 'fulfillment-engine', port: 8088, healthPath: '/' },
  { name: 'recommendation-engine', port: 8089, healthPath: '/' },
  { name: 'deal-health-engine', port: 8090, healthPath: '/' },
  { name: 'billing-engine', port: 8091, healthPath: '/' },
  { name: 'oeeg', port: 8092, healthPath: '/' },
  { name: 'data-service', port: 8093, healthPath: '/health' },
  { name: 'mailer-service', port: 4000, healthPath: '/' },
  { name: 'frontend', port: 5173, healthPath: '/' },
];

const logPath = (name) => path.join(LOG_DIR, `${name}.log`);

async function checkService(svc) {
  const start = Date.now();
  try {
    const res = await fetch(`http://localhost:${svc.port}${svc.healthPath}`, {
      signal: AbortSignal.timeout(2000),
    });
    return {
      name: svc.name,
      port: svc.port,
      status: 'up',
      latencyMs: Date.now() - start,
      httpStatus: res.status,
    };
  } catch {
    return { name: svc.name, port: svc.port, status: 'down', latencyMs: null, httpStatus: null };
  }
}

app.get('/api/monitor/services', async (_req, res) => {
  const results = await Promise.all(SERVICES.map(checkService));
  res.json(results);
});

app.get('/api/monitor/logs/:service', (req, res) => {
  const svc = SERVICES.find((s) => s.name === req.params.service);
  if (!svc) return res.status(404).json({ error: 'Unknown service' });

  const lines = Math.min(Number(req.query.lines) || 200, 1000);
  const file = logPath(svc.name);
  if (!fs.existsSync(file)) return res.json({ service: svc.name, lines: [] });

  const content = fs.readFileSync(file, 'utf8');
  const allLines = content.split('\n').filter((l) => l.length > 0);
  res.json({ service: svc.name, lines: allLines.slice(-lines) });
});

app.get('/api/monitor/logs/:service/stream', (req, res) => {
  const svc = SERVICES.find((s) => s.name === req.params.service);
  if (!svc) return res.status(404).end();

  const file = logPath(svc.name);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');

  let lastSize = fs.existsSync(file) ? fs.statSync(file).size : 0;

  const onChange = () => {
    if (!fs.existsSync(file)) return;
    const { size } = fs.statSync(file);
    if (size <= lastSize) {
      lastSize = size;
      return;
    }
    const stream = fs.createReadStream(file, { start: lastSize, end: size });
    let buf = '';
    stream.on('data', (chunk) => (buf += chunk.toString('utf8')));
    stream.on('end', () => {
      lastSize = size;
      buf
        .split('\n')
        .filter((l) => l.length > 0)
        .forEach((line) => res.write(`data: ${JSON.stringify({ line })}\n\n`));
    });
  };

  fs.watchFile(file, { interval: 1000 }, onChange);

  req.on('close', () => {
    fs.unwatchFile(file, onChange);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`monitor-service on ${PORT}`);
});
