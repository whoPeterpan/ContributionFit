/**
 * lib/supabase/server.ts — Supabase server client for Server Components, Actions, and Route Handlers.
 *
 * Configures cookie-based session management using `@supabase/ssr`.
 * User data read and written with this client automatically enforces Row Level Security (RLS)
 * under the authenticated user's session.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is ignored if middleware refreshes user sessions.
          }
        },
      },
    }
  );
}
