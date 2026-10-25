import "server-only";

/**
 * lib/supabase/admin.ts — Supabase admin client with secret key bypassing RLS.
 *
 * This client is strictly restricted to server-side background tasks that access
 * server-only tables: `/api/summarize` (caching AI summaries) and `/api/newsletter`
 * (storing subscribers). It must never be imported elsewhere or exposed to clients.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";

export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SECRET_KEY } = getServerEnv();

  return createSupabaseClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
