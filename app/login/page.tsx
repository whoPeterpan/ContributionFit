"use client";

/**
 * app/login/page.tsx — User login page with GitHub OAuth and email/password authentication.
 *
 * Implements authentication following Supabase SSR guidelines and neo-brutalist styling.
 * Automatically detects authenticated state and redirects to /saved.
 * Supports primary one-click GitHub OAuth and email sign-in with password toggle.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/security";
import { isSupabaseConfigured } from "@/lib/env";
import { PasswordInput } from "@/components/password-input";
import { GithubIcon } from "@/components/icons";
import { AlertCircle, ArrowRight, CheckCircle2, Bookmark, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");
  // Default to /saved if no next parameter is provided
  const safeNext = nextParam ? getSafeRedirectUrl(nextParam) : "/saved";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(isSupabaseConfigured());
  const [errorMessage, setErrorMessage] = useState(
    errorParam === "auth_callback_failed"
      ? "Authentication failed. Please try signing in again."
      : errorParam === "email_confirm_failed"
        ? "Email confirmation link is invalid or expired. Please sign in or request a new link."
        : ""
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Check if user is already signed in
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        if (data?.user) {
          setCurrentUser(data.user);
          const timer = setTimeout(() => {
            window.location.href = safeNext;
          }, 1200);
          return () => clearTimeout(timer);
        }
        setCheckingAuth(false);
      })
      .catch(() => {
        if (active) setCheckingAuth(false);
      });

    return () => {
      active = false;
    };
  }, [safeNext]);

  async function handleGitHubLogin() {
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env.local file."
      );
      return;
    }
    setOauthLoading(true);
    setErrorMessage("");
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });

      if (error) {
        setErrorMessage("Unable to connect to GitHub. Please try again.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setOauthLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env.local file."
      );
      return;
    }
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setErrorMessage(
            "Please confirm your email address before signing in. Check your inbox for the confirmation link."
          );
        } else {
          setErrorMessage(
            "Invalid email or password. If you recently registered, please verify your email first."
          );
        }
        setLoading(false);
        return;
      }

      // Hard redirect to ensure fresh cookies and SSR state
      window.location.href = safeNext;
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (currentUser) {
    return (
      <div className="w-full max-w-md mx-auto my-12 p-6 sm:p-8 border-[3px] border-border bg-card shadow-brut-lg text-center">
        <div className="mx-auto size-14 border-[3px] border-border bg-mint flex items-center justify-center shadow-brut mb-4">
          <CheckCircle2 className="size-8 text-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
          You are signed in!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-medium">
          Logged in as:
        </p>
        <p className="mt-1 font-mono font-bold text-base text-foreground break-all">
          {currentUser.email}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Redirecting to your workspace...
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={safeNext}
            className="w-full h-12 flex items-center justify-center gap-2 font-black text-base border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
          >
            <Bookmark className="size-4" aria-hidden="true" />
            <span>Go to Saved Issues</span>
          </Link>
          <Link
            href="/"
            className="w-full h-11 flex items-center justify-center gap-2 font-bold text-sm border-[3px] border-border bg-background text-foreground shadow-brut brut-interactive"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            <span>Explore Issues</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-12 p-6 sm:p-8 border-[3px] border-border bg-card shadow-brut-lg">
      <h1 className="font-heading text-3xl font-black tracking-tight text-foreground text-center">
        Sign In
      </h1>
      <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
        Find and track beginner-friendly open-source issues.
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 p-4 border-[3px] border-border bg-tomato/20 text-foreground text-sm font-semibold flex items-start gap-3 shadow-brut"
        >
          <AlertCircle
            className="size-5 shrink-0 text-tomato mt-0.5"
            aria-hidden="true"
          />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* GitHub OAuth Button (Primary) */}
      <button
        type="button"
        onClick={handleGitHubLogin}
        disabled={oauthLoading || loading || checkingAuth}
        className="mt-6 w-full h-12 flex items-center justify-center gap-3 font-bold text-base border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive disabled:opacity-50 cursor-pointer"
      >
        <GithubIcon className="size-5" />
        <span>{oauthLoading ? "Connecting..." : "Continue with GitHub"}</span>
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase font-black">
          <span className="bg-card px-3 text-muted-foreground">
            Or with email
          </span>
        </div>
      </div>

      {/* Email + Password Form (Secondary) */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-bold text-foreground mb-1.5"
          >
            Email address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || oauthLoading || checkingAuth}
            placeholder="you@example.com"
            className="w-full h-11 px-3 text-base font-medium border-[3px] border-border bg-card text-foreground shadow-brut placeholder:text-muted-foreground focus-visible:outline-4 focus-visible:outline-offset-2 outline-foreground disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-bold text-foreground mb-1.5"
          >
            Password
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || oauthLoading || checkingAuth}
          />
        </div>

        <button
          type="submit"
          disabled={loading || oauthLoading || checkingAuth}
          className="w-full mt-2 h-12 flex items-center justify-center gap-2 font-black text-base border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? "Signing in..." : "Sign in"}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-semibold text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={
            nextParam
              ? `/signup?next=${encodeURIComponent(safeNext)}`
              : "/signup"
          }
          className="underline font-bold text-foreground hover:text-primary transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="w-full max-w-md mx-auto my-12 p-8 border-[3px] border-border bg-card shadow-brut-lg text-center font-bold">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
