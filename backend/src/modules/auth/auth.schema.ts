import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[^a-zA-Z0-9]/, 'Must contain a special character');

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordConfirmSchema = z.object({
  token: z.string(),
  password: passwordSchema,
});
