import { ApiError, type DeveloperProfile, type IssueRecommendation } from './types'
import { scoreIssue } from './scoring'

const GH = 'https://api.github.com'
const ISSUE_TTL = 10 * 60 * 1000
const REPO_TTL = 60 * 60 * 1000
const MAX_REPO_LOOKUPS = 12

export interface RateInfo { remaining: number | null; limit: number | null; resetAt: number | null; resource: string }
export const rate: { search?: RateInfo; core?: RateInfo } = {}

interface GhRepo {
  full_name: string; description: string | null; language: string | null; topics?: string[]; stargazers_count: number; forks_count: number
  open_issues_count: number; html_url: string; default_branch: string; pushed_at: string; updated_at: string; archived: boolean
}
interface GhIssue {
  id: number; number: number; title: string; body: string | null; state: string; html_url: string; repository_url: string
  labels: (string | { name?: string })[]; assignees?: unknown[]; assignee?: unknown; created_at: string; updated_at: string; pull_request?: unknown
}

type Cached<T> = { t: number; data: T }
const cacheGet = <T,>(k: string, ttl: number): Cached<T> | null => {
  try { const c = JSON.parse(localStorage.getItem(`cf.gh.${k}`) ?? 'null') as Cached<T> | null; return c && Date.now() - c.t < ttl ? c : null } catch { return null }
}
const cacheSet = <T,>(k: string, data: T) => { try { localStorage.setItem(`cf.gh.${k}`, JSON.stringify({ t: Date.now(), data })) } catch { /* quota */ } }

function readRate(res: Response, resource: 'search' | 'core') {
  const n = (h: string) => { const v = res.headers.get(h); return v === null ? null : Number(v) }
  rate[resource] = { remaining: n('x-ratelimit-remaining'), limit: n('x-ratelimit-limit'), resetAt: n('x-ratelimit-reset') ? (n('x-ratelimit-reset') as number) * 1000 : null, resource }
}

async function gh<T>(path: string, resource: 'search' | 'core', signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${GH}${path}`, { signal, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new ApiError('network', 'Could not reach api.github.com. Check your connection and try again.')
  }
  readRate(res, resource)
  if (res.status === 403 || res.status === 429) {
    const r = rate[resource]
    if (r?.remaining === 0 || res.status === 429) {
      const when = r?.resetAt ? ` Resets around ${new Date(r.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : ''
      throw new ApiError('rate_limit', `GitHub’s anonymous rate limit was reached.${when} Wait a few minutes and try again.`)
    }
    throw new ApiError('server', 'GitHub refused this request (403).')
  }
  if (res.status === 404) throw new ApiError('not_found', 'GitHub could not find that issue or repository.')
  if (res.status === 422) throw new ApiError('malformed', 'GitHub rejected the search query. Try simpler search terms.')
  if (!res.ok) throw new ApiError('server', `GitHub responded with ${res.status}.`)
  try { return (await res.json()) as T } catch { throw new ApiError('malformed', 'GitHub returned an unreadable response.') }
}

async function cached<T>(key: string, ttl: number, force: boolean, load: () => Promise<T>): Promise<{ data: T; fetchedAt: number }> {
  if (!force) { const c = cacheGet<T>(key, ttl); if (c) return { data: c.data, fetchedAt: c.t } }
  const data = await load()
  cacheSet(key, data)
  return { data, fetchedAt: Date.now() }
}

export const fetchRepo = (full: string, force: boolean, signal?: AbortSignal) =>
  cached<GhRepo>(`repo.${full}`, REPO_TTL, force, () => gh<GhRepo>(`/repos/${full}`, 'core', signal))

const labelNames = (l: GhIssue['labels']) => l.map((x) => (typeof x === 'string' ? x : x.name ?? '')).filter(Boolean)

function inferDifficulty(labels: string[]): { difficulty?: IssueRecommendation['difficulty']; evidence?: string } {
  const l = labels.map((x) => x.toLowerCase())
  const hit = l.find((x) => /good first issue|beginner|easy|starter|first-timers?/.test(x))
  if (hit) return { difficulty: 'beginner', evidence: `Inferred from the "${labels[l.indexOf(hit)]}" label.` }
  const adv = l.find((x) => /advanced|hard|complex|expert/.test(x))
  if (adv) return { difficulty: 'advanced', evidence: `Inferred from the "${labels[l.indexOf(adv)]}" label.` }
  const mid = l.find((x) => /intermediate|medium/.test(x))
  if (mid) return { difficulty: 'intermediate', evidence: `Inferred from the "${labels[l.indexOf(mid)]}" label.` }
  return {}
}

