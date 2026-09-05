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

/** Route-level gate: only someone who could plausibly hold approval authority at all may
 *  call these endpoints. Which *specific* step they can act on (Sales Manager vs Finance)
 *  is checked separately in approvalService against that step's required_role - ADMIN is a
 *  break-glass override for both. */
export function requireApprover(req, res, next) {
  if (!['ADMIN', 'SALES_MANAGER', 'FINANCE'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have approval authority' });
  }
  next();
}
