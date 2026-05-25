"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signUpSchema } from "@/lib/auth/schemas";
import { signIn } from "@/lib/auth/auth";

export type AuthActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function signInWithCredentials(email: string, password: string) {
  return signIn("credentials", {
    email,
    password,
    redirect: false,
  });
}

export async function signUpAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const [existingEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existingEmail) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const [existingUsername] = await db
    .select()
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);
  if (existingUsername) {
    return { ok: false, error: "This username is already taken." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({
    email: parsed.data.email,
    username: parsed.data.username,
    name: parsed.data.username,
    passwordHash,
  });

  const result = await signInWithCredentials(
    parsed.data.email,
    parsed.data.password,
  );
  if (result?.error) {
    return {
      ok: false,
      error: "Account created, but sign-in failed. Please sign in manually.",
    };
  }

  return { ok: true };
}

export async function signInAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await signInWithCredentials(email, password);
  if (result?.error) {
    return { ok: false, error: "Invalid email or password." };
  }

  return { ok: true };
}
