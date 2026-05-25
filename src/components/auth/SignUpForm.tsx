"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpAction, type AuthActionResult } from "@/actions/auth";
import { signUpSchema, type SignUpInput } from "@/lib/auth/schemas";
import Button from "@/components/Button";
import "./AuthForm.css";

const initialState: AuthActionResult = { ok: false };

export default function SignUpForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  useEffect(() => {
    if (state.ok) {
      router.push("/");
      router.refresh();
    }
  }, [state.ok, router]);

  const onSubmit = handleSubmit((data) => {
    const formData = new FormData();
    formData.set("username", data.username);
    formData.set("email", data.email);
    formData.set("password", data.password);
    formAction(formData);
  });

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Username
        <input type="text" autoComplete="username" {...register("username")} />
        {errors.username && (
          <span className="field-error">{errors.username.message}</span>
        )}
        {state.fieldErrors?.username && (
          <span className="field-error">{state.fieldErrors.username[0]}</span>
        )}
      </label>
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
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <span className="field-error">{errors.password.message}</span>
        )}
        {state.fieldErrors?.password && (
          <span className="field-error">{state.fieldErrors.password[0]}</span>
        )}
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <div className="auth-links">
        <Link href="/sign-in">Already have an account? Sign in</Link>
        <Link href="/">Back to Home</Link>
      </div>
    </form>
  );
}
