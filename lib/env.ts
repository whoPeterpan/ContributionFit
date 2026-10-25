/**
 * lib/env.ts — Environment variable validation using zod.
 *
 * Validates all required environment variables. Public variables
 * (NEXT_PUBLIC_*) are safe for client components. Server-only variables
 * are validated here but only imported in server-side code.
 *
 * Validation is lazy: schemas are checked when getPublicEnv() or
 * getServerEnv() is first called. This lets the app build even when
 * server secrets aren't in the environment (e.g. during `next build`
 * on CI where only NEXT_PUBLIC_* vars are set).
 */

import { z } from "zod";

// ── Public variables (safe to use in client and server code) ──

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .min(1, { error: "NEXT_PUBLIC_SITE_URL is required" }),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, { error: "NEXT_PUBLIC_SUPABASE_URL is required" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, { error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required" }),
});

// ── Server-only variables (imported only in files with `import "server-only"`) ──

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, { error: "SUPABASE_SECRET_KEY is required" }),
  GEMINI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});


// ── Types ──

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ── Cached singletons ──

let _publicEnv: PublicEnv | null = null;
let _serverEnv: ServerEnv | null = null;

/**
 * Returns validated public environment variables. Safe to call from any
 * component (client or server). Throws a clear error if a variable is
 * missing — without printing any actual secret values.
 */
export function getPublicEnv(): PublicEnv {
  if (_publicEnv) return _publicEnv;

  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Missing or invalid public environment variables:\n${result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`
    );
  }

  _publicEnv = result.data;
  return _publicEnv;
}

/**
 * Returns validated server-only environment variables. Must only be called
 * from server-side code (route handlers, Server Components, Server Actions).
 * Throws a clear error if a required variable is missing.
 */
export function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;

  const result = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  if (!result.success) {
    throw new Error(
      `Missing or invalid server environment variables:\n${result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`
    );
  }

  _serverEnv = result.data;
  return _serverEnv;
}

/**
 * Checks whether Supabase public credentials are provided in the environment.
 * Allows public routes to render gracefully during initial local development.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
