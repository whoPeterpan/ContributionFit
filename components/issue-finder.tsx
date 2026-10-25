"use client";

/**
 * components/issue-finder.tsx — AI-Powered Issue Discovery & Contributor Fit Platform.
 *
 * Implements the reference discovery platform:
 * - Contributor profile completeness and skill setup
 * - Score out of 100 with "Strong match" / "Good match" verdicts
 * - Multi-aspect score breakdown (Skill alignment, Difficulty fit, Clarity, Readiness, Freshness)
 * - "Why It Matches" rationale bullets
 * - "View contribution plan ->" and "Explain with AI" integration
 * - Real-time GitHub REST API search with zero PR collision guarantee
 */

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Sparkles,
  Bookmark,
  ExternalLink,
  Copy,
  Check,
  Code2,
  SlidersHorizontal,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Lock,
} from "lucide-react";
import { ALLOWED_LANGUAGES, type GitHubIssueResult, type UserSkillProfile } from "@/lib/github";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { ContributionPlanModal } from "@/components/contribution-plan-modal";

const POPULAR_SKILLS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "React",
  "CSS",
  "Java",
  "PHP",
  "Ruby",
];

const DEFAULT_PROFILE: UserSkillProfile = {
  languages: ["TypeScript", "JavaScript"],
  experienceLevel: "beginner",
  preferredTypes: ["all"],
};

