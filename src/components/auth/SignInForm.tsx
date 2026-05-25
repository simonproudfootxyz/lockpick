"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInAction, type AuthActionResult } from "@/actions/auth";
import { signInSchema, type SignInInput } from "@/lib/auth/schemas";
import Button from "@/components/Button";
import "./AuthForm.css";

const initialState: AuthActionResult = { ok: false };

export default function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  return (
    <form
      className="auth-form"
      action={formAction}
      onSubmit={handleSubmit(() => {})}
    >
      <label>
        Email
        <input type="email" autoComplete="email" {...register("email")} />
        {errors.email && (
          <span className="field-error">{errors.email.message}</span>
        )}
        {state.fieldErrors?.email && (
          <span className="field-error">{state.fieldErrors.email[0]}</span>
        )}
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <span className="field-error">{errors.password.message}</span>
        )}
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <div className="auth-links">
        <Link href="/sign-up">Create an account</Link>
        <Link href="/">Back to Home</Link>
      </div>
    </form>
  );
}
