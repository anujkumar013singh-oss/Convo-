import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters');

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email or Username is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^\+?[0-9\s-]{6,16}$/.test(val),
      'Enter a valid phone number'
    ),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(64, 'Password must be at most 64 characters'),
});

export const profileSchema = z.object({
  fullName: z.string().max(50, 'Full name must be at most 50 characters').optional().default(''),
  username: usernameSchema,
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^\+?[0-9\s-]{6,16}$/.test(val),
      'Enter a valid phone number'
    ),
  bio: z
    .string()
    .max(160, 'Bio must be at most 160 characters')
    .optional()
    .default(''),
  links: z
    .array(
      z.object({
        label: z.string().min(1, 'Label is required').max(30),
        url: z.string().url('Please enter a valid URL'),
      })
    )
    .optional()
    .default([]),
});
