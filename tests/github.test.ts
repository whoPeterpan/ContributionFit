/**
 * tests/github.test.ts — Unit tests for GitHub Search query builder, difficulty heuristic, and personalization.
 */

import { describe, expect, it } from "vitest";
import {
  buildGitHubSearchQuery,
  estimateDifficulty,
  sanitizeKeywords,
  personalizeIssue,
  type GitHubIssueResult,
  type UserSkillProfile,
} from "@/lib/github";

describe("GitHub Query Builder", () => {
  it("builds the correct default query with all required qualifiers", () => {
    const fixedDate = new Date("2026-10-25T00:00:00Z");
    const query = buildGitHubSearchQuery(
      {
        language: "Any",
        level: "any",
        freshness: "30",
        docsOnly: false,
        q: "",
        page: 1,
      },
      fixedDate
    );

    expect(query).toContain("is:issue");
    expect(query).toContain("is:open");
    expect(query).toContain("is:public");
    expect(query).toContain("archived:false");
    expect(query).toContain("no:assignee");
    expect(query).toContain("-linked:pr");
    expect(query).toContain('label:"good first issue"');
    expect(query).toContain("updated:>=2026-09-25");
  });

  it("applies docsOnly label switch and language qualifier", () => {
    const query = buildGitHubSearchQuery({
      language: "TypeScript",
      level: "easy",
      freshness: "14",
      docsOnly: true,
      q: "button",
      page: 1,
    });

    expect(query).toContain('label:"documentation"');
    expect(query).not.toContain('label:"good first issue"');
    expect(query).toContain("language:typescript");
    expect(query).toContain("button");
  });

  it("sanitizes keywords to prevent search qualifier injection", () => {
    const malicious = 'author:evil org:target "malicious code"';
    const clean = sanitizeKeywords(malicious);

    expect(clean).not.toContain(":");
    expect(clean).not.toContain('"');
    expect(clean).toBe("author evil org target  malicious code");
  });
});

describe("Difficulty Heuristic", () => {
  it("rates as easy when easy label exists with low comments and short body", () => {
    const result = estimateDifficulty(["good first issue"], 2, 800);
    expect(result.difficulty).toBe("easy");
  });

  it("rates as hard when a hard signal label exists", () => {
    const result = estimateDifficulty(["good first issue", "refactor"], 1, 400);
    expect(result.difficulty).toBe("hard");
  });

  it("rates as hard when comments >= 15", () => {
    const result = estimateDifficulty(["good first issue"], 16, 500);
    expect(result.difficulty).toBe("hard");
  });

  it("rates as hard when body length > 4000", () => {
    const result = estimateDifficulty(["good first issue"], 2, 4500);
    expect(result.difficulty).toBe("hard");
  });

  it("rates as medium for standard issues without easy labels", () => {
    const result = estimateDifficulty(["enhancement"], 3, 1200);
    expect(result.difficulty).toBe("medium");
  });
});

describe("Contributor Skill Personalization", () => {
  const sampleIssue: GitHubIssueResult = {
    githubIssueId: 101,
    repoFullName: "facebook/react",
    number: 1234,
    title: "Update hook documentation",
    htmlUrl: "https://github.com/facebook/react/issues/1234",
    labels: ["good first issue"],
    commentsCount: 1,
    updatedAt: "2026-10-24T12:00:00Z",
    createdAt: "2026-10-20T12:00:00Z",
    difficulty: "easy",
    difficultyReason: "Beginner friendly",
    bodyPreview: "Clarify useActionState syntax",
    language: "TypeScript",
  };

  it("calculates high match score for beginner matching language and difficulty", () => {
    const profile: UserSkillProfile = {
      languages: ["TypeScript", "JavaScript"],
      experienceLevel: "beginner",
      preferredTypes: ["docs"],
    };

    const personalized = personalizeIssue(sampleIssue, profile);
    expect(personalized.matchScore).toBeGreaterThanOrEqual(80);
    expect(personalized.analysis?.scores.verdict).toBe("Strong match");
    expect(personalized.matchReasons?.some((r) => r.includes("TypeScript"))).toBe(true);
    expect(personalized.analysis?.planSteps.length).toBe(7);
  });
});
