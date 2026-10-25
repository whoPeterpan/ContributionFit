"use client";

/**
 * components/mobile-menu.tsx — Accessible mobile navigation drawer using shadcn Sheet.
 *
 * Implements mobile navigation accessible below the md breakpoint.
 * Traps focus while open, handles Escape key, sets aria-expanded on trigger,
 * and dynamically displays user auth state and sign-out controls.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Bookmark, HelpCircle, Compass, LogIn, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutModal } from "@/components/sign-out-modal";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { User } from "@supabase/supabase-js";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        setUser(data?.user ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Ignore
    }
  }, []);

  const displayName = user
    ? user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Contributor"
    : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden inline-flex items-center justify-center w-11 h-11 border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2 outline-foreground"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[85vw] max-w-xs border-l-[3px] border-border bg-card text-foreground p-6 shadow-brut-lg flex flex-col justify-between"
      >
        <div>
          <SheetHeader className="text-left border-b-2 border-border pb-4 mb-6">
            <SheetTitle className="font-heading text-xl font-black flex items-center gap-2">
              <span className="bg-primary px-2 py-0.5 text-primary-foreground border-2 border-border shadow-[2px_2px_0_var(--shadow-color)]">
                CF
              </span>
              <span>Menu</span>
            </SheetTitle>
          </SheetHeader>

          {user && (
            <div className="mb-4 p-3 border-2 border-border bg-mint/30 shadow-brut flex items-center gap-2.5">
              <div className="size-8 border-2 border-border bg-mint flex items-center justify-center shrink-0">
                <UserIcon className="size-4 text-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground uppercase">Signed in</p>
                <p className="text-sm font-black truncate text-foreground">{displayName}</p>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-3 font-heading font-black text-lg">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 border-[3px] border-border bg-background shadow-brut hover:-translate-y-0.5 transition-transform"
            >
              <Compass className="size-5" aria-hidden="true" />
              <span>Explore</span>
            </Link>
            <Link
              href="/saved"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 border-[3px] border-border bg-background shadow-brut hover:-translate-y-0.5 transition-transform"
            >
              <Bookmark className="size-5" aria-hidden="true" />
              <span>Saved Issues</span>
            </Link>
            <Link
              href="/faq"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 border-[3px] border-border bg-background shadow-brut hover:-translate-y-0.5 transition-transform"
            >
              <HelpCircle className="size-5" aria-hidden="true" />
              <span>FAQ</span>
            </Link>

            {!user ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 border-[3px] border-border bg-primary text-primary-foreground shadow-brut hover:-translate-y-0.5 transition-transform"
              >
                <LogIn className="size-5" aria-hidden="true" />
                <span>Log in</span>
              </Link>
            ) : (
              <div className="pt-2">
                <SignOutModal />
              </div>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t-2 border-border flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
