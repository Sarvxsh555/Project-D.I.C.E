import { Router } from 'express';
import {
  initializeBilling, changeQuantity, cancelSubscription, runRecurring, addCreditNote, getOrderBilling,
} from '../services/billingService.js';

export const billingRouter = Router();

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };
}

billingRouter.get(
  '/orders/:orderId',
  handle(async (req, res) => res.json(await getOrderBilling(req.params.orderId)))
);

billingRouter.post(
  '/orders/:orderId/initialize',
  handle(async (req, res) => {
    const { lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ success: false, message: 'lines is required' });
    }
    res.status(201).json(await initializeBilling(req.params.orderId, lines));
  })
);

billingRouter.post(
  '/orders/:orderId/run-recurring',
  handle(async (req, res) => res.json(await runRecurring(req.params.orderId)))
);

billingRouter.post(
  '/orders/:orderId/credit-notes',
  handle(async (req, res) => {
    const { subscriptionId, amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ success: false, message: 'amount and reason are required' });
    res.status(201).json(await addCreditNote(req.params.orderId, subscriptionId ?? null, amount, reason));
  })
);

billingRouter.post(
  '/subscriptions/:id/change-quantity',
  handle(async (req, res) => {
    const { newQuantity } = req.body;
    if (newQuantity === undefined) return res.status(400).json({ success: false, message: 'newQuantity is required' });
    res.json(await changeQuantity(req.params.id, newQuantity));
  })
);

billingRouter.post(
  '/subscriptions/:id/cancel',
  handle(async (req, res) => res.json(await cancelSubscription(req.params.id, req.body.reason)))
);
