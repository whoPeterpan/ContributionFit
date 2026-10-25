import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Sparkles, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Learn how Contribution Finder surfaces beginner-friendly GitHub issues, how our difficulty rating works, and how AI summaries help you start contributing.",
};

const LAST_UPDATED = "October 24, 2026";
const LAST_UPDATED_ISO = "2026-10-24";

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    id: "how-are-issues-chosen",
    question: "How are issues chosen?",
    answer: (
      <div className="space-y-3">
        <p>
          We automatically query the public GitHub REST API for open issues
          labelled with beginner-friendly tags such as{" "}
          <code className="bg-background px-1.5 py-0.5 border border-border font-mono text-xs font-bold">
            good first issue
          </code>
          ,{" "}
          <code className="bg-background px-1.5 py-0.5 border border-border font-mono text-xs font-bold">
            help wanted
          </code>
          , and{" "}
          <code className="bg-background px-1.5 py-0.5 border border-border font-mono text-xs font-bold">
            hacktoberfest
          </code>
          .
        </p>
        <p>
          To ensure your time isn&apos;t wasted on abandoned or claimed tasks,
          we only display issues that are <strong>recently active</strong>,
          currently <strong>unassigned</strong>, and have{" "}
          <strong>zero linked pull requests</strong>.
        </p>
      </div>
    ),
  },
  {
    id: "do-i-need-to-log-in",
    question: "Do I need to log in?",
    answer: (
      <p>
        No! Browsing, filtering, and reading issues and their AI-generated
        summaries is completely free and requires no account. You only need to
        sign in (using your GitHub account or email) if you want to bookmark
        issues to your personal workspace and track your status as{" "}
        <em>Saved</em>, <em>In Progress</em>, or <em>Done</em>.
      </p>
    ),
  },
  {
    id: "difficulty-heuristics",
    question: "What do Easy / Medium / Hard mean?",
    answer: (
      <div className="space-y-3">
        <p>
          Every issue is evaluated with an automated, transparent heuristic to
          help you gauge the required effort before diving in:
        </p>
        <ul className="space-y-2 list-none pl-0">
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 border-2 border-border bg-mint px-2 py-0.5 text-xs font-black shadow-[1px_1px_0_var(--shadow-color)] text-foreground">
              Easy
            </span>
            <span>
              Explicit beginner labels, concise issue descriptions (&lt; 800
              characters), and fewer than 5 comments. Perfect for your first
              open-source PR!
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 border-2 border-border bg-primary px-2 py-0.5 text-xs font-black shadow-[1px_1px_0_var(--shadow-color)] text-primary-foreground">
              Medium
            </span>
            <span>
              Moderate descriptions, bug fixes, or feature enhancements with
              5–15 comments. Requires familiarity with the language or
              framework.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 border-2 border-border bg-foreground text-background px-2 py-0.5 text-xs font-black shadow-[1px_1px_0_var(--shadow-color)]">
              Hard
            </span>
            <span>
              Extensive multi-step instructions, architectural topics, or
              lengthy community discussion (&gt; 15 comments).
            </span>
          </li>
        </ul>
        <p className="text-xs font-bold text-muted-foreground pt-1 border-t border-border">
          ⚠️ <em>Honest note:</em> This difficulty level is an estimate based on
          issue metadata, not an absolute guarantee. Always read the
          repository&apos;s contributing guidelines and issue comments before
          starting work.
        </p>
      </div>
    ),
  },
  {
    id: "how-do-ai-summaries-work",
    question: "How do AI summaries work and can they be wrong?",
    answer: (
      <div className="space-y-3">
        <p>
          When you click &ldquo;Generate AI Summary&rdquo;, we send the issue
          title, description, and tags to Google Gemma (via Google GenAI) to
          distill what needs to be fixed and where to look into a concise
          3-bullet brief.
        </p>
        <p>
          Summaries are cached in our database so the same issue doesn&apos;t
          consume unnecessary quota. Like all language models, AI can
          occasionally miss subtle project context or edge cases. Always treat
          the summary as an orientation guide and read the maintainer&apos;s
          original issue.
        </p>
      </div>
    ),
  },
  {
    id: "what-data-do-you-store",
    question: "What data do you store?",
    answer: (
      <div className="space-y-2">
        <p>We take privacy seriously. In plain language, we only store:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your email address (if you register with email/password).</li>
          <li>
            Your GitHub username and user ID (if you sign in with GitHub).
          </li>
          <li>The GitHub issue IDs and repo names you choose to save.</li>
          <li>Cached AI summaries for public issues.</li>
          <li>Your email if you voluntarily join the newsletter.</li>
        </ul>
        <p className="pt-2">
          We use <strong>zero tracking scripts</strong>, zero third-party
          analytics, and zero ad networks.
        </p>
      </div>
    ),
  },
  {
    id: "how-to-contribute",
    question: "How do I contribute to this project?",
    answer: (
      <div className="space-y-3">
        <p>
          Contribution Finder is 100% open source under the MIT License! We love
          first-time contributors and welcome pull requests for bug fixes, UI
          improvements, and documentation.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-2 border-border bg-background hover:bg-muted shadow-brut transition-transform hover:-translate-y-0.5"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-2 border-border bg-mint text-foreground shadow-brut transition-transform hover:-translate-y-0.5"
          >
            <span>Explore Issues Now</span>
            <Sparkles className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    ),
  },
];

export default function FAQPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

      {/* Header Banner */}
      <div className="border-[3px] border-border bg-card p-6 sm:p-10 shadow-brut-lg mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-border bg-mint text-foreground shadow-brut mb-4">
          <HelpCircle className="size-3.5" aria-hidden="true" />
          <span>Knowledge Base</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
          Frequently Asked Questions
        </h1>

        <p className="mt-3 text-base sm:text-lg text-muted-foreground font-medium max-w-2xl">
          Everything you need to know about how Contribution Finder discovers
          unclaimed issues, estimates difficulty, and helps you make your first
          pull request.
        </p>

        <div className="mt-6 pt-4 border-t-2 border-border flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span className="flex items-center gap-2">
            <BookOpen className="size-4" aria-hidden="true" />
            <span>6 Questions answered</span>
          </span>
          <time dateTime={LAST_UPDATED_ISO}>Last updated: {LAST_UPDATED}</time>
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-4">
        <Accordion defaultValue={["how-are-issues-chosen"]}>
          {faqItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border-[3px] border-border bg-card p-5 sm:p-6 shadow-brut mb-4"
            >
              <AccordionTrigger className="font-heading text-lg sm:text-xl font-black text-foreground hover:no-underline text-left cursor-pointer py-1">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="mt-4 text-base text-muted-foreground font-medium leading-relaxed border-t-2 border-border pt-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Still Have Questions Box */}
      <div className="mt-12 border-[3px] border-border bg-card p-8 shadow-brut text-center">
        <h2 className="font-heading text-2xl font-black text-foreground">
          Still have questions?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground font-medium max-w-md mx-auto">
          Can&apos;t find what you&apos;re looking for? Reach out through our
          community or explore beginner issues directly.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            <span>Explore Issues</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive"
          >
            <span>Sign In to Save</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
