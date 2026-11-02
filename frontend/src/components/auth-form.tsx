"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  login,
  registerDeveloper,
  setAccessToken,
} from "@/lib/api";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await registerDeveloper({
          full_name: fullName,
          email,
          password,
        });
      }

      const session = await login({ email, password });
      setAccessToken(session.access_token);
      router.replace(session.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete the request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b0a] px-5 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101311] p-8">
        <Link href="/" className="text-sm font-bold tracking-wide text-emerald-300">
          OPENFORGE
        </Link>
        <h1 className="mt-8 text-3xl font-bold">
          {isRegister ? "Create your developer account" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {isRegister
            ? "Register to submit applications for admin review."
            : "Sign in to manage your submissions or review pending projects."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {isRegister && (
            <label className="block text-sm text-zinc-300">
              Full name
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
          )}
          <label className="block text-sm text-zinc-300">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : 1}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-200" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-500">
          {isRegister ? "Already registered?" : "New to OpenForge?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-emerald-300 hover:text-emerald-200"
          >
            {isRegister ? "Sign in" : "Create a developer account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
