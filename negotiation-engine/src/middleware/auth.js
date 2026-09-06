import jwt from 'jsonwebtoken';
import { fetchQuote } from '../services/quotationClient.js';

/** Verifies tokens minted by login-service (same HMAC secret) - this service never issues
 *  tokens itself, only verifies them, same trust model as the other backend services. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-this-demo-secret-key-please-32-bytes-min');
    req.user = { username: payload.sub, role: payload.role, customerId: payload.customerId ?? null };
    req.bearerToken = token;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

/**
 * Blocks a customer from reaching another customer's quotation. Non-customer roles pass
 * through untouched. Delegates the actual ownership check to quotation-service (which already
 * enforces it via assertCustomerAccess) by re-fetching the quote with the caller's own bearer
 * token - a 403/404 there means this caller doesn't own the quote.
 */
export async function assertOwnsQuotation(req, res, next) {
  if (req.user.role !== 'CUSTOMER') return next();
  try {
    await fetchQuote(req.params.quotationId, req.bearerToken);
    next();
  } catch (err) {
    res.status(err.status && err.status !== 500 ? err.status : 403).json({
      success: false,
      message: 'This quotation belongs to another account',
    });
  }
}

/** "Approval authority" check: only a manager (ADMIN role, same persona used across the
 *  other services) may act on an approval step. */
export function requireApprover(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'You do not have approval authority' });
  }
  next();
}