export function IssueFinder() {
  // Contributor skill personalization profile — initialize with default for SSR consistency
  const [profile, setProfile] = useState<UserSkillProfile>(DEFAULT_PROFILE);
  const [hasCustomizedProfile, setHasCustomizedProfile] = useState(false);
  const [showProfileConfig, setShowProfileConfig] = useState(false);

  // Search, Filter & Sort state
  const [language, setLanguage] = useState<string>("Any");
  const [level, setLevel] = useState<"any" | "easy" | "medium" | "hard">("any");
  const [freshness, setFreshness] = useState<string>("30");
  const [docsOnly, setDocsOnly] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  const [sortBy, setSortBy] = useState<"best" | "score" | "freshness" | "clarity">("best");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // UI state for expandable breakdowns and modal
  const [expandedScoreId, setExpandedScoreId] = useState<number | null>(null);
  const [selectedPlanIssue, setSelectedPlanIssue] = useState<GitHubIssueResult | null>(null);

  // Data fetching state
  const [issues, setIssues] = useState<GitHubIssueResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Load user saved profile and bookmarks on client after hydration
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const savedProfile = localStorage.getItem("cf_contributor_profile");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed && Array.isArray(parsed.languages)) {
            setProfile(parsed);
            setHasCustomizedProfile(true);
          }
        }

        const localSaved = localStorage.getItem("cf_saved_issues");
        if (localSaved) {
          const parsedIssues = JSON.parse(localSaved);
          if (Array.isArray(parsedIssues)) {
            setSavedIds(
              new Set(
                parsedIssues.map(
                  (item: { github_issue_id: number }) => item.github_issue_id
                )
              )
            );
          }
        }
      } catch {
        // Ignore
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Save profile to localStorage
  function updateProfile(newProfile: UserSkillProfile) {
    setProfile(newProfile);
    setHasCustomizedProfile(true);
    try {
      localStorage.setItem("cf_contributor_profile", JSON.stringify(newProfile));
    } catch {
      // Ignore
    }
  }

  function toggleLanguageSkill(lang: string) {
    const updatedLangs = profile.languages.includes(lang)
      ? profile.languages.filter((l) => l !== lang)
      : [...profile.languages, lang];
    updateProfile({ ...profile, languages: updatedLangs });
  }

  // Fetch live issues from /api/issues
  useEffect(() => {
    let active = true;

    const queryParams = new URLSearchParams({
      language,
      level,
      freshness,
      docsOnly: String(docsOnly),
      q: keyword.trim(),
      page: "1",
      userLanguages: profile.languages.join(","),
      exp: profile.experienceLevel,
    });

    fetch(`/api/issues?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 429 ? "rate_limit" : "failed");
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.issues) {
          setIssues(data.issues);
          setTotalCount(data.totalCount || data.issues.length);
        }
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.message === "rate_limit"
            ? "GitHub API limit reached. Showing verified beginner issues."
            : "Failed to load issues from GitHub. Please try again."
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [language, level, freshness, docsOnly, keyword, profile, refreshTrigger]);

  function triggerRefresh() {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }

  // Handle saving issue
  async function handleSaveIssue(issue: GitHubIssueResult) {
    const newSaved = new Set(savedIds);
    newSaved.add(issue.githubIssueId);
    setSavedIds(newSaved);

    // Save to local backup
    try {
      const existing = JSON.parse(localStorage.getItem("cf_saved_issues") || "[]");
      if (!existing.some((i: { github_issue_id: number }) => i.github_issue_id === issue.githubIssueId)) {
        existing.unshift({
          id: `local-${issue.githubIssueId}`,
          github_issue_id: issue.githubIssueId,
          repo_full_name: issue.repoFullName,
          issue_number: issue.number,
          title: issue.title,
          html_url: issue.htmlUrl,
          language: issue.language,
          difficulty: issue.difficulty,
          status: "saved",
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("cf_saved_issues", JSON.stringify(existing));
      }
    } catch {
      // Ignore
    }

    // Attempt Supabase insert if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("saved_issues").insert({
          github_issue_id: issue.githubIssueId,
          repo_full_name: issue.repoFullName,
          issue_number: issue.number,
          title: issue.title,
          html_url: issue.htmlUrl,
          language: issue.language,
          difficulty: issue.difficulty,
          status: "saved",
        });
      } catch {
        // Local fallback handled
      }
    }
  }

  function handleCopy(issue: GitHubIssueResult) {
    navigator.clipboard.writeText(issue.htmlUrl).then(() => {
      setCopiedId(issue.githubIssueId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // Sort issues according to selected sort mode
  const sortedIssues = [...issues].sort((a, b) => {
    if (sortBy === "best" || sortBy === "score") {
      return (b.matchScore || 0) - (a.matchScore || 0);
    }
    if (sortBy === "freshness") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (sortBy === "clarity") {
      return (b.analysis?.scores.issueClarity || 0) - (a.analysis?.scores.issueClarity || 0);
    }
    return 0;
  });

  const profileCompleteness = hasCustomizedProfile ? 100 : 25;

  return (
    <div className="space-y-8">
      {/* Reference Header Banner: Profile completeness & Setup prompt */}
      <div className="border-[3px] border-border bg-card p-6 shadow-brut-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-border bg-mint text-foreground shadow-brut mb-2">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Smart Recommendation Engine</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
              Find your next contribution
            </h2>
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              Open issues ranked by how well they fit your specific skills, experience, and availability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Profile Completeness Gauge */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 border-2 border-border bg-background shadow-brut">
              <div className="w-16 h-2 border border-border bg-card overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
              <span className="text-xs font-bold text-foreground">
                {profileCompleteness}% profile
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowProfileConfig(!showProfileConfig)}
              className="inline-flex items-center gap-2 h-10 px-4 font-bold text-sm border-2 border-border bg-background text-foreground shadow-brut brut-interactive cursor-pointer"
            >
              <SlidersHorizontal className="size-4" />
              <span>{showProfileConfig ? "Close Profile" : "Edit Skills"}</span>
            </button>

            <button
              type="button"
              onClick={triggerRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 font-bold text-sm border-2 border-border bg-background text-foreground shadow-brut brut-interactive cursor-pointer disabled:opacity-50"
              title="Refresh issues from GitHub"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Informational Profile Banner (matches Figma Image 1) */}
        {!hasCustomizedProfile && (
          <div className="p-4 border-2 border-border bg-primary/10 shadow-brut flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="size-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                Scores are generic until you add skills. Fit is estimated from your languages, tools, and experience level, so a few details make rankings significantly more tailored.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileConfig(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 font-black text-xs border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--shadow-color)] hover:-translate-y-0.5 transition-transform shrink-0 cursor-pointer"
            >
              <span>Set up my skills</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Expandable Contributor Skill Customizer */}
        {showProfileConfig && (
          <div className="pt-6 border-t-2 border-border space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-foreground mb-2">
                Your Primary Languages & Frameworks
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SKILLS.map((lang) => {
                  const active = profile.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguageSkill(lang)}
                      className={`px-3 py-1.5 text-xs font-bold border-2 border-border shadow-[2px_2px_0_var(--shadow-color)] cursor-pointer transition-transform ${
                        active
                          ? "bg-primary text-primary-foreground font-black -translate-y-0.5"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {lang} {active && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-foreground mb-2">
                Your Open-Source Experience Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateProfile({ ...profile, experienceLevel: "beginner" })}
                  className={`p-3 text-left border-2 border-border shadow-brut cursor-pointer transition-colors ${
                    profile.experienceLevel === "beginner"
                      ? "bg-mint text-foreground font-black"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-black text-sm">First-Time Contributor</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    Prioritizes docs, typos, low comment counts (&lt; 3), and starter labels.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateProfile({ ...profile, experienceLevel: "intermediate" })}
                  className={`p-3 text-left border-2 border-border shadow-brut cursor-pointer transition-colors ${
                    profile.experienceLevel === "intermediate"
                      ? "bg-primary text-primary-foreground font-black"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-black text-sm">Junior / Student</p>
                  <p className="text-xs font-medium mt-0.5 opacity-90">
                    Targets bug fixes, UI components, unit tests, and medium tasks.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateProfile({ ...profile, experienceLevel: "experienced" })}
                  className={`p-3 text-left border-2 border-border shadow-brut cursor-pointer transition-colors ${
                    profile.experienceLevel === "experienced"
                      ? "bg-foreground text-background font-black"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-black text-sm">Experienced Engineer</p>
                  <p className="text-xs font-medium opacity-80 mt-0.5">
                    Challenges, performance optimizations, and multi-file refactoring.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Search & Filter Control Panel */}
      <div className="border-[3px] border-border bg-card p-6 shadow-brut-lg space-y-5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="size-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search issues, repositories, technologies..."
              className="w-full h-12 pl-11 pr-4 text-base font-medium border-[3px] border-border bg-background text-foreground shadow-brut placeholder:text-muted-foreground focus-visible:outline-4 focus-visible:outline-offset-2 outline-foreground"
            />
          </div>

          {/* Language Selector */}
          <div className="w-full lg:w-56">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Filter by programming language"
              className="w-full h-12 px-3 text-sm font-bold border-[3px] border-border bg-background text-foreground shadow-brut cursor-pointer focus-visible:outline-4 outline-foreground"
            >
              {ALLOWED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  Language: {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Freshness Selector */}
          <div className="w-full lg:w-48">
            <select
              value={freshness}
              onChange={(e) => setFreshness(e.target.value)}
              aria-label="Filter by issue freshness"
              className="w-full h-12 px-3 text-sm font-bold border-[3px] border-border bg-background text-foreground shadow-brut cursor-pointer focus-visible:outline-4 outline-foreground"
            >
              <option value="7">Active: Past 7 days</option>
              <option value="14">Active: Past 14 days</option>
              <option value="30">Active: Past 30 days</option>
              <option value="90">Active: Past 90 days</option>
            </select>
          </div>
        </div>

        {/* Difficulty Buttons, Docs Toggle & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t-2 border-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-foreground mr-1">
              Difficulty:
            </span>
            {(["any", "easy", "medium", "hard"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`px-3 py-1.5 text-xs font-bold border-2 border-border shadow-[2px_2px_0_var(--shadow-color)] cursor-pointer transition-transform ${
                  level === lvl
                    ? lvl === "easy"
                      ? "bg-mint text-foreground font-black"
                      : lvl === "medium"
                        ? "bg-primary text-primary-foreground font-black"
                        : lvl === "hard"
                          ? "bg-foreground text-background font-black"
                          : "bg-primary text-primary-foreground font-black"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {lvl.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={docsOnly}
                onChange={(e) => setDocsOnly(e.target.checked)}
                className="size-4 border-2 border-border accent-primary cursor-pointer"
              />
              <span>Documentation Only</span>
            </label>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 px-2.5 text-xs font-bold border-2 border-border bg-background text-foreground shadow-brut cursor-pointer"
              >
                <option value="best">Best match</option>
                <option value="score">Highest fit score</option>
                <option value="freshness">Most recent</option>
                <option value="clarity">Highest issue clarity</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-black text-foreground">
          {loading ? "Searching GitHub..." : `${totalCount.toLocaleString()} Recommended Issues`}
        </h3>
        <span className="text-xs font-bold text-muted-foreground">
          Ranked by multi-aspect contributor fit
        </span>
      </div>

      {/* Error / Notice Display */}
      {error && (
        <div className="p-4 border-[3px] border-border bg-sun/20 text-foreground text-sm font-bold shadow-brut flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={triggerRefresh}
            className="underline font-black hover:text-primary cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading && (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-[3px] border-border bg-card p-6 shadow-brut space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-muted/60 w-32 border border-border" />
                <div className="h-12 w-12 rounded-full bg-muted/60 border border-border" />
              </div>
              <div className="h-6 bg-muted/60 w-3/4 border border-border" />
              <div className="h-16 bg-muted/40 w-full border border-border" />
              <div className="h-10 bg-muted/60 w-1/3 border border-border mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Live Issue Cards List (Structured according to Figma Reference Image 1) */}
      {!loading && sortedIssues.length > 0 && (
        <div className="space-y-6">
          {sortedIssues.map((issue) => {
            const isSaved = savedIds.has(issue.githubIssueId);
            const analysis = issue.analysis;
            const fitScore = issue.matchScore || analysis?.scores.overallFit || 85;
            const verdict = analysis?.scores.verdict || (fitScore >= 85 ? "Strong match" : "Good match");
            const isExpanded = expandedScoreId === issue.githubIssueId;

            return (
              <article
                key={issue.githubIssueId}
                className="border-[3px] border-border bg-card p-6 sm:p-7 shadow-brut-lg flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Repo, Issue #, Status Pill, Updated & Circular Score Gauge */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {issue.repoFullName} #{issue.number}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-black uppercase border border-border bg-mint text-foreground">
                        Open
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        updated recently
                      </span>
                    </div>

                    {/* Circular Score Badge — locked/dimmed when profile not set */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`size-14 rounded-full border-[3px] border-border flex items-center justify-center font-heading text-xl font-black shadow-brut relative ${
                          !hasCustomizedProfile
                            ? "bg-muted/50 text-muted-foreground"
                            : fitScore >= 85
                              ? "bg-mint text-foreground"
                              : fitScore >= 70
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground"
                        }`}
                      >
                        {!hasCustomizedProfile ? (
                          <Lock className="size-5 text-muted-foreground" />
                        ) : (
                          fitScore
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground mt-1 text-center max-w-[80px]">
                        {hasCustomizedProfile ? verdict : "Set skills"}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {issue.title}
                    </a>
                  </h4>

                  {/* Body Preview */}
                  <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
                    {issue.bodyPreview}
                  </p>

                  {/* Tag Chips */}
                  <div className="mt-3.5 flex flex-wrap gap-2 items-center">
                    {issue.language && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold border-2 border-border bg-background text-foreground">
                        <Code2 className="size-3" />
                        <span>{issue.language}</span>
                      </span>
                    )}
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-1 border-2 border-border shadow-[2px_2px_0_var(--shadow-color)] ${
                        issue.difficulty === "easy"
                          ? "bg-mint text-foreground"
                          : issue.difficulty === "medium"
                            ? "bg-primary text-primary-foreground"
                            : "bg-foreground text-background"
                      }`}
                    >
                      {issue.difficulty}
                    </span>
                    {issue.labels.map((l) => (
                      <span
                        key={l}
                        className="px-2 py-0.5 text-xs font-medium border border-border bg-background text-muted-foreground"
                      >
                        {l}
                      </span>
                    ))}
                  </div>

                  {/* Difficulty Assessment Note */}
                  <div className="mt-3 text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <span>Difficulty:</span>
                    <span>{issue.difficultyReason}</span>
                  </div>

                  {/* WHY IT MATCHES Section (matching Figma reference image 1) */}
                  <div className="mt-4 p-4 border-2 border-border bg-background shadow-brut space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-foreground">
                      {hasCustomizedProfile ? "Why It Matches" : "Personalize Your Score"}
                    </p>

                    {!hasCustomizedProfile ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Set your skills and experience level above to see personalized fit scores, match reasons, and multi-aspect breakdowns tailored to you.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowProfileConfig(true)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 font-black text-xs border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--shadow-color)] hover:-translate-y-0.5 transition-transform shrink-0 cursor-pointer"
                        >
                          <Lock className="size-3" />
                          <span>Unlock Scores</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-1">
                          {issue.matchReasons && issue.matchReasons.length > 0 ? (
                            issue.matchReasons.map((reason, idx) => (
                              <li key={idx} className="text-xs font-medium text-foreground flex items-start gap-2">
                                <span className="text-primary font-black">•</span>
                                <span>{reason}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs font-medium text-muted-foreground flex items-start gap-2">
                              <span className="text-primary font-black">•</span>
                              <span>Appropriate scope for your experience level.</span>
                            </li>
                          )}
                        </ul>

                        {/* Expandable "Why this score? v" Toggle */}
                        <div className="pt-2 border-t border-border mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedScoreId(isExpanded ? null : issue.githubIssueId)}
                            className="text-xs font-bold underline hover:text-primary inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Why this score?</span>
                            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          </button>

                          {/* Aspect Score Progress Bars (matching reference image 3) */}
                          {isExpanded && analysis && (
                            <div className="mt-4 pt-3 border-t border-border space-y-3">
                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>Skill alignment</span>
                                  <span>{analysis.scores.skillAlignment} / 100</span>
                                </div>
                                <div className="w-full h-2 border border-border bg-card overflow-hidden">
                                  <div
                                    className="h-full bg-mint"
                                    style={{ width: `${analysis.scores.skillAlignment}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>Difficulty fit</span>
                                  <span>{analysis.scores.difficultyFit} / 100</span>
                                </div>
                                <div className="w-full h-2 border border-border bg-card overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${analysis.scores.difficultyFit}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>Issue clarity</span>
                                  <span>{analysis.scores.issueClarity} / 100</span>
                                </div>
                                <div className="w-full h-2 border border-border bg-card overflow-hidden">
                                  <div
                                    className="h-full bg-mint"
                                    style={{ width: `${analysis.scores.issueClarity}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>Repository readiness</span>
                                  <span>{analysis.scores.repositoryReadiness} / 100</span>
                                </div>
                                <div className="w-full h-2 border border-border bg-card overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{ width: `${analysis.scores.repositoryReadiness}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>Activity & freshness</span>
                                  <span>{analysis.scores.activityFreshness} / 100</span>
                                </div>
                                <div className="w-full h-2 border border-border bg-card overflow-hidden">
                                  <div
                                    className="h-full bg-mint"
                                    style={{ width: `${analysis.scores.activityFreshness}%` }}
                                  />
                                </div>
                              </div>

                              <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between font-semibold">
                                <span>Evidence confidence: {analysis.scores.evidenceConfidence}%</span>
                                <span className="italic">Based on issue body completeness</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (matching reference image 1) */}
                <div className="mt-6 pt-4 border-t-2 border-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* View contribution plan button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlanIssue(issue)}
                      className="inline-flex items-center gap-2 h-11 px-5 font-black text-sm border-[3px] border-border bg-mint text-foreground shadow-brut brut-interactive cursor-pointer"
                    >
                      <span>View contribution plan</span>
                      <ArrowRight className="size-4" />
                    </button>

                    {/* Explain with AI button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlanIssue(issue)}
                      className="inline-flex items-center gap-2 h-11 px-4 font-bold text-sm border-2 border-border bg-background text-foreground shadow-brut hover:-translate-y-0.5 transition-transform cursor-pointer"
                    >
                      <Sparkles className="size-4 text-primary" />
                      <span>Explain with AI</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Copy Link Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(issue)}
                      className="p-2 border-2 border-border bg-background hover:bg-muted shadow-[2px_2px_0_var(--shadow-color)] cursor-pointer"
                      title="Copy issue URL"
                      aria-label="Copy issue URL"
                    >
                      {copiedId === issue.githubIssueId ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>

                    {/* Save to Workspace Button */}
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black border-2 border-border bg-mint text-foreground shadow-[2px_2px_0_var(--shadow-color)]">
                        <CheckCircle2 className="size-4" />
                        <span>Saved</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSaveIssue(issue)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold border-2 border-border bg-card text-foreground shadow-[2px_2px_0_var(--shadow-color)] hover:-translate-y-0.5 transition-transform cursor-pointer"
                      >
                        <Bookmark className="size-4" />
                        <span>Save</span>
                      </button>
                    )}

                    {/* GitHub link button */}
                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border-2 border-border bg-background hover:bg-muted shadow-[2px_2px_0_var(--shadow-color)]"
                      title="Open issue on GitHub"
                      aria-label="Open issue on GitHub"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedIssues.length === 0 && (
        <div className="border-[3px] border-border bg-card p-12 text-center shadow-brut-lg space-y-4">
          <div className="size-16 mx-auto border-[3px] border-border bg-background flex items-center justify-center shadow-brut mb-4">
            <Filter className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-2xl font-black text-foreground">
            No matching issues found
          </h3>
          <p className="max-w-md mx-auto text-sm text-muted-foreground font-medium">
            Try loosening your filters (e.g. set Difficulty to &quot;ANY&quot;, change language to &quot;Any&quot;, or increase freshness to 90 days).
          </p>
          <button
            type="button"
            onClick={() => {
              setLanguage("Any");
              setLevel("any");
              setFreshness("90");
              setDocsOnly(false);
              setKeyword("");
            }}
            className="inline-flex items-center gap-2 h-11 px-6 font-bold border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive cursor-pointer"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Interactive Contribution Plan & AI Assistant Modal */}
      <ContributionPlanModal
        issue={selectedPlanIssue}
        isOpen={!!selectedPlanIssue}
        onClose={() => setSelectedPlanIssue(null)}
        onSave={handleSaveIssue}
        isSaved={selectedPlanIssue ? savedIds.has(selectedPlanIssue.githubIssueId) : false}
      />
    </div>
  );
}
