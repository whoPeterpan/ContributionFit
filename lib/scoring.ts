/**
 * lib/scoring.ts — Multi-aspect Issue Fit Scoring Engine & Contribution Plan Generator.
 *
 * Evaluates GitHub issues across five distinct dimensions:
 * 1. Skill Alignment (0-100)
 * 2. Difficulty Fit (0-100)
 * 3. Issue Clarity (0-100)
 * 4. Repository Readiness (0-100)
 * 5. Activity & Freshness (0-100)
 *
 * Produces an overall 0-100 Fit Score, transparent breakdown metrics,
 * code investigation areas, maintainer questions, and a structured 7-step Contribution Plan.
 */

import { type UserSkillProfile } from "@/lib/github";

export interface AspectScores {
  overallFit: number;
  verdict: "Strong match" | "Good match" | "Fair match" | "Challenging";
  skillAlignment: number;
  difficultyFit: number;
  issueClarity: number;
  repositoryReadiness: number;
  activityFreshness: number;
  evidenceConfidence: number;
}

export interface ContributionAnalysis {
  scores: AspectScores;
  whyItMatches: string[];
  skillsRequired: string[];
  possibleGaps: string[];
  codeAreas: string[];
  questionsForMaintainer: string[];
  plainEnglishSummary: string;
  planSteps: {
    id: number;
    title: string;
    description: string;
  }[];
}

const EXTRACTABLE_SKILLS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "React",
  "Next.js",
  "Node.js",
  "Rust",
  "Go",
  "CSS",
  "Tailwind",
  "HTML",
  "Markdown",
  "Documentation",
  "Docker",
  "SQL",
  "GraphQL",
  "Jest",
  "Vitest",
  "CI/CD",
  "Git",
];

/**
 * Extracts skills required from title, body, language, and labels.
 */
export function extractSkills(
  title: string,
  body: string,
  language?: string | null,
  labels: string[] = []
): string[] {
  const text = `${title} ${body} ${labels.join(" ")}`.toLowerCase();
  const found = new Set<string>();

  if (language && language !== "Any") {
    found.add(language);
  }

  for (const skill of EXTRACTABLE_SKILLS) {
    const lower = skill.toLowerCase();
    if (text.includes(lower)) {
      found.add(skill);
    }
  }

  // Fallback defaults
  if (found.size === 0) {
    if (text.includes("doc") || text.includes("readme")) found.add("Markdown");
    if (text.includes("css") || text.includes("style")) found.add("CSS");
    if (language) found.add(language);
  }

  return Array.from(found).slice(0, 5);
}

/**
 * Extracts potential code areas or filenames referenced in issue body.
 */