function toBase(i: GhIssue, repo: GhRepo | undefined, full: string) {
  const labels = labelNames(i.labels)
  const d = inferDifficulty(labels)
  const skills = [...new Set([repo?.language, ...(repo?.topics ?? []).slice(0, 4)].filter(Boolean) as string[])]
  return {
    id: `${full.replace('/', '~')}~${i.number}`, githubId: i.id, title: i.title, repository: full, url: i.html_url, number: i.number, body: i.body ?? '',
    state: i.state, labels, language: repo?.language ?? undefined, updatedAt: i.updated_at, createdAt: i.created_at,
    assigned: (i.assignees?.length ?? (i.assignee ? 1 : 0)) > 0, // assignee data is part of the issue payload, so this is known
    difficulty: d.difficulty, difficultyEvidence: d.evidence, skills,
    repoSignals: repo ? { lastPushAt: repo.pushed_at, openIssues: repo.open_issues_count, stars: repo.stargazers_count } : undefined,
  }
}

export function buildQuery(profile: DeveloperProfile, text: string, language?: string) {
  const parts = ['is:issue', 'is:open', 'archived:false', 'no:assignee']
  if (language) parts.push(`language:${/\s|\+|#/.test(language) ? `"${language}"` : language}`)
  const wantsEasy = profile.experienceLevel === 'beginner' || profile.preferredDifficulty.includes('beginner')
  parts.push(wantsEasy ? 'label:"good first issue"' : 'label:"help wanted"')
  if (text) parts.push(text.replace(/[^\w\s.#+-]/g, ' ').trim())
  return parts.join(' ')
}

export interface SearchResult { issues: IssueRecommendation[]; fetchedAt: number; fromCache: boolean }

export async function searchGithubIssues(profile: DeveloperProfile, text: string, force: boolean, signal?: AbortSignal): Promise<SearchResult> {
  const langs = profile.preferredLanguages.slice(0, 2)
  const queries = (langs.length ? langs : [undefined]).map((l) => buildQuery(profile, text, l))
  const results = await Promise.all(queries.map((q) =>
    cached<{ items: GhIssue[] }>(`search.${q}`, ISSUE_TTL, force, () => gh(`/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=30`, 'search', signal))))
  const seen = new Set<number>()
  // GitHub's issue search also returns pull requests; drop them using the pull_request field.
  const items = results.flatMap((r) => r.data.items ?? []).filter((i) => !i.pull_request && !seen.has(i.id) && (seen.add(i.id), true))
  const fullOf = (i: GhIssue) => i.repository_url.replace(/^.*\/repos\//, '')
  const repos = [...new Set(items.map(fullOf))].slice(0, MAX_REPO_LOOKUPS)
  const repoMap = new Map<string, GhRepo>()
  await Promise.all(repos.map(async (r) => { try { repoMap.set(r, (await fetchRepo(r, false, signal)).data) } catch (e) { if (signal?.aborted) throw e /* otherwise leave repo metadata unknown */ } }))
  const issues = items.map((i) => scoreIssue(toBase(i, repoMap.get(fullOf(i)), fullOf(i)), profile))
  const fetchedAt = Math.min(...results.map((r) => r.fetchedAt))
  return { issues, fetchedAt, fromCache: !force && Date.now() - fetchedAt > 2000 }
}

export async function getGithubIssue(owner: string, repo: string, number: string, profile: DeveloperProfile, signal?: AbortSignal): Promise<IssueRecommendation> {
  const full = `${owner}/${repo}`
  const issue = (await cached<GhIssue>(`issue.${full}.${number}`, ISSUE_TTL, false, () => gh<GhIssue>(`/repos/${full}/issues/${number}`, 'core', signal))).data
  if (issue.pull_request) throw new ApiError('not_found', 'That number is a pull request, not an issue.')
  let meta: GhRepo | undefined
  try { meta = (await fetchRepo(full, false, signal)).data } catch (e) { if (signal?.aborted) throw e }
  return scoreIssue(toBase({ ...issue, repository_url: `${GH}/repos/${full}` }, meta, full), profile)
}
