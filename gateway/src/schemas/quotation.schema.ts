import { z } from 'zod';

export const quotationLine = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const quotationWrite = z.object({
  customerId: z.number().int().positive(),
  lines: z.array(quotationLine).min(1),
});

export const transitionBody = z.object({
  toStage: z.string().min(1),
});

export const reasonBody = z.object({
  reason: z.string().min(1),
});
