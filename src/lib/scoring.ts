import type { DeveloperProfile, FactorScore, IssueRecommendation } from './types'

const norm = (s: string) => s.trim().toLowerCase()
const daysSince = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : undefined)
const LEVEL = { beginner: 0, intermediate: 1, advanced: 2 } as const

export function computeFactors(i: IssueRecommendation, p: DeveloperProfile): FactorScore[] {
  const mine = new Set([...p.skills, ...p.preferredLanguages, ...(p.topics ?? [])].map(norm))
  const wanted = [...(i.skills ?? []), ...(i.language ? [i.language] : [])]
  const hits = wanted.filter((s) => mine.has(norm(s)))

  const skills: FactorScore = !mine.size
    ? { key: 'skills', label: 'Skill alignment', score: null, evidence: 'Add skills to your profile to measure alignment.' }
    : !wanted.length
      ? { key: 'skills', label: 'Skill alignment', score: null, evidence: 'No skill or language metadata is available for this issue.' }
      : {
          key: 'skills', label: 'Skill alignment',
          score: Math.round((hits.length / wanted.length) * 100),
          evidence: hits.length ? `Matches ${hits.join(', ')} from your profile (${hits.length} of ${wanted.length} signals).` : `None of ${wanted.join(', ')} appear in your profile.`,
        }

  let difficulty: FactorScore
  if (!i.difficulty) difficulty = { key: 'difficulty', label: 'Difficulty fit', score: null, evidence: 'Difficulty could not be estimated.' }
  else {
    const gap = LEVEL[i.difficulty] - LEVEL[p.experienceLevel]
    const preferred = p.preferredDifficulty.map(norm).includes(i.difficulty)
    const base = gap === 0 ? 92 : gap === -1 ? 72 : gap === 1 ? 55 : gap < -1 ? 55 : 25
    difficulty = {
      key: 'difficulty', label: 'Difficulty fit', score: Math.min(100, base + (preferred ? 8 : 0)),
      evidence: `Estimated ${i.difficulty} vs your ${p.experienceLevel} level${preferred ? ' (in your preferred difficulty)' : ''}. ${i.difficultyEvidence ?? ''}`.trim(),
    }
  }

  const body = i.body ?? ''
  const signals = [/expected|acceptance|requirements/i.test(body), /steps to reproduce|repro/i.test(body), /```|`[^`]+`/.test(body), body.length > 200, i.labels.some((l) => /good first issue|help wanted/i.test(l))]
  const clarity: FactorScore = body.trim().length < 20
    ? { key: 'clarity', label: 'Issue clarity', score: null, evidence: 'The issue has little or no description.' }
    : { key: 'clarity', label: 'Issue clarity', score: 35 + signals.filter(Boolean).length * 13, evidence: `${signals.filter(Boolean).length} of 5 clarity signals found (expected behavior, reproduction, code references, detail, contributor-friendly label).` }

  const r = i.repoSignals
  const repo: FactorScore = !r || r.hasContributing === undefined
    ? { key: 'repo', label: 'Repository readiness', score: null, evidence: 'Contribution guidelines status is unknown. Check the repository directly.' }
    : { key: 'repo', label: 'Repository readiness', score: r.hasContributing ? 85 : 40, evidence: r.hasContributing ? 'A CONTRIBUTING guide was detected.' : 'No CONTRIBUTING guide was detected; expect to ask maintainers.' }

  const d = daysSince(i.updatedAt)
  const freshness: FactorScore = d === undefined
    ? { key: 'freshness', label: 'Activity & freshness', score: null, evidence: 'Last update time unavailable.' }
    : { key: 'freshness', label: 'Activity & freshness', score: d < 7 ? 95 : d < 30 ? 75 : d < 90 ? 45 : 20, evidence: `Issue last updated ${Math.floor(d)} day(s) ago.` }

  return [skills, difficulty, clarity, repo, freshness]
}

const W = { skills: 0.35, difficulty: 0.25, clarity: 0.15, repo: 0.1, freshness: 0.15 }

/** Sample-mode only. Live scoring is the backend's responsibility. */
export function scoreIssue(base: Omit<IssueRecommendation, 'fitScore' | 'confidence' | 'reasons' | 'prerequisites' | 'nextSteps'>, p: DeveloperProfile): IssueRecommendation {
  const draft = { ...base, fitScore: 0, reasons: [], prerequisites: [], nextSteps: [] } as IssueRecommendation
  const factors = computeFactors(draft, p)
  const known = factors.filter((f) => f.score !== null)
  const wsum = known.reduce((a, f) => a + W[f.key], 0) || 1
  let fit = Math.round(known.reduce((a, f) => a + (f.score as number) * W[f.key], 0) / wsum)
  if (base.state !== 'open') fit = Math.min(fit, 30)
  if (base.assigned) fit = Math.max(0, fit - 15)
  if (base.linkedPullRequest) fit = Math.max(0, fit - 10)
  const confidence = Math.round((known.reduce((a, f) => a + W[f.key], 0)) * 100) / 100

  const reasons: string[] = []
  const sk = factors[0], df = factors[1], cl = factors[2]
  if (sk.score !== null && sk.score > 0) reasons.push(sk.evidence)
  if (df.score !== null && df.score >= 70) reasons.push(`Difficulty looks appropriate for ${p.experienceLevel} level.`)
  if (cl.score !== null && cl.score >= 70) reasons.push('The description states expected behavior clearly.')
  if (!reasons.length) reasons.push('Limited overlap with your current profile; treat as a stretch.')

  const prerequisites = (base.skills ?? []).filter((s) => ![...p.skills, ...p.preferredLanguages].map(norm).includes(norm(s)))
  const nextSteps = ['Read the full issue and any linked discussion.', 'Read CONTRIBUTING.md and comment to confirm the issue is still available.', 'Reproduce or locate the relevant code before changing anything.']
  return { ...draft, fitScore: fit, confidence, reasons: reasons.slice(0, 3), prerequisites, nextSteps, factors }
}
