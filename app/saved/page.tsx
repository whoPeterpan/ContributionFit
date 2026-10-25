/**
 * app/saved/page.tsx — Protected saved issues dashboard.
 *
 * Checks authenticated user status on the server with `supabase.auth.getUser()`.
 * If unauthenticated, securely redirects to `/login?next=/saved`.
 * When authenticated, renders the full interactive SavedWorkspace dashboard.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SavedWorkspace, type SavedIssue } from "@/components/saved-workspace";

export default async function SavedPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?next=/saved");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/saved");
  }

  let dbTableMissing = false;
  let savedIssues: SavedIssue[] = [];

  try {
    const { data, error } = await supabase
      .from("saved_issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "PGRST205") {
        dbTableMissing = true;
      }
    } else if (data) {
      savedIssues = data as SavedIssue[];
    }
  } catch {
    dbTableMissing = true;
  }

  const userEmail = user.email || user.user_metadata?.email || "contributor@github";

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <SavedWorkspace
        userEmail={userEmail}
        initialIssues={savedIssues}
        dbTableMissing={dbTableMissing}
      />
    </div>
  );
}
