import jwt from 'jsonwebtoken';

/** Verifies tokens minted by login-service (same HMAC secret) - this service never issues
 *  tokens itself, only verifies them, same trust model as the other backend services. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { username: payload.sub, role: payload.role };
    req.bearerToken = token;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

/** Billing mutations (proration, cancellation, credit notes, running the recurring cycle)
 *  are Finance/Operations territory - reps and managers can view, only Finance acts. */
export function requireFinance(req, res, next) {
  if (!['FINANCE', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'This action requires Finance authority' });
  }
  next();
}
