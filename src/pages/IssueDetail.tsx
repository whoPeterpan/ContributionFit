import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertTriangle, Bookmark, BookmarkCheck, ChevronRight, ExternalLink, Info, RefreshCw, Sparkles, Square, SquareCheck } from 'lucide-react'
import { getIssue } from '../lib/api'
import { useChecklist, useProfile } from '../lib/storage'
import { useSaved } from '../lib/saved'
import { ApiError, scoreBand, type IssueRecommendation } from '../lib/types'
import { computeFactors } from '../lib/scoring'
import { issueWarnings, timeAgo } from '../lib/util'
import { FactorList } from '../components/IssueCard'
import { ExplainDialog } from '../components/ExplainDialog'
import { Markdown } from '../components/Markdown'
import { btn, LinkButton, Notice, ScoreRing, Skeleton, Tag } from '../components/ui'

const STEPS = [
  ['Read the full issue and acceptance criteria', 'Including comments and any linked issues or PRs.'],
  ['Read repository contribution instructions', 'CONTRIBUTING.md, code of conduct, and PR template.'],
  ['Set up the development environment', 'Fork, clone, install dependencies, and confirm the project builds.'],
  ['Locate relevant files', 'Search the codebase for the behavior described in the issue.'],
  ['Identify a minimal implementation approach', 'Prefer the smallest change; confirm with maintainers if unsure.'],
  ['Run the relevant tests', 'Add or update tests that cover your change.'],
  ['Prepare a focused pull request', 'Reference the issue and describe what you verified.'],
]

