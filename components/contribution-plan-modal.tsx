"use client";

/**
 * components/contribution-plan-modal.tsx — AI Contribution Assistant & Interactive Contribution Plan.
 *
 * Implements the modal / drawer view from the reference design:
 * - Plain English explanation of the issue
 * - Why it matches you
 * - Skills required vs possible skill gaps to close first
 * - Code areas to investigate (from issue evidence)
 * - Interactive 7-step contribution plan checklist
 * - Smart questions to ask the maintainer
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Code2,
  HelpCircle,
  FolderGit2,
  ListChecks,
  AlertCircle,
  Bookmark,
} from "lucide-react";
import { type GitHubIssueResult } from "@/lib/github";

interface Props {
  issue: GitHubIssueResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (issue: GitHubIssueResult) => void;
  isSaved?: boolean;
}

export function ContributionPlanModal({
  issue,
  isOpen,
  onClose,
  onSave,
  isSaved = false,
}: Props) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  if (!issue) return null;

  const analysis = issue.analysis;

  function toggleStep(id: number) {
    const next = new Set(completedSteps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompletedSteps(next);
  }

  const stepsCount = analysis?.planSteps.length || 7;
  const completedCount = completedSteps.size;
  const progressPercent = Math.round((completedCount / stepsCount) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-[3px] border-border bg-card text-foreground p-6 sm:p-8 shadow-brut-lg">
        <DialogHeader className="border-b-2 border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {issue.repoFullName} #{issue.number}
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-black border-2 border-border bg-mint text-foreground shadow-[2px_2px_0_var(--shadow-color)]">
                <Sparkles className="size-3" />
                <span>{issue.matchScore || 85}% Fit Score</span>
              </span>
              <span className="text-xs font-bold uppercase px-2 py-0.5 border border-border bg-background">
                {issue.difficulty}
              </span>
            </div>
          </div>
          <DialogTitle className="font-heading text-xl sm:text-2xl font-black text-foreground text-left">
            {issue.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* AI Banner / Status Note */}
          <div className="p-3 border-2 border-border bg-primary/10 flex items-center justify-between gap-3 text-xs font-bold shadow-brut">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>AI Contribution Assistant: Context-analyzed plan & maintainer checklist</span>
            </div>
            <a
              href={issue.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline hover:text-primary shrink-0"
            >
              <span>View GitHub</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          {/* In Plain English Summary */}
          <div>
            <h4 className="font-heading text-sm font-black uppercase text-foreground mb-1.5 flex items-center gap-2">
              <span>In Plain English</span>
            </h4>
            <p className="text-sm font-medium text-foreground bg-background p-3.5 border-2 border-border shadow-brut leading-relaxed">
              {analysis?.plainEnglishSummary || issue.bodyPreview}
            </p>
          </div>

          {/* Why It Matches You */}
          {analysis?.whyItMatches && analysis.whyItMatches.length > 0 && (
            <div>
              <h4 className="font-heading text-sm font-black uppercase text-foreground mb-1.5">
                Why It Matches You
              </h4>
              <ul className="space-y-1.5 p-3.5 border-2 border-border bg-mint/20 shadow-brut">
                {analysis.whyItMatches.map((reason, idx) => (
                  <li key={idx} className="text-xs font-bold flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-foreground shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills Required vs Gaps to Close First */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 border-2 border-border bg-background shadow-brut">
              <h5 className="font-heading text-xs font-black uppercase text-foreground mb-2 flex items-center gap-1.5">
                <Code2 className="size-3.5" />
                <span>Skills Required</span>
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {analysis?.skillsRequired.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 text-xs font-bold border border-border bg-card text-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 border-2 border-border bg-background shadow-brut">
              <h5 className="font-heading text-xs font-black uppercase text-foreground mb-2 flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-primary" />
                <span>Possible Gaps to Close First</span>
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {analysis?.possibleGaps && analysis.possibleGaps.length > 0 ? (
                  analysis.possibleGaps.map((gap) => (
                    <span
                      key={gap}
                      className="px-2 py-0.5 text-xs font-bold border border-border bg-primary/20 text-foreground"
                    >
                      {gap}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    No major skill gaps detected! You are ready to start.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Code Areas to Investigate */}
          {analysis?.codeAreas && analysis.codeAreas.length > 0 && (
            <div>
              <h4 className="font-heading text-sm font-black uppercase text-foreground mb-1.5 flex items-center gap-1.5">
                <FolderGit2 className="size-4" />
                <span>Code Areas to Investigate (From Issue Evidence)</span>
              </h4>
              <div className="flex flex-wrap gap-2 p-3 border-2 border-border bg-background shadow-brut font-mono text-xs font-bold">
                {analysis.codeAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 border border-border bg-card text-foreground"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interactive 7-Step Contribution Plan Checklist */}
          <div className="border-2 border-border bg-background p-4 sm:p-5 shadow-brut space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="size-5 text-primary" />
                <h4 className="font-heading text-base font-black text-foreground">
                  Step-by-Step Contribution Plan
                </h4>
              </div>
              <span className="text-xs font-black px-2.5 py-1 border border-border bg-card shadow-[2px_2px_0_var(--shadow-color)]">
                {completedCount} / {stepsCount} Done ({progressPercent}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 border-2 border-border bg-card overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="space-y-2.5 pt-2">
              {analysis?.planSteps.map((step) => {
                const done = completedSteps.has(step.id);
                return (
                  <label
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    className={`flex items-start gap-3 p-3 border-2 border-border cursor-pointer transition-colors ${
                      done ? "bg-mint/30 border-foreground" : "bg-card hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => {}}
                      className="size-4 mt-0.5 border-2 border-border accent-primary cursor-pointer shrink-0"
                    />
                    <div>
                      <p className={`text-sm font-black ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {step.id}. {step.title}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Questions for the Maintainer */}
          {analysis?.questionsForMaintainer && analysis.questionsForMaintainer.length > 0 && (
            <div>
              <h4 className="font-heading text-sm font-black uppercase text-foreground mb-1.5 flex items-center gap-1.5">
                <HelpCircle className="size-4 text-primary" />
                <span>Suggested Questions for the Maintainer</span>
              </h4>
              <ul className="space-y-2 p-3.5 border-2 border-border bg-card shadow-brut text-xs font-bold">
                {analysis.questionsForMaintainer.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary font-black">•</span>
                    <span>&quot;{q}&quot;</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t-2 border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onSave && (
                <button
                  type="button"
                  onClick={() => onSave(issue)}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 px-5 font-black text-sm border-2 border-border shadow-brut brut-interactive cursor-pointer ${
                    isSaved
                      ? "bg-mint text-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <Bookmark className="size-4" />
                  <span>{isSaved ? "Saved to Workspace ✓" : "Save to Workspace"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 px-6 font-black text-sm border-[3px] border-border bg-primary text-primary-foreground shadow-brut brut-interactive"
              >
                <span>Open on GitHub</span>
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
