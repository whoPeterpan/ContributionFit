/**
 * app/auth/confirm/route.ts — Email verification and OTP confirmation handler.
 *
 * Verifies email confirmation links from Supabase Auth.
 * Handles both PKCE authorization codes (`?code=...`) and email OTP token hashes
 * (`?token_hash=...&type=signup`), ensuring all Supabase email templates and redirect
 * formats successfully activate user accounts and establish sessions.
 */

import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const type = (searchParams.get("type") as EmailOtpType | null) || "signup";
  const next = searchParams.get("next");
  const safeNext = getSafeRedirectUrl(next);

  try {
    const supabase = await createClient();

    // 1. PKCE Code exchange flow (used by modern Supabase client signups)
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      logger.warn("Code exchange failed in confirm route", {
        message: error.message,
      });
    }

    // 2. Token hash verification flow (Supabase verifyOtp)
    const effectiveHash = token_hash || token;
    if (effectiveHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: effectiveHash,
      });

      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      logger.warn("Email OTP verification failed in confirm route", {
        message: error.message,
      });
    }
  } catch (err) {
    logger.error("Unexpected error in auth confirm route", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Redirect to login with friendly error query parameter on failure
  return NextResponse.redirect(`${origin}/login?error=email_confirm_failed`);
}