export default function IssueDetail() {
  const { id = '' } = useParams()
  const issueId = decodeURIComponent(id)
  const { profile } = useProfile()
  const saved = useSaved()
  const checklist = useChecklist(issueId)
  const [issue, setIssue] = useState<IssueRecommendation | null>(null)
  const [err, setErr] = useState<ApiError | string | null>(null)
  const [tick, setTick] = useState(0)
  const [explain, setExplain] = useState(false)
  const key = JSON.stringify(profile)

  useEffect(() => {
    const c = new AbortController()
    setErr(null)
    getIssue(issueId, JSON.parse(key), c.signal).then(setIssue).catch((e) => { if (!c.signal.aborted) setErr(e instanceof ApiError ? e : 'Could not load this issue.') })
    return () => c.abort()
  }, [issueId, key, tick])

  const crumb = (
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-dim">
      <Link to="/discover" className="hover:text-ink">Discover</Link><ChevronRight size={14} /><span className="truncate text-ink">{issue?.repository ?? 'Issue'}</span>
    </nav>
  )

  if (err) {
    const nf = err instanceof ApiError && err.kind === 'not_found'
    return (<div>{crumb}<Notice tone="error">{typeof err === 'string' ? err : err.message}</Notice>
      <div className="mt-4 flex gap-2">{!nf && <button className={btn.ghost} onClick={() => setTick(tick + 1)}><RefreshCw size={14} />Retry</button>}<LinkButton to="/discover" className={btn.ghost}>Back to Discover</LinkButton></div></div>)
  }
  if (!issue || issue.id !== issueId) {
    return <div>{crumb}<div className="space-y-3" aria-busy><Skeleton className="h-4 w-1/3" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-64 w-full" /></div></div>
  }

  const withFactors = { ...issue, factors: issue.factors ?? computeFactors(issue, profile) }
  const warns = issueWarnings(issue)
  const band = scoreBand(issue.fitScore)
  const done = STEPS.filter((_, i) => checklist.checked[i]).length
  const isSaved = saved.isSaved(issue.id)

  return (
    <div>
      {crumb}
      {issue.repository.startsWith('acme-sample/') && <div role="status" className="mb-4 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn"><span className="font-mono font-semibold">SAMPLE DATA</span> · This is a fictional fixture, not a real GitHub issue.</div>}
      <header>
        <p className="font-mono text-sm text-dim">{issue.repository} <span className="text-faint">#{issue.number}</span></p>
        <h1 className="mt-1.5 max-w-3xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{issue.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tag tone={issue.state === 'open' ? 'lime' : 'danger'}>{issue.state}</Tag>
          {issue.language && <Tag>{issue.language}</Tag>}
          <span className="text-xs text-dim">updated {timeAgo(issue.updatedAt)}{issue.createdAt && ` · opened ${timeAgo(issue.createdAt)}`}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => saved.toggle(issue)} aria-pressed={isSaved} className={btn.ghost}>{isSaved ? <BookmarkCheck size={15} className="text-lime" /> : <Bookmark size={15} />}{isSaved ? 'Saved' : 'Save'}</button>
            <a href={issue.url} target="_blank" rel="noopener noreferrer" className={btn.ghost}>View on GitHub <ExternalLink size={14} /></a>
          </div>
        </div>
      </header>

      {warns.length > 0 && (
        <div className="mt-5 space-y-2">
          {warns.map((w) => (
            <Notice key={w.text} tone={w.level}><span className="flex items-start gap-2">{w.level === 'info' ? <Info size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}{w.text}</span></Notice>
          ))}
          {issue.state === 'open' && <p className="text-xs text-faint">An open state alone does not mean the issue is available. Confirm with maintainers before starting.</p>}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-card p-5" aria-labelledby="desc">
            <h2 id="desc" className="mb-3 text-sm font-semibold">Issue description</h2>
            {issue.body.trim() ? <Markdown source={issue.body} /> : <p className="text-sm text-dim">No description provided.</p>}
            {issue.labels.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">{issue.labels.map((l) => <Tag key={l}>{l}</Tag>)}</div>}
          </section>

          <section className="rounded-xl border border-line bg-card p-5" aria-labelledby="plan">
            <div className="mb-1 flex items-center justify-between">
              <h2 id="plan" className="text-sm font-semibold">Contribution plan</h2>
              <span className="font-mono text-xs text-dim">{done}/{STEPS.length}</span>
            </div>
            <div className="mb-4 h-1 overflow-hidden rounded bg-line"><div className="h-full bg-lime transition-all" style={{ width: `${(done / STEPS.length) * 100}%` }} /></div>
            <ol className="space-y-1">
              {STEPS.map(([t, d], i) => {
                const on = !!checklist.checked[i]
                return (
                  <li key={t}>
                    <button onClick={() => checklist.toggle(i)} role="checkbox" aria-checked={on} className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-card2">
                      {on ? <SquareCheck size={18} className="mt-0.5 shrink-0 text-lime" /> : <Square size={18} className="mt-0.5 shrink-0 text-faint" />}
                      <span><span className={`block text-sm ${on ? 'text-dim line-through' : 'text-ink'}`}><span className="mr-1.5 font-mono text-xs text-faint">{i + 1}</span>{t}</span><span className="block text-xs text-dim">{d}</span></span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 text-xs text-faint">This is general guidance, not a promise the issue can be solved without further investigation.</p>
            {issue.prerequisites.length > 0 && <p className="mt-3 border-t border-line pt-3 text-xs text-dim"><span className="font-medium text-ink">May need to learn first:</span> {issue.prerequisites.join(', ')}</p>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start" aria-label="Readiness">
          <section className="rounded-xl border border-line bg-card p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={issue.fitScore} size={72} />
              <div><p className="font-semibold">{band.label}</p><p className="text-xs text-dim">Fit score for your profile</p></div>
            </div>
            <div className="mt-5 border-t border-line pt-4"><FactorList issue={withFactors} /></div>
          </section>
          <button onClick={() => setExplain(true)} className={`${btn.ai} w-full`}><Sparkles size={15} />Explain with AI</button>
        </aside>
      </div>
      <ExplainDialog issue={explain ? issue : null} profile={profile} onClose={() => setExplain(false)} />
    </div>
  )
}
