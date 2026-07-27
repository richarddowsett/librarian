import { z } from 'zod';

export const emailAuthSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export type EmailAuthInput = z.infer<typeof emailAuthSchema>;

export const userProfileSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  isDevBypass: z.boolean().default(false),
  createdAt: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
