import { z } from 'zod';

export const approvalCreate = z.object({
  quotationId: z.union([z.number(), z.string()]),
});

export const approvalAct = z.object({
  reason: z.string().optional(),
});
