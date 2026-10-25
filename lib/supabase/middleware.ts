/**
 * lib/supabase/middleware.ts — Session refresh and route protection helper.
 *
 * Intercepts requests to refresh Supabase auth cookie sessions via `@supabase/ssr`.
 * Inspects `supabase.auth.getUser()` to safely guard protected routes like `/saved`
 * by redirecting unauthenticated users to `/login?next=...`.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv, isSupabaseConfigured } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  // If Supabase credentials are not configured yet, allow public pages to render
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname.startsWith("/saved")) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate the user with getUser() — never trust getSession() on server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection for /saved
  if (request.nextUrl.pathname.startsWith("/saved") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and visiting /login or /signup, redirect to /saved (or next)
  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/saved";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
