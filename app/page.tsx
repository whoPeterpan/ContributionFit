/**
 * app/page.tsx — Landing page for Contribution Finder.
 * Server component that checks auth state and shows personalized content for logged-in users.
 * Features neo-brutalist hero, real-time live GitHub IssueFinder with skill personalization, and FAQ.
 */

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  ArrowRight,
  Bookmark,
  User,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { IssueFinder } from "@/components/issue-finder";

async function getUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function Home() {
  const user = await getUser();
  const displayName = user
    ? user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Contributor"
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      {/* Welcome Banner for Logged-In Users */}
      {user && (
        <section className="border-[3px] border-border bg-mint/30 p-6 sm:p-8 shadow-brut-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 border-[3px] border-border bg-primary flex items-center justify-center shadow-brut shrink-0">
                <User
                  className="size-7 text-primary-foreground"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Welcome back
                </p>
                <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
                  {displayName}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Logged in as {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/saved"
                className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
              >
                <Bookmark className="size-4" aria-hidden="true" />
                <span>Open Saved Workspace</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="border-[3px] border-border bg-card p-8 md:p-12 shadow-brut-lg">
        <div className="max-w-3xl space-y-6">
          <div className="inline-block border-2 border-border bg-mint px-3 py-1 text-sm font-bold shadow-[2px_2px_0_var(--shadow-color)] text-foreground">
            Open Source Hackathon Project
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-foreground">
            Find an issue you can finish this weekend.
          </h1>
          <p className="text-lg md:text-xl font-medium text-muted-foreground leading-relaxed">
            Beginner-friendly, unassigned GitHub issues with no linked pull
            requests. Rated Easy, Medium, or Hard with transparent heuristics
            and skill-based matching.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <span className="font-bold text-sm text-foreground">
              Difficulty Tiers:
            </span>
            <span className="border-2 border-border bg-mint px-3 py-1 text-xs font-bold shadow-[2px_2px_0_var(--shadow-color)] text-foreground">
              Easy
            </span>
            <span className="border-2 border-border bg-primary text-primary-foreground px-3 py-1 text-xs font-bold shadow-[2px_2px_0_var(--shadow-color)]">
              Medium
            </span>
            <span className="border-2 border-border bg-foreground text-background px-3 py-1 text-xs font-bold shadow-[2px_2px_0_var(--shadow-color)]">
              Hard
            </span>
          </div>
        </div>
      </section>

      {/* Real-Time Live GitHub Issue Finder with Contributor Personalization */}
      <section id="finder" className="space-y-6">
        <IssueFinder />
      </section>

      {/* Quick Start / CTA Section */}
      <section className="border-[3px] border-border bg-card p-8 text-center shadow-brut">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-border bg-mint text-foreground shadow-brut mb-3">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          <span>Curated Open Source</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground mb-2">
          Ready to make your first contribution?
        </h2>
        <p className="text-muted-foreground font-medium max-w-xl mx-auto mb-6 text-sm sm:text-base">
          We filter through thousands of GitHub issues daily to find open,
          unassigned tasks with zero pull requests.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive"
          >
            <HelpCircle className="size-4" aria-hidden="true" />
            <span>Read How It Works</span>
          </Link>
          {user ? (
            <Link
              href="/saved"
              className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
            >
              <Bookmark className="size-4" aria-hidden="true" />
              <span>Go to Saved Issues</span>
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
            >
              <span>Create Free Account</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      {/* Short FAQ Section Near Footer */}
      <section
        id="faq"
        className="border-[3px] border-border bg-card p-8 md:p-10 shadow-brut-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-border bg-mint text-foreground shadow-brut mb-3">
              <HelpCircle className="size-3.5" aria-hidden="true" />
              <span>FAQ</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-sm font-bold underline hover:text-primary transition-colors text-foreground"
          >
            <span>View all 6 questions</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <Accordion defaultValue={["home-faq-1"]}>
          <AccordionItem
            value="home-faq-1"
            className="border-[3px] border-border bg-background p-4 sm:p-5 shadow-brut mb-4"
          >
            <AccordionTrigger className="font-heading text-base sm:text-lg font-black text-foreground hover:no-underline text-left cursor-pointer">
              How are issues chosen?
            </AccordionTrigger>
            <AccordionContent className="mt-3 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed border-t-2 border-border pt-3">
              We query the GitHub REST API for open issues with beginner labels
              like <code>good first issue</code> and <code>help wanted</code>.
              Issues must be recently active, unassigned, and have no linked
              pull requests so you aren&apos;t competing with someone else.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="home-faq-2"
            className="border-[3px] border-border bg-background p-4 sm:p-5 shadow-brut mb-4"
          >
            <AccordionTrigger className="font-heading text-base sm:text-lg font-black text-foreground hover:no-underline text-left cursor-pointer">
              Do I need to log in to browse?
            </AccordionTrigger>
            <AccordionContent className="mt-3 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed border-t-2 border-border pt-3">
              No. Anyone can explore and search issues without logging in.
              Signing in (via GitHub OAuth or email) is only needed to save
              issues and track your progress.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="home-faq-3"
            className="border-[3px] border-border bg-background p-4 sm:p-5 shadow-brut"
          >
            <AccordionTrigger className="font-heading text-base sm:text-lg font-black text-foreground hover:no-underline text-left cursor-pointer">
              What do the difficulty ratings mean?
            </AccordionTrigger>
            <AccordionContent className="mt-3 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed border-t-2 border-border pt-3">
              We rate issues <strong>Easy</strong> (beginner labels, short
              descriptions, &lt; 5 comments), <strong>Medium</strong> (moderate
              descriptions, bug fixes), or <strong>Hard</strong> (architecture,
              complex discussions). It&apos;s an estimate, so always review the
              issue before starting!
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
