/**
 * lib/github.ts — GitHub Search API client, query builder, and difficulty heuristic.
 *
 * Implements pure functions for building sanitized GitHub issue search queries,
 * estimating issue difficulty based on label signals, comment counts, and body length,
 * and ranking issues based on contributor skill sets and experience levels.
 */

import { z } from "zod";
import { analyzeIssueFit, type ContributionAnalysis } from "@/lib/scoring";

export const ALLOWED_LANGUAGES = [
  "Any",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
] as const;

export type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];

export const searchParamsSchema = z.object({
  language: z.enum(ALLOWED_LANGUAGES).default("Any"),
  level: z.enum(["any", "easy", "medium", "hard"]).default("any"),
  freshness: z.enum(["7", "14", "30", "90"]).default("30"),
  docsOnly: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  q: z
    .string()
    .max(80)
    .optional()
    .default("")
    .transform((val) => sanitizeKeywords(val)),
  page: z.coerce.number().int().min(1).max(5).default(1),
});

export type GitHubSearchParams = z.infer<typeof searchParamsSchema>;

export interface GitHubIssueResult {
  githubIssueId: number;
  repoFullName: string;
  number: number;
  title: string;
  htmlUrl: string;
  labels: string[];
  commentsCount: number;
  updatedAt: string;
  createdAt: string;
  difficulty: "easy" | "medium" | "hard";
  difficultyReason: string;
  bodyPreview: string;
  language?: string | null;
  // Personalized match scoring
  matchScore?: number;
  matchReasons?: string[];
  analysis?: ContributionAnalysis;
}

export interface UserSkillProfile {
  languages: string[];
  experienceLevel: "beginner" | "intermediate" | "experienced";
  preferredTypes: ("docs" | "bug" | "feature" | "all")[];
}

/**
 * Sanitizes search keywords by stripping colons, quotes, and ASCII control characters.
 * Prevents injection of GitHub search qualifiers (e.g., `author:`, `org:`).
 */
export function sanitizeKeywords(input: string | undefined): string {
  if (!input) return "";
  return input
    .replace(/[:"']/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 80);
}

const EASY_SIGNALS = [
  "good first issue",
  "good-first-issue",
  "documentation",
  "docs",
  "typo",
  "beginner",
  "easy",
  "first-timers-only",
  "starter",
];

const HARD_SIGNALS = [
  "hard",
  "complex",
  "advanced",
  "refactor",
  "breaking",
  "security",
  "performance",
  "architecture",
];

/**
 * Difficulty heuristic:
 * - Hard if contains any hard signal label, comments >= 15, or body > 4000 characters.
 * - Easy if contains any easy signal label, comments <= 5, and body <= 2000 characters.
 * - Otherwise Medium.
 */
export function estimateDifficulty(
  labels: string[],
  commentsCount: number,
  bodyLength: number
): { difficulty: "easy" | "medium" | "hard"; reason: string } {
  const normalizedLabels = labels.map((l) => l.toLowerCase());

  const hasHardLabel = normalizedLabels.some((label) =>
    HARD_SIGNALS.some((signal) => label.includes(signal))
  );

  if (hasHardLabel) {
    return {
      difficulty: "hard",
      reason: "Contains advanced architecture/breaking change labels",
    };
  }

  if (commentsCount >= 15) {
    return {
      difficulty: "hard",
      reason: `High discussion activity (${commentsCount} comments) indicating complexity`,
    };
  }

  if (bodyLength > 4000) {
    return {
      difficulty: "hard",
      reason: "Extensive specification requirement (>4,000 characters)",
    };
  }

  const hasEasyLabel = normalizedLabels.some((label) =>
    EASY_SIGNALS.some((signal) => label.includes(signal))
  );

  if (hasEasyLabel && commentsCount <= 5 && bodyLength <= 2000) {
    return {
      difficulty: "easy",
      reason: "Beginner-friendly label, concise description, low discussion",
    };
  }

  return {
    difficulty: "medium",
    reason: "Standard open-source task requiring moderate component knowledge",
  };
}

/**
 * Builds the GitHub search query string.
 * Must include: is:issue is:open is:public archived:false no:assignee -linked:pr
 */
export function buildGitHubSearchQuery(
  params: GitHubSearchParams,
  referenceDate: Date = new Date()
): string {
  const parts: string[] = [
    "is:issue",
    "is:open",
    "is:public",
    "archived:false",
    "no:assignee",
    "-linked:pr",
  ];

  if (params.docsOnly) {
    parts.push('label:"documentation"');
  } else {
    parts.push('label:"good first issue"');
  }

  if (params.language && params.language !== "Any") {
    parts.push(`language:${params.language.toLowerCase()}`);
  }

  const days = parseInt(params.freshness || "30", 10);
  const cutoffDate = new Date(referenceDate);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  const formattedDate = cutoffDate.toISOString().split("T")[0];
  parts.push(`updated:>=${formattedDate}`);

  if (params.q) {
    parts.push(params.q);
  }

  return parts.join(" ");
}


/**
 * Ranks and personalizes an issue against the contributor's skill profile.
 * Computes multi-aspect scores, rationale, and a step-by-step contribution plan.
 */
export function personalizeIssue(
  issue: GitHubIssueResult,
  profile?: UserSkillProfile
): GitHubIssueResult {
  const analysis = analyzeIssueFit(
    {
      title: issue.title,
      body: issue.bodyPreview,
      labels: issue.labels,
      commentsCount: issue.commentsCount,
      updatedAt: issue.updatedAt,
      language: issue.language,
      difficulty: issue.difficulty,
    },
    profile
  );

  return {
    ...issue,
    matchScore: analysis.scores.overallFit,
    matchReasons: analysis.whyItMatches,
    analysis,
  };
}

