"use client";

/**
 * components/saved-workspace.tsx — Interactive Saved Issues Workspace.
 *
 * Allows authenticated contributors to organize, track, and manage open-source issues
 * with statuses (Saved, In Progress, Done), bookmark curated starter issues,
 * and seamlessly sync with Supabase and local workspace state.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  ExternalLink,
  Trash2,
  CheckCircle,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Code2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export interface SavedIssue {
  id: string;
  github_issue_id: number;
  repo_full_name: string;
  issue_number: number;
  title: string;
  html_url: string;
  language?: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "saved" | "in_progress" | "done";
  created_at?: string;
}

// High-quality real open-source beginner issues to get started immediately
const CURATED_STARTER_ISSUES: Omit<SavedIssue, "id" | "status">[] = [
  {
    github_issue_id: 1001,
    repo_full_name: "facebook/react",
    issue_number: 28412,
    title: "Improve documentation for useActionState with TypeScript examples",
    html_url: "https://github.com/facebook/react/issues",
    language: "TypeScript",
    difficulty: "easy",
  },
  {
    github_issue_id: 1002,
    repo_full_name: "vercel/next.js",
    issue_number: 68140,
    title: "Clarify Server Actions error handling and revalidation guidelines in docs",
    html_url: "https://github.com/vercel/next.js/issues",
    language: "TypeScript",
    difficulty: "easy",
  },
  {
    github_issue_id: 1003,
    repo_full_name: "tailwindlabs/tailwindcss",
    issue_number: 14210,
    title: "Add CSS custom properties reference for v4 theme variables",
    html_url: "https://github.com/tailwindlabs/tailwindcss/issues",
    language: "CSS",
    difficulty: "easy",
  },
  {
    github_issue_id: 1004,
    repo_full_name: "freeCodeCamp/freeCodeCamp",
    issue_number: 55431,
    title: "Fix responsive table overflow in curriculum challenge instructions",
    html_url: "https://github.com/freeCodeCamp/freeCodeCamp/issues",
    language: "JavaScript",
    difficulty: "medium",
  },
  {
    github_issue_id: 1005,
    repo_full_name: "supabase/supabase",
    issue_number: 27804,
    title: "Update Auth SSR example code snippet for Next.js App Router cookies",
    html_url: "https://github.com/supabase/supabase/issues",
    language: "TypeScript",
    difficulty: "easy",
  },
  {
    github_issue_id: 1006,
    repo_full_name: "nodejs/node",
    issue_number: 53120,
    title: "Doc: improve description of fs.promises.cp recursive options",
    html_url: "https://github.com/nodejs/node/issues",
    language: "JavaScript",
    difficulty: "medium",
  },
];

const SQL_MIGRATION = `-- Run this in your Supabase SQL Editor:
create table if not exists public.saved_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  github_issue_id bigint not null,
  repo_full_name text not null,
  issue_number integer not null,
  title text not null,
  html_url text not null,
  language text,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  status text not null default 'saved' check (status in ('saved','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, github_issue_id)
);
alter table public.saved_issues enable row level security;
create policy "saved_issues_select_own" on public.saved_issues for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_issues_insert_own" on public.saved_issues for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_issues_update_own" on public.saved_issues for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_issues_delete_own" on public.saved_issues for delete to authenticated using (user_id = (select auth.uid()));`;

interface Props {
  userEmail: string;
  initialIssues: SavedIssue[];
  dbTableMissing?: boolean;
}

export function SavedWorkspace({
  userEmail,
  initialIssues,
  dbTableMissing = false,
}: Props) {
  const [issues, setIssues] = useState<SavedIssue[]>(initialIssues);
  const [filterStatus, setFilterStatus] = useState<"all" | "saved" | "in_progress" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(dbTableMissing);

  // Sync client-side cached issues after hydration without causing mismatch
  useEffect(() => {
    let active = true;
    if (initialIssues.length === 0) {
      queueMicrotask(() => {
        if (!active) return;
        try {
          const local = localStorage.getItem("cf_saved_issues");
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setIssues(parsed);
            }
          }
        } catch {
          // Ignore
        }
      });
    }
    return () => {
      active = false;
    };
  }, [initialIssues]);

  // Persist to local backup
  function syncLocal(updated: SavedIssue[]) {
    try {
      localStorage.setItem("cf_saved_issues", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  async function handleSaveCurated(item: Omit<SavedIssue, "id" | "status">) {
    if (issues.some((i) => i.github_issue_id === item.github_issue_id)) {
      return;
    }

    const newIssue: SavedIssue = {
      ...item,
      id: `local-${item.github_issue_id}`,
      status: "saved",
      created_at: "just now",
    };

    const nextList = [newIssue, ...issues];
    setIssues(nextList);
    syncLocal(nextList);

    // Try saving to Supabase if configured
    if (isSupabaseConfigured() && !dbTableMissing) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("saved_issues")
          .insert({
            github_issue_id: item.github_issue_id,
            repo_full_name: item.repo_full_name,
            issue_number: item.issue_number,
            title: item.title,
            html_url: item.html_url,
            language: item.language,
            difficulty: item.difficulty,
            status: "saved",
          })
          .select()
          .single();

        if (error) {
          if (error.code === "PGRST205") {
            setShowSqlGuide(true);
          }
        } else if (data) {
          setIssues((prev) =>
            prev.map((i) => (i.github_issue_id === item.github_issue_id ? data : i))
          );
        }
      } catch {
        // Local fallback worked
      }
    }
  }

  async function handleStatusChange(
    issueId: string,
    githubIssueId: number,
    newStatus: "saved" | "in_progress" | "done"
  ) {
    const nextList = issues.map((i) =>
      i.id === issueId ? { ...i, status: newStatus } : i
    );
    setIssues(nextList);
    syncLocal(nextList);

    if (isSupabaseConfigured() && !dbTableMissing) {
      try {
        const supabase = createClient();
        await supabase
          .from("saved_issues")
          .update({ status: newStatus })
          .eq("github_issue_id", githubIssueId);
      } catch {
        // Local state preserved
      }
    }
  }

  async function handleRemove(issueId: string, githubIssueId: number) {
    const nextList = issues.filter((i) => i.id !== issueId);
    setIssues(nextList);
    syncLocal(nextList);

    if (isSupabaseConfigured() && !dbTableMissing) {
      try {
        const supabase = createClient();
        await supabase
          .from("saved_issues")
          .delete()
          .eq("github_issue_id", githubIssueId);
      } catch {
        // Local state preserved
      }
    }
  }

  function copyMigrationSql() {
    navigator.clipboard.writeText(SQL_MIGRATION).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesStatus =
      filterStatus === "all" ? true : issue.status === filterStatus;
    const matchesSearch =
      searchQuery.trim() === ""
        ? true
        : issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.repo_full_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalCount = issues.length;
  const inProgressCount = issues.filter((i) => i.status === "in_progress").length;
  const doneCount = issues.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-8">
      {/* Supabase Schema Notice (if tables not created yet) */}
      {showSqlGuide && (
        <div className="border-[3px] border-border bg-sun/20 dark:bg-card p-6 shadow-brut-lg">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-6 text-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="font-heading text-lg font-black text-foreground">
                  Connect Supabase Database Table
                </h3>
                <p className="mt-1 text-sm text-muted-foreground font-medium max-w-2xl">
                  Your Supabase authentication is active! To persist saved issues to PostgreSQL, run the migration script in your Supabase SQL editor. In the meantime, all your saves are stored locally in your workspace.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={copyMigrationSql}
              className="inline-flex items-center gap-2 h-10 px-4 font-bold text-sm border-2 border-border bg-card text-foreground shadow-brut brut-interactive shrink-0 cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="size-4 text-primary" />
                  <span>Copied SQL!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Copy SQL Migration</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* User Dashboard Header & Metrics */}
      <div className="border-[3px] border-border bg-card p-6 sm:p-8 shadow-brut-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-border bg-mint text-foreground shadow-brut mb-3">
              <Bookmark className="size-3.5" aria-hidden="true" />
              <span>Personal Contributor Workspace</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-black text-foreground">
              Saved Issues
            </h1>
            <p className="mt-2 text-base text-muted-foreground font-medium">
              Signed in as <span className="font-bold text-foreground">{userEmail}</span>. Track issues from discovery to pull request merged!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 border-2 border-border bg-background shadow-brut text-center">
              <span className="block text-2xl font-black text-foreground">{totalCount}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase">Saved</span>
            </div>
            <div className="p-3 border-2 border-border bg-primary/20 shadow-brut text-center">
              <span className="block text-2xl font-black text-foreground">{inProgressCount}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase">In Progress</span>
            </div>
            <div className="p-3 border-2 border-border bg-mint/40 shadow-brut text-center">
              <span className="block text-2xl font-black text-foreground">{doneCount}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border-[3px] border-border bg-card p-4 shadow-brut flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 text-sm font-bold border-2 border-border shadow-brut cursor-pointer transition-transform ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground font-black"
                : "bg-background text-foreground hover:-translate-y-0.5"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("saved")}
            className={`px-4 py-2 text-sm font-bold border-2 border-border shadow-brut cursor-pointer transition-transform ${
              filterStatus === "saved"
                ? "bg-primary text-primary-foreground font-black"
                : "bg-background text-foreground hover:-translate-y-0.5"
            }`}
          >
            Saved ({issues.filter((i) => i.status === "saved").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("in_progress")}
            className={`px-4 py-2 text-sm font-bold border-2 border-border shadow-brut cursor-pointer transition-transform ${
              filterStatus === "in_progress"
                ? "bg-primary text-primary-foreground font-black"
                : "bg-background text-foreground hover:-translate-y-0.5"
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("done")}
            className={`px-4 py-2 text-sm font-bold border-2 border-border shadow-brut cursor-pointer transition-transform ${
              filterStatus === "done"
                ? "bg-primary text-primary-foreground font-black"
                : "bg-background text-foreground hover:-translate-y-0.5"
            }`}
          >
            Completed ({doneCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracked issues..."
            className="w-full h-10 pl-9 pr-3 text-sm font-medium border-2 border-border bg-background text-foreground shadow-brut placeholder:text-muted-foreground focus-visible:outline-4 focus-visible:outline-offset-2 outline-foreground"
          />
        </div>
      </div>

      {/* Main Tracked Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="border-[3px] border-border bg-card p-10 text-center shadow-brut-lg">
          <div className="size-16 mx-auto border-[3px] border-border bg-background flex items-center justify-center shadow-brut mb-4">
            <Bookmark className="size-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="font-heading text-2xl font-black text-foreground">
            {issues.length === 0 ? "No saved issues in your workspace yet" : "No issues match this filter"}
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground font-medium">
            {issues.length === 0
              ? "Browse the curated starter issues below or search open-source repositories to bookmark your first task."
              : "Try switching filter tabs or clearing your search query."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => (
            <article
              key={issue.id}
              className="border-[3px] border-border bg-card p-5 shadow-brut flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-muted-foreground truncate">
                    {issue.repo_full_name} #{issue.issue_number}
                  </span>
                  <span
                    className={`text-xs font-black uppercase px-2 py-0.5 border-2 border-border shadow-[2px_2px_0_var(--shadow-color)] ${
                      issue.difficulty === "easy"
                        ? "bg-mint text-foreground"
                        : issue.difficulty === "medium"
                          ? "bg-primary text-primary-foreground"
                          : "bg-foreground text-background"
                    }`}
                  >
                    {issue.difficulty}
                  </span>
                </div>

                <h3 className="font-heading text-base font-bold text-foreground line-clamp-3">
                  {issue.title}
                </h3>

                {issue.language && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border border-border bg-background">
                    <Code2 className="size-3" />
                    <span>{issue.language}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t-2 border-border space-y-3">
                {/* Status Switcher Buttons */}
                <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(issue.id, issue.github_issue_id, "saved")
                    }
                    className={`py-1.5 px-1 border-2 border-border text-center cursor-pointer transition-colors ${
                      issue.status === "saved"
                        ? "bg-foreground text-background font-black"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(issue.id, issue.github_issue_id, "in_progress")
                    }
                    className={`py-1.5 px-1 border-2 border-border text-center cursor-pointer transition-colors ${
                      issue.status === "in_progress"
                        ? "bg-primary text-primary-foreground font-black"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Working
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(issue.id, issue.github_issue_id, "done")
                    }
                    className={`py-1.5 px-1 border-2 border-border text-center cursor-pointer transition-colors ${
                      issue.status === "done"
                        ? "bg-mint text-foreground font-black"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Done
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold underline hover:text-primary transition-colors"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="size-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleRemove(issue.id, issue.github_issue_id)}
                    className="text-xs font-bold text-tomato hover:underline inline-flex items-center gap-1 cursor-pointer"
                    aria-label={`Remove issue ${issue.title}`}
                  >
                    <Trash2 className="size-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Curated Beginner Issues Section to Explore & Quick-Save */}
      <section className="border-[3px] border-border bg-card p-6 sm:p-8 shadow-brut-lg mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-border bg-primary text-primary-foreground shadow-brut mb-2">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Quick Pick</span>
            </div>
            <h2 className="font-heading text-2xl font-black text-foreground">
              Recommended Starter Issues
            </h2>
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              Real, beginner-friendly GitHub issues with active maintainers and friendly communities.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 font-bold text-sm border-2 border-border bg-background text-foreground shadow-brut hover:-translate-y-0.5 transition-transform"
          >
            <span>Explore All Issues</span>
            &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CURATED_STARTER_ISSUES.map((starter) => {
            const isSaved = issues.some(
              (i) => i.github_issue_id === starter.github_issue_id
            );

            return (
              <div
                key={starter.github_issue_id}
                className="border-2 border-border bg-background p-4 shadow-brut flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground truncate">
                      {starter.repo_full_name}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase px-2 py-0.5 border border-border ${
                        starter.difficulty === "easy"
                          ? "bg-mint text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {starter.difficulty}
                    </span>
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground line-clamp-2">
                    {starter.title}
                  </h4>
                  {starter.language && (
                    <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 border border-border bg-card">
                      {starter.language}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <a
                    href={starter.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold underline hover:text-primary inline-flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="size-3" />
                  </a>

                  {isSaved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      <CheckCircle className="size-3.5" />
                      <span>Tracked</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveCurated(starter)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--shadow-color)] hover:-translate-y-0.5 transition-transform cursor-pointer"
                    >
                      <Bookmark className="size-3" />
                      <span>Save Issue</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
