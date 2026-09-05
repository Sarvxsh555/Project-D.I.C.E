import { Router } from 'express';
import { requireApprover } from '../middleware/auth.js';
import {
  createApprovalRequest,
  getApprovalRequest,
  listApprovalRequests,
  getDecisions,
  approveStep,
  rejectRequest,
  returnRequest,
  invalidateForQuotation,
} from '../services/approvalService.js';

export const approvalsRouter = Router();

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };
}

approvalsRouter.get(
  '/',
  handle(async (req, res) => {
    const { quotationId, status } = req.query;
    res.json(await listApprovalRequests({ quotationId, status }));
  })
);

approvalsRouter.get(
  '/:id',
  handle(async (req, res) => {
    res.json(await getApprovalRequest(req.params.id));
  })
);

approvalsRouter.get(
  '/:id/decisions',
  handle(async (req, res) => {
    res.json(await getDecisions(req.params.id));
  })
);

approvalsRouter.post(
  '/',
  handle(async (req, res) => {
    const { quotationId } = req.body;
    if (!quotationId) return res.status(400).json({ success: false, message: 'quotationId is required' });
    const created = await createApprovalRequest(quotationId, req.user.username, req.bearerToken);
    res.status(201).json(created);
  })
);

approvalsRouter.post(
  '/by-quotation/:quotationId/invalidate',
  handle(async (req, res) => {
    const result = await invalidateForQuotation(req.params.quotationId, req.user.username, req.body.reason);
    res.json(result);
  })
);

approvalsRouter.post(
  '/:id/approve',
  requireApprover,
  handle(async (req, res) => {
    const result = await approveStep(req.params.id, req.user, req.body.reason, req.bearerToken);
    res.json(result);
  })
);

approvalsRouter.post(
  '/:id/reject',
  requireApprover,
  handle(async (req, res) => {
    const result = await rejectRequest(req.params.id, req.user, req.body.reason, req.bearerToken);
    res.json(result);
  })
);

approvalsRouter.post(
  '/:id/return',
  requireApprover,
  handle(async (req, res) => {
    const result = await returnRequest(req.params.id, req.user, req.body.reason, req.bearerToken);
    res.json(result);
  })
);
