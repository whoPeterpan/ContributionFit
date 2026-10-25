import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Sparkles, ArrowRight } from 'lucide-react'
import type { IssueRecommendation } from '../lib/types'
import { scoreBand } from '../lib/types'
import { issueWarnings, timeAgo } from '../lib/util'
import { btn, ScoreRing, Tag } from './ui'

export function FactorList({ issue }: { issue: IssueRecommendation }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-faint">Fit score estimates suitability for you. It is not a prediction that a pull request will be accepted.</p>
      {issue.factors?.map((f) => (
        <div key={f.key}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink">{f.label}</span>
            <span className="font-mono text-dim">{f.score === null ? 'unknown' : f.score}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded bg-line"><div className="h-full rounded bg-lime/80" style={{ width: `${f.score ?? 0}%` }} /></div>
          <p className="mt-1 text-xs text-dim">{f.evidence}</p>
        </div>
      ))}
      {issue.confidence !== undefined && (
        <p className="border-t border-line pt-2 text-xs text-dim">
          <span className="font-medium text-ink">Evidence confidence: {Math.round(issue.confidence * 100)}%</span> – how much of the scoring input was actually available.
        </p>
      )}
    </div>
  )
}

export function IssueCard({ issue, saved, onToggleSave, onExplain }: { issue: IssueRecommendation; saved: boolean; onToggleSave: () => void; onExplain: () => void }) {
  const [open, setOpen] = useState(false)
  const band = scoreBand(issue.fitScore)
  const warns = issueWarnings(issue).filter((w) => w.level !== 'info')
  const diffTone = issue.difficulty === 'beginner' ? 'lime' : issue.difficulty === 'advanced' ? 'violet' : 'dim'
  const summary = issue.body.replace(/[#`*>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150)

  return (
    <article className="rise group rounded-xl border border-line bg-card p-4 transition hover:border-faint/60 sm:p-5">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-dim">
            <span className="truncate text-ink/80">{issue.repository}</span>{issue.repository.startsWith('acme-sample/') && <span className="rounded border border-warn/40 px-1 font-mono text-[10px] text-warn">SAMPLE</span>}
            <span>#{issue.number}</span>
            <span aria-hidden>·</span>
            <Tag tone={issue.state === 'open' ? 'lime' : 'danger'}>{issue.state}</Tag>
            <span>updated {timeAgo(issue.updatedAt)}</span>
          </div>
          <h3 className="mt-1.5 text-base font-semibold leading-snug text-ink">
            <Link to={`/issues/${encodeURIComponent(issue.id)}`} className="hover:text-lime">{issue.title}</Link>
          </h3>
          {summary && <p className="mt-1.5 line-clamp-2 text-sm text-dim">{summary}{issue.body.length > 150 ? '…' : ''}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreRing score={issue.fitScore} />
          <span className="max-w-[5.5rem] text-center text-[10px] leading-tight text-dim">{band.label}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {issue.language && <Tag><span className="h-1.5 w-1.5 rounded-full bg-lime" />{issue.language}</Tag>}
        {issue.difficulty && <Tag tone={diffTone}>{issue.difficulty}</Tag>}
        {issue.labels.slice(0, 4).map((l) => <Tag key={l}>{l}</Tag>)}
      </div>
      {issue.difficultyEvidence && <p className="mt-2 text-xs text-faint">Difficulty: {issue.difficultyEvidence}</p>}

      {warns.length > 0 && (
        <ul className="mt-3 space-y-1">
          {warns.map((w) => (
            <li key={w.text} className={`flex items-start gap-1.5 text-xs ${w.level === 'error' ? 'text-danger' : 'text-warn'}`}><AlertTriangle size={13} className="mt-0.5 shrink-0" />{w.text}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-lg bg-bg/60 p-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">Why it matches</p>
        <ul className="space-y-1">
          {issue.reasons.map((r) => <li key={r} className="flex gap-2 text-sm text-dim"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime" />{r}</li>)}
        </ul>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-xs text-dim hover:text-ink">
          Why this score? <ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="mt-3 border-t border-line pt-3"><FactorList issue={issue} /></div>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link to={`/issues/${encodeURIComponent(issue.id)}`} className={btn.primary}>View contribution plan <ArrowRight size={15} /></Link>
        <button onClick={onExplain} className={btn.ai}><Sparkles size={15} />Explain with AI</button>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save issue'} className={`rounded-lg p-2 transition hover:bg-card2 ${saved ? 'text-lime' : 'text-dim hover:text-ink'}`}>
            {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <a href={issue.url} target="_blank" rel="noopener noreferrer" aria-label="Open on GitHub (new tab)" className="rounded-lg p-2 text-dim transition hover:bg-card2 hover:text-ink"><ExternalLink size={18} /></a>
        </div>
      </div>
    </article>
  )
}

export function IssueCardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-card p-5" aria-hidden>
      <div className="flex gap-4"><div className="flex-1 space-y-2"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-5 w-4/5" /><div className="skeleton h-3 w-full" /></div><div className="skeleton h-14 w-14 rounded-full" /></div>
      <div className="mt-4 flex gap-2"><div className="skeleton h-5 w-16" /><div className="skeleton h-5 w-20" /><div className="skeleton h-5 w-14" /></div>
      <div className="skeleton mt-4 h-20 w-full" />
    </div>
  )
}
