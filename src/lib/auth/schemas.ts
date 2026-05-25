import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or fewer")
  .regex(
    /^[a-zA-Z0-9 '_-]+$/,
    "Username may only contain letters, numbers, spaces, hyphens, underscores, and apostrophes",
  );

export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(30, "Display name must be 30 characters or fewer");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const guestLeaderboardNameSchema = z.object({
  displayName: displayNameSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