export function extractCodeAreas(body: string): string[] {
  const areas: string[] = [];
  // Match file paths like path/to/file.ext or `file.ext`
  const fileRegex = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+|`[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+`)/g;
  const matches = body.match(fileRegex);

  if (matches) {
    for (const match of matches) {
      const cleaned = match.replace(/`/g, "").trim();
      if (!areas.includes(cleaned) && cleaned.length < 50) {
        areas.push(cleaned);
      }
      if (areas.length >= 3) break;
    }
  }

  return areas;
}

/**
 * Analyzes issue clarity (expected vs actual, reproduction steps, code blocks).
 */
export function evaluateClarity(body: string): { score: number; signals: string[] } {
  const text = body.toLowerCase();
  const signals: string[] = [];
  let score = 40; // baseline

  if (text.includes("reproduce") || text.includes("steps") || text.includes("how to")) {
    score += 15;
    signals.push("Reproduction steps provided");
  }

  if (text.includes("expected") || text.includes("behavior") || text.includes("should")) {
    score += 15;
    signals.push("Expected behavior stated clearly");
  }

  if (body.includes("```") || body.includes("`")) {
    score += 15;
    signals.push("Code snippets or references included");
  }

  if (body.length > 250 && body.length < 3500) {
    score += 15;
    signals.push("Clear description length (not too sparse or bloated)");
  }

  return { score: Math.min(score, 100), signals };
}

/**
 * Calculates comprehensive multi-aspect fit scores and plan for an issue.
 */
export function analyzeIssueFit(
  issue: {
    title: string;
    body: string;
    labels: string[];
    commentsCount: number;
    updatedAt: string;
    language?: string | null;
    difficulty: "easy" | "medium" | "hard";
  },
  userProfile?: UserSkillProfile
): ContributionAnalysis {
  const profileLangs = userProfile?.languages || ["TypeScript", "JavaScript"];
  const expLevel = userProfile?.experienceLevel || "beginner";

  // 1. Skill Alignment (0-100)
  const skillsRequired = extractSkills(issue.title, issue.body, issue.language, issue.labels);
  const matchedSkills = skillsRequired.filter((s) =>
    profileLangs.some((p) => p.toLowerCase() === s.toLowerCase())
  );
  const possibleGaps = skillsRequired.filter(
    (s) => !profileLangs.some((p) => p.toLowerCase() === s.toLowerCase())
  );

  let skillAlignment = 50;
  if (skillsRequired.length > 0) {
    skillAlignment = Math.round((matchedSkills.length / skillsRequired.length) * 100);
    // If language explicitly matches
    if (issue.language && profileLangs.includes(issue.language)) {
      skillAlignment = Math.max(skillAlignment, 85);
    }
  }

  // 2. Difficulty Fit (0-100)
  let difficultyFit = 75;
  if (expLevel === "beginner") {
    if (issue.difficulty === "easy") difficultyFit = 95;
    else if (issue.difficulty === "medium") difficultyFit = 65;
    else difficultyFit = 35;
  } else if (expLevel === "intermediate") {
    if (issue.difficulty === "medium") difficultyFit = 95;
    else if (issue.difficulty === "easy") difficultyFit = 85;
    else difficultyFit = 60;
  } else {
    // Experienced
    if (issue.difficulty === "hard") difficultyFit = 95;
    else if (issue.difficulty === "medium") difficultyFit = 85;
    else difficultyFit = 70;
  }

  // 3. Issue Clarity (0-100)
  const { score: issueClarity, signals: claritySignals } = evaluateClarity(issue.body);

  // 4. Repository Readiness (0-100)
  let repositoryReadiness = 75;
  const hasGoodFirst = issue.labels.some((l) =>
    l.toLowerCase().includes("good first") || l.toLowerCase().includes("beginner")
  );
  if (hasGoodFirst) repositoryReadiness += 15;
  if (issue.commentsCount <= 3) repositoryReadiness += 10;
  repositoryReadiness = Math.min(repositoryReadiness, 100);

  // 5. Activity & Freshness (0-100)
  const updatedDate = new Date(issue.updatedAt);
  const daysOld = Math.max(
    0,
    Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  let activityFreshness = 100;
  if (daysOld > 60) activityFreshness = 60;
  else if (daysOld > 30) activityFreshness = 75;
  else if (daysOld > 14) activityFreshness = 85;
  else if (daysOld > 7) activityFreshness = 92;

  // Evidence confidence (how much data we had to work with)
  const evidenceConfidence = issue.body.length > 300 ? 90 : 65;

  // Overall Weighted Fit Score (0-100)
  const overallFit = Math.round(
    skillAlignment * 0.35 +
      difficultyFit * 0.25 +
      issueClarity * 0.2 +
      repositoryReadiness * 0.1 +
      activityFreshness * 0.1
  );

  let verdict: AspectScores["verdict"] = "Fair match";
  if (overallFit >= 80) verdict = "Strong match";
  else if (overallFit >= 65) verdict = "Good match";
  else if (overallFit >= 50) verdict = "Fair match";
  else verdict = "Challenging";

  // Construct Why It Matches reasons
  const whyItMatches: string[] = [];
  if (matchedSkills.length > 0) {
    whyItMatches.push(`Aligns with your ${matchedSkills.join(", ")} background.`);
  }
  if (issue.difficulty === "easy" && expLevel === "beginner") {
    whyItMatches.push("Difficulty looks appropriate for beginner / first-time level.");
  }
  if (claritySignals.length > 0) {
    whyItMatches.push(claritySignals[0]);
  }
  if (issue.commentsCount <= 2) {
    whyItMatches.push("Low competition (unassigned, minimal discussion).");
  }

  // Extract code areas
  const codeAreas = extractCodeAreas(issue.body);

  // Questions for maintainer
  const questionsForMaintainer = [
    "Is this issue still unassigned and open for PRs?",
    matchedSkills.length > 0
      ? `I plan to address this using ${matchedSkills[0]}. Are there any specific conventions or tests I should run?`
      : "Is there a preferred implementation approach or existing PR I should reference?",
  ];

  // Plain English Summary
  const plainEnglishSummary = `This issue requests: "${issue.title}". Maintainers are looking for a contributor to resolve this with clear acceptance criteria.`;

  // Standard 7-Step Contribution Plan
  const planSteps = [
    {
      id: 1,
      title: "Read full issue & acceptance criteria",
      description: "Carefully inspect the problem description, comments, and any linked issues.",
    },
    {
      id: 2,
      title: "Read CONTRIBUTING.md & comment on issue",
      description: "Confirm repository contribution rules, code of conduct, and announce your interest.",
    },
    {
      id: 3,
      title: "Set up development environment",
      description: "Fork the repository, clone locally, install dependencies, and confirm test suite runs.",
    },
    {
      id: 4,
      title: "Locate relevant files in codebase",
      description: codeAreas.length > 0
        ? `Investigate referenced areas: ${codeAreas.join(", ")}`
        : "Search the codebase for keywords matching the issue title.",
    },
    {
      id: 5,
      title: "Implement minimal focused fix",
      description: "Write the smallest change that solves the issue without altering unrelated behavior.",
    },
    {
      id: 6,
      title: "Run unit & regression tests",
      description: "Add or update automated tests to verify your fix and prevent future regressions.",
    },
    {
      id: 7,
      title: "Submit pull request referencing issue",
      description: `Create a clean PR referencing the issue with clear testing evidence and screenshots.`,
    },
  ];

  return {
    scores: {
      overallFit,
      verdict,
      skillAlignment,
      difficultyFit,
      issueClarity,
      repositoryReadiness,
      activityFreshness,
      evidenceConfidence,
    },
    whyItMatches,
    skillsRequired,
    possibleGaps,
    codeAreas,
    questionsForMaintainer,
    plainEnglishSummary,
    planSteps,
  };
}
