import { z } from 'zod';

export const commentBody = z.object({
  lineId: z.number().optional(),
  message: z.string().min(1),
});

export const counterBody = z.object({
  lineId: z.number(),
  proposedDiscountPercent: z.number(),
  message: z.string().optional(),
});
