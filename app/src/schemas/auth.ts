import { z } from 'zod';

export const emailAuthSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export type EmailAuthInput = z.infer<typeof emailAuthSchema>;

export const cognitoSignUpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type CognitoSignUpInput = z.infer<typeof cognitoSignUpSchema>;

export const cognitoConfirmSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  code: z.string().trim().min(6, "Verification code must be 6 digits"),
});

export type CognitoConfirmInput = z.infer<typeof cognitoConfirmSchema>;

export const userProfileSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  isDevBypass: z.boolean().default(false),
  createdAt: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

