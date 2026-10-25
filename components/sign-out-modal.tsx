"use client";

/**
 * components/sign-out-modal.tsx — Accessible confirmation modal for signing out.
 *
 * Implements an AlertDialog requiring user confirmation before terminating their session.
 * Default focus is placed on the safe 'Cancel' button to prevent accidental sign-outs.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

interface SignOutModalProps {
  trigger?: React.ReactNode;
}

export function SignOutModal({ trigger }: SignOutModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      // Ignore or log error
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <AlertDialogTrigger
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold border-2 border-border bg-card shadow-brut hover:-translate-y-0.5 transition-transform cursor-pointer"
          aria-label="Sign out of your account"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span>Sign out</span>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="border-[3px] border-border bg-card p-6 shadow-brut-lg rounded-none max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl font-black">
            Sign out of Contribution Finder?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm font-medium mt-2">
            You will need to sign back in with your GitHub account or email to
            view and manage your saved issues.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row items-center justify-end gap-3">
          <AlertDialogCancel
            disabled={loading}
            className="border-2 border-border font-bold rounded-none h-10 px-4 shadow-brut"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleSignOut();
            }}
            disabled={loading}
            className="border-2 border-border bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold rounded-none h-10 px-4 shadow-brut"
          >
            {loading ? "Signing out..." : "Sign out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
