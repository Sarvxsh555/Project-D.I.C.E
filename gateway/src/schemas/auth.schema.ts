import { z } from 'zod';

export const loginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const signupBody = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});
