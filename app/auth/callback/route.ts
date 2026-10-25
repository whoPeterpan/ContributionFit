/**
 * app/auth/callback/route.ts — Authentication code exchange route (PKCE & OAuth).
 *
 * Receives authorization codes from GitHub OAuth or Supabase Auth,
 * exchanges them for persistent session cookies, and safely redirects the user.
 * Also supports OTP verification as fallback for custom redirect URLs.
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

    // 1. PKCE Code exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      logger.warn("OAuth/Auth code exchange failed", {
        message: error.message,
      });
    }

    // 2. Token hash fallback
    const effectiveHash = token_hash || token;
    if (effectiveHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: effectiveHash,
      });

      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    }
  } catch (err) {
    logger.error("Unexpected error in auth callback route", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Redirect to login with friendly error query parameter on failure
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
