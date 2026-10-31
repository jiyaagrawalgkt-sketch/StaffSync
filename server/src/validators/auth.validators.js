import { z } from 'zod';

// bcrypt only uses the first 72 bytes, so we cap the length at 72.
export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const email = z.string().trim().toLowerCase().email('Enter a valid email').max(120);

export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required').max(128) });

export const setupSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email,
  password: passwordRule,
  setupKey: z.string().min(1, 'Setup key is required'),
});

export const acceptInviteSchema = z.object({ token: z.string().min(20).max(200), password: passwordRule });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: passwordRule,
});

export const updateMeSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('')),
});
