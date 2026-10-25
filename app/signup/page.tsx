"use client";

/**
 * app/signup/page.tsx — User registration page with email confirmation screen.
 *
 * Provides GitHub OAuth registration and email/password signup.
 * Automatically detects authenticated state and redirects to /saved.
 * Enforces email confirmation, password length requirements (>= 10 characters),
 * and provides clear error and success states.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/security";
import { isSupabaseConfigured } from "@/lib/env";
import { PasswordInput } from "@/components/password-input";
import { GithubIcon } from "@/components/icons";
import { MailCheck, AlertCircle, ArrowRight, CheckCircle2, Bookmark, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

function SignupForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam ? getSafeRedirectUrl(nextParam) : "/saved";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(isSupabaseConfigured());

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

  async function handleGitHubSignup() {
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

  async function handleEmailSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env.local file."
      );
      return;
    }
    if (password.length < 10) {
      setErrorMessage("Password must be at least 10 characters long.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(safeNext)}`,
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("rate limit") ||
          error.status === 429
        ) {
          setErrorMessage(
            "Supabase email rate limit exceeded. Please wait a short while before trying again, or sign in if you already have an account."
          );
        } else {
          setErrorMessage(
            error.message || "Unable to complete registration. Please check your information."
          );
        }
        return;
      }

      setSubmittedEmail(email.trim());
      setSuccess(true);
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
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
          You are already signed in!
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

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto my-12 p-6 sm:p-8 border-[3px] border-border bg-card shadow-brut-lg text-center">
        <div className="mx-auto size-14 border-[3px] border-border bg-mint flex items-center justify-center shadow-brut mb-4">
          <MailCheck className="size-8 text-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
          Check your inbox
        </h1>
        <p className="mt-3 text-sm text-muted-foreground font-medium">
          We sent a confirmation link to:
        </p>
        <p className="mt-1 font-mono font-bold text-base text-foreground break-all">
          {submittedEmail}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Click the link in the email to activate your account and start saving
          issues. If you don&apos;t see it, check your spam folder.
        </p>
        <div className="mt-6 pt-6 border-t-2 border-border flex flex-col gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 font-bold border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
          >
            Proceed to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-12 p-6 sm:p-8 border-[3px] border-border bg-card shadow-brut-lg">
      <h1 className="font-heading text-3xl font-black tracking-tight text-foreground text-center">
        Create Account
      </h1>
      <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
        Join Contribution Finder to track and conquer your first issues.
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
        onClick={handleGitHubSignup}
        disabled={oauthLoading || loading || checkingAuth}
        className="mt-6 w-full h-12 flex items-center justify-center gap-3 font-bold text-base border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive disabled:opacity-50 cursor-pointer"
      >
        <GithubIcon className="size-5" />
        <span>{oauthLoading ? "Connecting..." : "Sign up with GitHub"}</span>
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
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-bold text-foreground mb-1.5"
          >
            Email address
          </label>
          <input
            id="signup-email"
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
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="signup-password"
              className="block text-sm font-bold text-foreground"
            >
              Password
            </label>
            <span className="text-xs text-muted-foreground font-semibold">
              Min. 10 characters
            </span>
          </div>
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            disabled={loading || oauthLoading || checkingAuth}
          />
        </div>

        <button
          type="submit"
          disabled={loading || oauthLoading || checkingAuth}
          className="w-full mt-2 h-12 flex items-center justify-center gap-2 font-black text-base border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? "Creating account..." : "Create account"}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-semibold text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={
            nextParam ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"
          }
          className="underline font-bold text-foreground hover:text-primary transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="w-full max-w-md mx-auto my-12 p-8 border-[3px] border-border bg-card shadow-brut-lg text-center font-bold">
            Loading...
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
