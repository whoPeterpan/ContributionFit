"use client";

/**
 * components/auth-nav.tsx — Client-side authentication navigation status.
 *
 * Listens to Supabase auth state changes and renders either the 'Log in' button
 * or the authenticated user account indicator and SignOutModal.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { SignOutModal } from "@/components/sign-out-modal";
import { User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    let isMounted = true;
    try {
      const supabase = createClient();

      // Check initial user session safely
      supabase.auth.getUser().then(({ data }) => {
        if (isMounted) {
          setUser(data?.user ?? null);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch {
      // Ignore initial connection issues
    }
  }, []);

  if (!mounted) {
    return (
      <div className="h-11 w-20 bg-muted/40 animate-pulse border-2 border-border" />
    );
  }

  if (user) {
    const displayName =
      user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Contributor";

    return (
      <div className="flex items-center gap-3">
        <div
          title={user.email || ""}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-2 border-border bg-background shadow-brut"
        >
          <UserIcon className="size-3.5 text-foreground" aria-hidden="true" />
          <span className="max-w-[120px] truncate">{displayName}</span>
        </div>
        <SignOutModal />
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center h-11 px-4 font-bold border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive"
    >
      Log in
    </Link>
  );
}
