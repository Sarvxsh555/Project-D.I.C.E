import { Router } from 'express';
import { addComment, requestChange, listEvents, listVersions, submitCounterDiscount } from '../services/negotiationService.js';
import { assertOwnsQuotation } from '../middleware/auth.js';

export const negotiationsRouter = Router();

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };
}

negotiationsRouter.get(
  '/:quotationId/events',
  assertOwnsQuotation,
  handle(async (req, res) => res.json(await listEvents(req.params.quotationId)))
);

negotiationsRouter.get(
  '/:quotationId/versions',
  assertOwnsQuotation,
  handle(async (req, res) => res.json(await listVersions(req.params.quotationId, req.user.role === 'CUSTOMER')))
);

negotiationsRouter.post(
  '/:quotationId/comments',
  assertOwnsQuotation,
  handle(async (req, res) => {
    const { lineId, message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });
    res.status(201).json(await addComment(req.params.quotationId, lineId, message, req.user.username));
  })
);

negotiationsRouter.post(
  '/:quotationId/change-requests',
  assertOwnsQuotation,
  handle(async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });
    res.status(201).json(await requestChange(req.params.quotationId, message, req.user.username));
  })
);

negotiationsRouter.post(
  '/:quotationId/counter-discount',
  assertOwnsQuotation,
  handle(async (req, res) => {
    const { lineId, proposedDiscountPercent, message } = req.body;
    if (!lineId || proposedDiscountPercent === undefined) {
      return res.status(400).json({ success: false, message: 'lineId and proposedDiscountPercent are required' });
    }
    const result = await submitCounterDiscount(
      req.params.quotationId, { lineId, proposedDiscountPercent, message }, req.user.username, req.bearerToken
    );
    res.status(201).json(result);
  })
);
