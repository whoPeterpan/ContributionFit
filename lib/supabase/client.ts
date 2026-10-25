/**
 * lib/supabase/client.ts — Supabase browser client for client components.
 *
 * Used exclusively for client-side authentication interactions (such as signing in
 * with OAuth or submitting email auth forms). Data mutations and queries should run
 * on the server via `lib/supabase/server.ts`.
 */

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();

  return createBrowserClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
