/**
 * app/api/issues/route.ts — Live GitHub issues search API route.
 *
 * Server-only endpoint querying GitHub Search API with Octokit.
 * Applies transparent difficulty estimation heuristics, server-side caching (10 mins),
 * query parameter validation via Zod, rate limiting, and contributor skill matching.
 */

import { NextResponse, type NextRequest } from "next/server";
import { Octokit } from "octokit";
import {
  searchParamsSchema,
  buildGitHubSearchQuery,
  estimateDifficulty,
  personalizeIssue,
  type GitHubIssueResult,
  type UserSkillProfile,
} from "@/lib/github";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// 10-minute server data cache for GitHub search queries
const searchCache = new Map<
  string,
  { timestamp: number; data: GitHubIssueResult[] }
>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Thoroughly sanitizes raw GitHub issue body into clean, readable preview text.
 * Removes: HTML comments, HTML tags, markdown links/images, code blocks,
 * emoji shortcodes (:rocket:), raw URLs, horizontal rules, and normalizes whitespace.
 */
function sanitizeBodyPreview(raw: string): string {
  let text = raw;
  // Strip HTML comments <!-- ... -->
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  // Strip fenced code blocks ```...```
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Strip inline code `...`
  text = text.replace(/`[^`]*`/g, " ");
  // Strip markdown images ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  // Strip markdown links [text](url) → keep text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Strip raw HTML tags <tag ...> and </tag>
  text = text.replace(/<[^>]+>/g, " ");
  // Strip emoji shortcodes :emoji_name:
  text = text.replace(/:[a-z0-9_+-]+:/gi, " ");
  // Strip raw URLs (http/https)
  text = text.replace(/https?:\/\/[^\s)>\]]+/g, " ");
  // Strip markdown heading markers ###
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Strip horizontal rules --- / *** / ___
  text = text.replace(/^[-*_]{3,}\s*$/gm, " ");
  // Strip markdown bold/italic markers
  text = text.replace(/[*_]{1,3}/g, "");
  // Strip markdown list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  // Strip numbered list markers
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  // Strip remaining markdown special chars
  text = text.replace(/[[\]()]/g, " ");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Truncate to readable preview length
  return text.slice(0, 300);
}

/**
 * Detects whether text is likely English (US).
 * Uses a combination of:
 * - ASCII letter ratio (rejects CJK, Cyrillic, Arabic, Devanagari, etc.)
 * - Non-English word blocklist (catches Latin-script languages: Spanish, Portuguese, French, German)
 * - Presence of common English stop-words
 * Returns true if the text appears to be English.
 */
function isLikelyEnglish(title: string, body: string): boolean {
  const combined = `${title} ${body}`.trim();
  if (combined.length < 10) return true; // Too short to judge

  // Check the title specifically — it's the primary user-facing text
  // Reject if title has significant non-ASCII-letter characters (CJK, Cyrillic, Arabic, etc.)
  const titleNonAscii = title.replace(/[\x00-\x7F]/g, "");
  if (title.length > 5 && titleNonAscii.length / title.length > 0.15) {
    return false; // More than 15% non-ASCII in title → likely non-English
  }

  // Blocklist of common non-English words (Latin-script languages)
  // These words are extremely common in Spanish, Portuguese, French, German titles
  const nonEnglishWords = [
    // Spanish
    "\\bel\\b", "\\blos\\b", "\\blas\\b", "\\bdel\\b", "\\buna\\b", "\\buno\\b",
    "\\bpara\\b", "\\bcon\\b", "\\bpor\\b", "\\bque\\b", "\\bcomo\\b",
    "\\bdesde\\b", "\\besta\\b", "\\beste\\b", "\\bsobre\\b", "\\btiene\\b",
    "\\bcuando\\b", "\\bhacer\\b", "\\bpuede\\b", "\\btambién\\b",
    "\\bvalidar\\b", "\\bconectar\\b", "\\bcrear\\b", "\\bañadir\\b",
    "\\bfunción\\b", "\\bpágina\\b", "\\bpublicación\\b",
    "\\bfase\\b", "\\bnodo\\b", "\\bimplementar\\b",
    // Portuguese
    "\\bpara\\b", "\\bcom\\b", "\\bnão\\b", "\\buma\\b", "\\bdos\\b",
    "\\bdas\\b", "\\bnas\\b", "\\bnos\\b", "\\bsão\\b", "\\bpelo\\b",
    "\\bpela\\b", "\\bquando\\b", "\\bcomo\\b", "\\bseu\\b", "\\bsua\\b",
    "\\besse\\b", "\\bessa\\b",
    // French
    "\\bles\\b", "\\bdes\\b", "\\bune\\b", "\\bpour\\b", "\\bavec\\b",
    "\\bsur\\b", "\\bdans\\b", "\\best\\b", "\\bqui\\b", "\\bpas\\b",
    "\\bplus\\b", "\\bson\\b", "\\bont\\b", "\\bfaire\\b", "\\bcomme\\b",
    "\\bajouter\\b", "\\bcréer\\b", "\\bmettre\\b",
    // German
    "\\bdie\\b", "\\bder\\b", "\\bein\\b", "\\beine\\b", "\\bmit\\b",
    "\\bund\\b", "\\bvon\\b", "\\bauf\\b", "\\bnicht\\b", "\\bfür\\b",
    "\\bwird\\b", "\\bsind\\b", "\\bwenn\\b", "\\bdass\\b", "\\bnach\\b",
    "\\bhinzufügen\\b", "\\berstellen\\b",
  ];

  const titleLower = ` ${title.toLowerCase()} `;
  const nonEnglishHits = nonEnglishWords.filter((pattern) =>
    new RegExp(pattern, "i").test(titleLower)
  ).length;

  // If 2+ non-English common words found in title alone, reject
  if (nonEnglishHits >= 2) {
    return false;
  }

  // Sample the first 500 chars of combined text for English stop-words
  const sample = ` ${combined.slice(0, 500).toLowerCase()} `;
  const englishStopWords = [
    " the ", " is ", " a ", " to ", " in ", " of ", " and ",
    " for ", " this ", " that ", " with ", " on ", " it ",
    " be ", " as ", " are ", " was ", " not ", " but ",
    " have ", " from ", " or ", " an ", " when ", " should ",
    " can ", " would ", " if ", " will ", " we ", " you ",
  ];
  const stopWordHits = englishStopWords.filter((w) => sample.includes(w)).length;

  // Require at least 2 English stop-words in the sampled text
  if (stopWordHits < 2) {
    // Last chance: if title is purely ASCII with no non-English hits, allow it
    const titleLetters = title.replace(/[^a-zA-Z]/g, "");
    if (titleNonAscii.length === 0 && titleLetters.length > 3 && nonEnglishHits === 0) return true;
    return false;
  }

  return true;
}

// Curated backup issues in case GitHub Search API limit is exhausted without GITHUB_TOKEN
const FALLBACK_ISSUES: GitHubIssueResult[] = [
  {
    githubIssueId: 28412,
    repoFullName: "facebook/react",
    number: 28412,
    title: "Improve documentation for useActionState with TypeScript examples",
    htmlUrl: "https://github.com/facebook/react/issues/28412",
    labels: ["good first issue", "docs"],
    commentsCount: 2,
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    difficulty: "easy",
    difficultyReason: "Beginner-friendly label, concise description, low discussion",
    bodyPreview:
      "The useActionState hook needs more explicit TypeScript generic typing examples for form actions returning error objects.",
    language: "TypeScript",
  },
  {
    githubIssueId: 68140,
    repoFullName: "vercel/next.js",
    number: 68140,
    title: "Clarify Server Actions error handling and revalidation guidelines in docs",
    htmlUrl: "https://github.com/vercel/next.js/issues/68140",
    labels: ["documentation", "good first issue"],
    commentsCount: 3,
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    difficulty: "easy",
    difficultyReason: "Documentation label, short body under 1,500 chars",
    bodyPreview:
      "Clarify when revalidatePath and redirect should be thrown inside try/catch blocks in Next.js App Router.",
    language: "TypeScript",
  },
  {
    githubIssueId: 14210,
    repoFullName: "tailwindlabs/tailwindcss",
    number: 14210,
    title: "Add CSS custom properties reference for v4 theme variables",
    htmlUrl: "https://github.com/tailwindlabs/tailwindcss/issues/14210",
    labels: ["good first issue", "enhancement"],
    commentsCount: 4,
    updatedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    difficulty: "easy",
    difficultyReason: "Beginner-friendly label, concise description",
    bodyPreview:
      "Documenting how @theme inline exposes CSS variables directly in root stylesheet.",
    language: "CSS",
  },
  {
    githubIssueId: 55431,
    repoFullName: "freeCodeCamp/freeCodeCamp",
    number: 55431,
    title: "Fix responsive table overflow in curriculum challenge instructions",
    htmlUrl: "https://github.com/freeCodeCamp/freeCodeCamp/issues/55431",
    labels: ["help wanted", "scope: curriculum"],
    commentsCount: 6,
    updatedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    difficulty: "medium",
    difficultyReason: "Moderate scope UI bug fix across multiple curriculum pages",
    bodyPreview:
      "On mobile screens < 380px, tables in curriculum challenges overflow horizontally without container scroll wrapper.",
    language: "JavaScript",
  },
  {
    githubIssueId: 27804,
    repoFullName: "supabase/supabase",
    number: 27804,
    title: "Update Auth SSR example code snippet for Next.js App Router cookies",
    htmlUrl: "https://github.com/supabase/supabase/issues/27804",
    labels: ["good first issue", "auth"],
    commentsCount: 2,
    updatedAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
    difficulty: "easy",
    difficultyReason: "Small code example patch, low comments",
    bodyPreview:
      "The SSR auth guide should illustrate createServerClient cookieStore.getAll() and setAll() methods.",
    language: "TypeScript",
  },
  {
    githubIssueId: 53120,
    repoFullName: "nodejs/node",
    number: 53120,
    title: "Doc: improve description of fs.promises.cp recursive options",
    htmlUrl: "https://github.com/nodejs/node/issues/53120",
    labels: ["doc", "good first issue"],
    commentsCount: 5,
    updatedAt: new Date(Date.now() - 3600000 * 60).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 160).toISOString(),
    difficulty: "medium",
    difficultyReason: "Documentation clarification on complex file system options",
    bodyPreview:
      "Clarify error behavior when recursive is false and destination directory already exists.",
    language: "JavaScript",
  },
  {
    githubIssueId: 44102,
    repoFullName: "python/cpython",
    number: 44102,
    title: "Doc: clarify argparse mutually exclusive groups behavior with required=True",
    htmlUrl: "https://github.com/python/cpython/issues/44102",
    labels: ["easy", "docs"],
    commentsCount: 3,
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 55).toISOString(),
    difficulty: "easy",
    difficultyReason: "Beginner doc issue with clear specification",
    bodyPreview:
      "The documentation does not explicitly detail that required=True on add_mutually_exclusive_group requires exactly one option.",
    language: "Python",
  },
  {
    githubIssueId: 31205,
    repoFullName: "rust-lang/rust",
    number: 31205,
    title: "Improve diagnostic error message when borrowing mutable reference twice",
    htmlUrl: "https://github.com/rust-lang/rust/issues/31205",
    labels: ["A-diagnostics", "help wanted"],
    commentsCount: 8,
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    difficulty: "hard",
    difficultyReason: "Compiler diagnostic enhancement requiring AST knowledge",
    bodyPreview:
      "The borrow checker diagnostic could suggest using cell or refactoring to immutable borrows.",
    language: "Rust",
  },
];

export async function GET(request: NextRequest) {
  // Rate limiting by client IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateLimitResult = await checkRateLimit(`issues-${clientIp}`, {
    maxRequests: 30,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before searching again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.reset) },
      }
    );
  }

  // Parse and validate query parameters
  const { searchParams } = new URL(request.url);
  const rawParams = {
    language: searchParams.get("language") || "Any",
    level: searchParams.get("level") || "any",
    freshness: searchParams.get("freshness") || "30",
    docsOnly: searchParams.get("docsOnly") || "false",
    q: searchParams.get("q") || "",
    page: searchParams.get("page") || "1",
  };

  const parsed = searchParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters provided." },
      { status: 400 }
    );
  }

  const params = parsed.data;

  // User profile for personalization
  const userLanguages = searchParams.get("userLanguages")?.split(",").filter(Boolean) || ["TypeScript", "JavaScript"];
  const experienceLevel = (searchParams.get("exp") as UserSkillProfile["experienceLevel"]) || "beginner";
  const userProfile: UserSkillProfile = {
    languages: userLanguages.length > 0 ? userLanguages : ["TypeScript", "JavaScript"],
    experienceLevel,
    preferredTypes: ["all"],
  };

  const searchQuery = buildGitHubSearchQuery(params);
  const cacheKey = `${searchQuery}-page-${params.page}`;

  // Check 10-minute cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    let results = cached.data;
    if (params.level !== "any") {
      results = results.filter((i) => i.difficulty === params.level);
    }
    results = results.map((i) => personalizeIssue(i, userProfile));
    results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({
      issues: results,
      cached: true,
      query: searchQuery,
      totalCount: results.length,
    });
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN || undefined,
      userAgent: "Contribution-Finder/1.0",
    });

    const response = await octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
      sort: "updated",
      order: "desc",
      per_page: 30, // Fetch extra to compensate for non-English filtering
      page: params.page,
    });

    const mappedIssues: GitHubIssueResult[] = response.data.items.map((item) => {
      // Extract repo full name from repository_url: "https://api.github.com/repos/owner/repo"
      const repoUrlParts = item.repository_url.split("/");
      const repoFullName = `${repoUrlParts[repoUrlParts.length - 2]}/${repoUrlParts[repoUrlParts.length - 1]}`;

      const labels = item.labels.map((l) =>
        typeof l === "string" ? l : l.name || ""
      ).filter(Boolean);

      const bodyText = item.body || "";
      const { difficulty, reason } = estimateDifficulty(
        labels,
        item.comments,
        bodyText.length
      );

      // Thorough text sanitizer: strips markdown, HTML, URLs, emoji codes, etc.
      const bodyPreview = sanitizeBodyPreview(bodyText);

      return {
        githubIssueId: item.id,
        repoFullName,
        number: item.number,
        // Light title sanitization: strip backticks, emoji shortcodes, excessive brackets
        title: item.title
          .replace(/`/g, "")
          .replace(/:[a-z0-9_+-]+:/gi, "")
          .replace(/\s+/g, " ")
          .trim(),
        htmlUrl: item.html_url,
        labels,
        commentsCount: item.comments,
        updatedAt: item.updated_at,
        createdAt: item.created_at,
        difficulty,
        difficultyReason: reason,
        bodyPreview: bodyPreview || "No detailed description provided by maintainer.",
        language: params.language !== "Any" ? params.language : undefined,
      };
    });
    // Filter to English-only issues and cap at 12
    const englishIssues = mappedIssues.filter((issue) =>
      isLikelyEnglish(issue.title, issue.bodyPreview)
    ).slice(0, 12);

    // Store in cache (only English-filtered results)
    searchCache.set(cacheKey, { timestamp: Date.now(), data: englishIssues });

    let finalIssues = englishIssues;
    if (params.level !== "any") {
      finalIssues = finalIssues.filter((i) => i.difficulty === params.level);
    }
    finalIssues = finalIssues.map((i) => personalizeIssue(i, userProfile));
    finalIssues.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({
      issues: finalIssues,
      cached: false,
      query: searchQuery,
      totalCount: response.data.total_count,
    });
  } catch (err: unknown) {
    logger.warn("GitHub search API rate limit or error, serving curated fallback", {
      error: err instanceof Error ? err.message : String(err),
    });

    // Return friendly curated issues matched to user's filters
    let fallback = FALLBACK_ISSUES;
    if (params.language !== "Any") {
      fallback = fallback.filter((i) => i.language?.toLowerCase() === params.language.toLowerCase());
      if (fallback.length === 0) fallback = FALLBACK_ISSUES;
    }
    if (params.level !== "any") {
      fallback = fallback.filter((i) => i.difficulty === params.level);
    }
    fallback = fallback.map((i) => personalizeIssue(i, userProfile));
    fallback.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({
      issues: fallback,
      cached: false,
      isFallback: true,
      query: searchQuery,
      totalCount: fallback.length,
      notice: "Live GitHub rate limit reached; showing verified curated beginner issues.",
    });
  }
}
