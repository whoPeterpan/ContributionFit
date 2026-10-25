export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface DeveloperProfile {
  skills: string[]
  experienceLevel: ExperienceLevel
  preferredLanguages: string[]
  preferredTaskTypes: string[]
  preferredDifficulty: string[]
  topics?: string[]
  timeCommitment?: string
}

/** Repository signals. Any field may be undefined = unknown (never assume false). */
export interface RepoSignals {
  hasContributing?: boolean
  lastPushAt?: string
  openIssues?: number
  stars?: number
}

export interface FactorScore {
  key: 'skills' | 'difficulty' | 'clarity' | 'repo' | 'freshness'
  label: string
  /** 0-100, or null when evidence is unavailable */
  score: number | null
  evidence: string
}

export interface IssueRecommendation {
  id: string
  title: string
  repository: string
  url: string
  number: number
  body: string
  state: string
  labels: string[]
  language?: string
  updatedAt: string
  createdAt?: string
  assigned?: boolean
  linkedPullRequest?: boolean
  fitScore: number
  confidence?: number
  reasons: string[]
  prerequisites: string[]
  nextSteps: string[]
  // Optional extensions (backend may omit)
  githubId?: number
  difficulty?: Difficulty
  difficultyEvidence?: string
  skills?: string[]
  repoSignals?: RepoSignals
  factors?: FactorScore[]
}

export interface SearchFilters {
  query: string
}

export interface AiExplanation {
  summary: string
  whyItMatches: string[]
  skillsRequired: string[]
  missingPrerequisites: string[]
  filesToInvestigate: { path: string; evidence: string }[]
  plan: string[]
  maintainerQuestions: string[]
  sources: { label: string; url: string }[]
  generatedBy: 'ai' | 'sample'
}

export class ApiError extends Error {
  kind: 'network' | 'timeout' | 'rate_limit' | 'server' | 'malformed' | 'not_found'
  constructor(kind: ApiError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

export const scoreBand = (s: number) =>
  s >= 80
    ? { label: 'Strong match', tone: 'lime' as const }
    : s >= 60
      ? { label: 'Possible match', tone: 'lime' as const }
      : s >= 40
        ? { label: 'Stretch opportunity', tone: 'warn' as const }
        : { label: 'Low match', tone: 'dim' as const }
