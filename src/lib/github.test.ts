import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_PROFILE } from './storage'
import { buildQuery, searchGithubIssues } from './github'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) })
afterEach(() => { vi.restoreAllMocks(); store.clear() })

const hdr = (o: Record<string, string> = {}) => new Headers({ 'x-ratelimit-remaining': '5', 'x-ratelimit-limit': '10', ...o })

describe('GitHub service (mocked fetch, not a live test)', () => {
  it('builds a query that excludes PRs, assigned and archived', () => {
    const q = buildQuery(EMPTY_PROFILE, 'retry', 'TypeScript')
    expect(q).toContain('is:issue'); expect(q).toContain('no:assignee'); expect(q).toContain('language:TypeScript')
  })
  it('drops pull requests from results', async () => {
    const item = (id: number, pr?: object) => ({ id, number: id, title: `t${id}`, body: '', state: 'open', html_url: 'u', repository_url: 'https://api.github.com/repos/o/r', labels: [], created_at: '2026-01-01', updated_at: '2026-01-01', ...(pr ? { pull_request: pr } : {}) })
    vi.stubGlobal('fetch', vi.fn(async (u: string) => u.includes('/search/issues')
      ? new Response(JSON.stringify({ items: [item(1), item(2, { url: 'x' })] }), { headers: hdr() })
      : new Response(JSON.stringify({ full_name: 'o/r', language: 'Go', stargazers_count: 1, forks_count: 0, open_issues_count: 1, html_url: 'u', default_branch: 'main', pushed_at: '2026-01-01', updated_at: '2026-01-01', archived: false }), { headers: hdr() })))
    const r = await searchGithubIssues(EMPTY_PROFILE, '', true)
    expect(r.issues.map((i) => i.number)).toEqual([1])
  })
  it('reports rate limiting honestly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403, headers: hdr({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '9999999999' }) })))
    await expect(searchGithubIssues(EMPTY_PROFILE, 'x', true)).rejects.toMatchObject({ kind: 'rate_limit' })
  })
})
