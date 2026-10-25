import { FIXTURES } from './fixtures'
import { getGithubIssue, searchGithubIssues } from './github'
import { scoreIssue } from './scoring'
import { ApiError, type AiExplanation, type DeveloperProfile, type IssueRecommendation } from './types'

/** 'sample' uses local fictional fixtures; 'live' calls the backend. Defaults to sample in dev, live in prod builds. */
/** 'github' (default) reads public data straight from api.github.com; 'sample' uses fictional fixtures; 'live' calls the custom Express backend. */
export const DATA_MODE: 'sample' | 'github' | 'live' = (['sample', 'live'] as const).find((m) => m === import.meta.env.VITE_DATA_MODE) ?? 'github'

export const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000').replace(/\/$/, '')
const TIMEOUT_MS = 20000

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms)
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')) })
  })

async function http<T>(path: string, init: RequestInit & { signal?: AbortSignal } = {}): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS)
  init.signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...init.headers } })
    if (res.status === 429) throw new ApiError('rate_limit', 'GitHub or the API rate limit was reached. Try again in a few minutes.')
    if (res.status === 404) throw new ApiError('not_found', 'Not found.')
    if (!res.ok) throw new ApiError('server', `The server responded with ${res.status}.`)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (init.signal?.aborted) throw e
    if (ctrl.signal.aborted) throw new ApiError('timeout', 'The request timed out.')
    if (e instanceof SyntaxError) throw new ApiError('malformed', 'The server returned an unreadable response.')
    throw new ApiError('network', `Could not reach the backend at ${API_BASE_URL}.`)
  } finally { clearTimeout(timer) }
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const strArr = (v: unknown) => (Array.isArray(v) && v.every(isStr) ? v : null)

function parseIssue(raw: unknown): IssueRecommendation {
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object' || !isStr(r.id) || !isStr(r.title) || !isStr(r.repository) || !isStr(r.url) ||
      typeof r.number !== 'number' || typeof r.fitScore !== 'number' || !isStr(r.updatedAt)) {
    throw new ApiError('malformed', 'The server returned an issue in an unexpected format.')
  }
  return {
    ...(r as unknown as IssueRecommendation),
    body: isStr(r.body) ? r.body : '',
    state: isStr(r.state) ? r.state : 'unknown',
    labels: strArr(r.labels) ?? [],
    reasons: strArr(r.reasons) ?? [],
    prerequisites: strArr(r.prerequisites) ?? [],
    nextSteps: strArr(r.nextSteps) ?? [],
    fitScore: Math.max(0, Math.min(100, r.fitScore)),
  }
}

const splitId = (id: string) => id.split('~')

export interface SearchOutcome { issues: IssueRecommendation[]; fetchedAt?: number }

export async function searchIssues(profile: DeveloperProfile, query: string, signal?: AbortSignal, force = false, sample = false): Promise<SearchOutcome> {
  if (DATA_MODE === 'sample' || sample) {
    await delay(550, signal)
    return { issues: FIXTURES.map((f) => scoreIssue(f, profile)) }
  }
  if (DATA_MODE === 'github') return searchGithubIssues(profile, query, force, signal)
  const data = (await http<{ issues?: unknown }>('/api/search', { method: 'POST', body: JSON.stringify({ profile, query }), signal })) as { issues?: unknown }
  if (!data || !Array.isArray(data.issues)) throw new ApiError('malformed', 'The search response is missing an issues list.')
  return { issues: data.issues.map(parseIssue) }
}

export const isSampleId = (id: string) => id.startsWith('acme-sample~')

export async function getIssue(id: string, profile: DeveloperProfile, signal?: AbortSignal): Promise<IssueRecommendation> {
  if (DATA_MODE === 'sample' || isSampleId(id)) {
    await delay(350, signal)
    const f = FIXTURES.find((x) => x.id === id)
    if (!f) throw new ApiError('not_found', 'This sample issue does not exist.')
    return scoreIssue(f, profile)
  }
  const [owner, repo, number] = splitId(id)
  if (!owner || !repo || !/^\d+$/.test(number ?? '')) throw new ApiError('not_found', 'Invalid issue id.')
  if (DATA_MODE === 'github') return getGithubIssue(owner, repo, number, profile, signal)
  return parseIssue(await http(`/api/issues/${owner}/${repo}/${number}`, { signal }))
}

export async function explainIssue(issue: IssueRecommendation, profile: DeveloperProfile, signal?: AbortSignal): Promise<AiExplanation> {
  if (DATA_MODE !== 'live') {
    await delay(DATA_MODE === 'sample' ? 1400 : 500, signal)
    return {
      generatedBy: 'sample',
      summary: `This issue asks for: "${issue.title}". The description is summarized from the issue text below; it has not been verified against the repository.`,
      whyItMatches: issue.reasons,
      skillsRequired: issue.skills ?? (issue.language ? [issue.language] : []),
      missingPrerequisites: issue.prerequisites,
      filesToInvestigate: [...issue.body.matchAll(/`((?:[\w.-]+\/)+[\w.-]+\.\w+)`/g)].map((m) => ({ path: m[1], evidence: 'Mentioned in the issue description.' })),
      plan: issue.nextSteps,
      maintainerQuestions: ['Is this issue still available, and is anyone already working on it?', 'Is there a preferred approach or a related PR I should look at first?'],
      sources: [{ label: `Issue #${issue.number}`, url: issue.url }],
    }
  }
  const [owner, repo, number] = splitId(issue.id)
  const d = (await http(`/api/issues/${owner}/${repo}/${number}/explain`, { method: 'POST', body: JSON.stringify({ profile }), signal })) as Partial<AiExplanation> | null
  if (!d || !isStr(d.summary) || !Array.isArray(d.plan)) throw new ApiError('malformed', 'The AI response was incomplete.')
  return {
    generatedBy: 'ai', summary: d.summary, plan: d.plan,
    whyItMatches: d.whyItMatches ?? [], skillsRequired: d.skillsRequired ?? [], missingPrerequisites: d.missingPrerequisites ?? [],
    filesToInvestigate: d.filesToInvestigate ?? [], maintainerQuestions: d.maintainerQuestions ?? [], sources: d.sources ?? [],
  }
}

export const checkHealth = async () => { await http('/api/health') }
