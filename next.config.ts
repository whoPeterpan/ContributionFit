import type { NextConfig } from "next";

/**
 * next.config.ts — Next.js configuration for Contribution Finder.
 *
 * Includes security headers (CSP, HSTS, X-Frame-Options etc.),
 * disabled production source maps, and no X-Powered-By header.
 * CSP allows 'unsafe-eval' only in development (for React devtools).
 *
 * NOTE: A nonce-based CSP (per the Next.js docs) would let us remove
 * 'unsafe-inline' from script-src. That's a possible future upgrade.
 */

const isDev = process.env.NODE_ENV === "development";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseOrigin = "";
try {
  if (supabaseUrl) {
    supabaseOrigin = new URL(supabaseUrl).origin;
  }
} catch {
  // URL not set yet — will be empty
}

const connectSrc = [
  "'self'",
  supabaseOrigin,
  "https://*.supabase.co",
  "wss://*.supabase.co",
  isDev ? "ws:" : "",
]
  .filter(Boolean)
  .join(" ");

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const cspValue = [
  `default-src 'self'`,
  `script-src ${scriptSrc}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://avatars.githubusercontent.com`,
  `font-src 'self'`,
  `connect-src ${connectSrc}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self' https://*.supabase.co`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspValue },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  /* ── Security ── */
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  /* ── Turbopack (Tailwind v4) ── */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /* ── Security headers on all routes ── */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
