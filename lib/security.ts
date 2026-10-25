/**
 * lib/security.ts — Security utilities for open-redirect defense and request origin validation.
 *
 * Provides functions to safely sanitize redirect targets so malicious external URLs
 * cannot hijack authentication redirects, and validates incoming mutation requests
 * against the expected site origin to prevent CSRF.
 */

import { getPublicEnv } from "@/lib/env";

/**
 * Sanitizes a redirect path parameter (such as `?next=/saved`).
 *
 * Enforces strict relative URL rules:
 * - Must start with a single forward slash `/`
 * - Must not start with `//` (protocol-relative URLs)
 * - Must not contain backslashes `\` (which browsers normalize to `/`)
 * - Must not contain URI schemes (e.g. `javascript:`, `http:`, `https:`)
 * - Must not contain ASCII control characters or newlines
 *
 * If any of these rules are violated, it safely falls back to `/`.
 */
export function getSafeRedirectUrl(target: string | null | undefined): string {
  if (!target || typeof target !== "string") {
    return "/";
  }

  const trimmed = target.trim();

  // Must start with exactly one '/' and not '//'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  // Must not contain backslashes
  if (trimmed.includes("\\")) {
    return "/";
  }

  // Must not contain ASCII control characters (0x00 - 0x1F, 0x7F)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return "/";
  }

  // Must not contain colon before query string or hash (prevents schemes like "/https://evil.com" or "javascript:")
  const pathPart = trimmed.split("?")[0].split("#")[0];
  if (pathPart.includes(":")) {
    return "/";
  }

  return trimmed;
}

/**
 * Validates that an incoming HTTP request originated from the expected site domain.
 * Protects mutation route handlers from Cross-Site Request Forgery (CSRF).
 */
export function validateRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // If no origin header is provided, check referer
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) {
      return false;
    }
    try {
      const refererUrl = new URL(referer);
      return !host || refererUrl.host === host;
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) {
      return true;
    }

    const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
    if (NEXT_PUBLIC_SITE_URL) {
      const siteUrl = new URL(NEXT_PUBLIC_SITE_URL);
      if (originUrl.host === siteUrl.host) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
