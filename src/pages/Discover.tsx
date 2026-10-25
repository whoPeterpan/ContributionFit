import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RefreshCw, SearchX, SlidersHorizontal, X, AlertCircle, UserPlus, Pencil } from 'lucide-react'
import { useProfile } from '../lib/storage'
import { useSaved } from '../lib/saved'
import { DATA_MODE } from '../lib/api'
import { rate } from '../lib/github'
import { useDebounced, useIssues } from '../lib/useIssues'
import type { IssueRecommendation } from '../lib/types'
import { IssueCard, IssueCardSkeleton } from '../components/IssueCard'
import { ExplainDialog } from '../components/ExplainDialog'
import { btn, EmptyState, Notice, SearchBox } from '../components/ui'

interface Filters { language: string; difficulty: string; label: string; activity: string; assignment: string; minScore: number }
const NO_FILTERS: Filters = { language: '', difficulty: '', label: '', activity: '', assignment: '', minScore: 0 }
const PAGE = 10
type Sort = 'match' | 'updated' | 'created'

const ACTIVITY: Record<string, { l: string; days: number }> = { '7': { l: 'Updated in last 7 days', days: 7 }, '30': { l: 'Updated in last 30 days', days: 30 }, '90': { l: 'Updated in last 90 days', days: 90 } }
const ASSIGN: Record<string, string> = { unassigned: 'Not assigned (confirmed)', exclude: 'Hide assigned' }

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-dim">
      <span className="mb-1 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-lime/60">{children}</select>
    </label>
  )
}

function applyFilters(list: IssueRecommendation[], f: Filters, sort: Sort) {
  const age = (i: IssueRecommendation) => (Date.now() - new Date(i.updatedAt).getTime()) / 86400000
  const out = list.filter((i) =>
    (!f.language || i.language === f.language) &&
    (!f.difficulty || i.difficulty === f.difficulty) &&
    (!f.label || i.labels.includes(f.label)) &&
    (!f.activity || age(i) <= ACTIVITY[f.activity].days) &&
    (!f.assignment || (f.assignment === 'unassigned' ? i.assigned === false : i.assigned !== true)) &&
    i.fitScore >= f.minScore)
  const t = (s?: string) => (s ? new Date(s).getTime() : 0)
  return out.sort((a, b) => sort === 'match' ? b.fitScore - a.fitScore : sort === 'updated' ? t(b.updatedAt) - t(a.updatedAt) : t(b.createdAt) - t(a.createdAt))
}

export default function Discover() {
  const { profile, configured } = useProfile()
  const saved = useSaved()
  const [input, setInput] = useState('')
  const query = useDebounced(input.trim())
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [sort, setSort] = useState<Sort>('match')
  const [showFilters, setShowFilters] = useState(false)
  const [explain, setExplain] = useState<IssueRecommendation | null>(null)
  const [sample, setSample] = useState(false)
  const [shownCount, setShownCount] = useState(PAGE)
  const { status, issues, error, refresh, fetchedAt } = useIssues(profile, query, sample)

  const needle = query.toLowerCase()
  const searched = useMemo(() => !needle ? issues : issues.filter((i) => [i.title, i.repository, i.language ?? '', ...i.labels, ...(i.skills ?? [])].join(' ').toLowerCase().includes(needle)), [issues, needle])
  const results = useMemo(() => applyFilters(searched, filters, sort), [searched, filters, sort])
  const langs = [...new Set(issues.map((i) => i.language).filter(Boolean))] as string[]
  const labels = [...new Set(issues.flatMap((i) => i.labels))].sort()

  const chips: { k: keyof Filters; text: string }[] = [
    filters.language && { k: 'language' as const, text: filters.language },
    filters.difficulty && { k: 'difficulty' as const, text: filters.difficulty },
    filters.label && { k: 'label' as const, text: `label: ${filters.label}` },
    filters.activity && { k: 'activity' as const, text: ACTIVITY[filters.activity].l },
    filters.assignment && { k: 'assignment' as const, text: ASSIGN[filters.assignment] },
    filters.minScore > 0 && { k: 'minScore' as const, text: `score ≥ ${filters.minScore}` },
  ].filter(Boolean) as { k: keyof Filters; text: string }[]
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }))
  const reset = () => { setFilters(NO_FILTERS); setInput(''); setShownCount(PAGE) }

  const completeness = Math.round(([profile.skills.length > 0, profile.preferredLanguages.length > 0, profile.preferredTaskTypes.length > 0, profile.preferredDifficulty.length > 0, !!profile.timeCommitment].filter(Boolean).length / 5) * 100)

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">Find your next contribution</h1>
          <p className="mt-2 text-dim">Open issues ranked by how well they fit your skills.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 text-xs text-dim sm:flex" title="Profile completeness">
            <div className="h-1 w-16 overflow-hidden rounded bg-line"><div className="h-full bg-lime" style={{ width: `${completeness}%` }} /></div>{completeness}% profile
          </div>
          <Link to="/profile" className={btn.ghost}><Pencil size={14} />Edit skills</Link>
          <button onClick={refresh} disabled={status === 'loading'} className={btn.ghost} aria-label="Refresh recommendations"><RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
        </div>
      </header>

      {!configured && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet/30 bg-violet/5 p-4">
          <p className="max-w-xl text-sm text-dim"><span className="font-medium text-ink">Scores are generic until you add skills.</span> Fit is estimated from your languages, tools and level, so a few details make rankings much more useful.</p>
          <Link to="/profile" className={btn.ai}><UserPlus size={15} />Set up my skills</Link>
        </div>
      )}

      <form role="search" className="mt-6 space-y-3" onSubmit={(e) => e.preventDefault()}>
        <div className="flex gap-2">
          <div className="flex-1"><SearchBox value={input} onChange={setInput} placeholder="Search issues, repositories, technologies…" /></div>
          <button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="filters" className={btn.ghost}>
            <SlidersHorizontal size={15} />Filters{chips.length > 0 && <span className="rounded bg-lime px-1.5 font-mono text-xs text-bg">{chips.length}</span>}
          </button>
        </div>
        {showFilters && (
          <div id="filters" className="rise grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Language" value={filters.language} onChange={(v) => set('language', v)}><option value="">Any</option>{langs.map((l) => <option key={l}>{l}</option>)}</Select>
            <Select label="Difficulty" value={filters.difficulty} onChange={(v) => set('difficulty', v)}><option value="">Any</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select>
            <Select label="Label" value={filters.label} onChange={(v) => set('label', v)}><option value="">Any</option>{labels.map((l) => <option key={l}>{l}</option>)}</Select>
            <Select label="Repository activity" value={filters.activity} onChange={(v) => set('activity', v)}><option value="">Any</option>{Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</Select>
            <Select label="Assignment" value={filters.assignment} onChange={(v) => set('assignment', v)}><option value="">Any</option>{Object.entries(ASSIGN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <label className="block text-xs text-dim">
              <span className="mb-1 flex justify-between"><span>Minimum match score</span><span className="font-mono text-ink">{filters.minScore}</span></span>
              <input type="range" min={0} max={90} step={10} value={filters.minScore} onChange={(e) => set('minScore', +e.target.value)} className="mt-2 w-full accent-[#B7F36B]" />
            </label>
          </div>
        )}
      </form>

      {DATA_MODE === 'github' && !sample && status === 'ready' && fetchedAt && (
        <p className="mt-3 font-mono text-[11px] text-faint">
          Live from GitHub · fetched {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (cached up to 10 min; Refresh forces a new fetch)
          {rate.search?.remaining != null && ` · search quota ${rate.search.remaining}/${rate.search.limit}`}. Pull requests are excluded. Fit scores are ContributionFit estimates.
        </p>
      )}
      {sample && DATA_MODE === 'github' && (
        <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
          <span><span className="font-mono font-semibold">SAMPLE DATA</span> · These issues are fictional fixtures, not live GitHub results.</span>
          <button onClick={() => setSample(false)} className="underline underline-offset-2">Back to live GitHub data</button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs text-dim" role="status" aria-live="polite">{status === 'loading' ? 'Loading…' : `${results.length} issue${results.length === 1 ? '' : 's'}`}</p>
        {chips.map((c) => (
          <button key={c.k} onClick={() => set(c.k, NO_FILTERS[c.k] as never)} className="inline-flex items-center gap-1 rounded-md border border-lime/30 bg-lime/5 px-2 py-1 text-xs text-lime hover:bg-lime/10" aria-label={`Remove filter ${c.text}`}>{c.text}<X size={11} /></button>
        ))}
        {(chips.length > 0 || input) && <button onClick={reset} className="text-xs text-dim underline underline-offset-2 hover:text-ink">Clear all</button>}
        <label className="ml-auto flex items-center gap-2 text-xs text-dim">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-line bg-bg2 px-2 py-1.5 text-sm text-ink outline-none focus:border-lime/60">
            <option value="match">Best match</option><option value="updated">Recently updated</option><option value="created">Recently created</option>
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {status === 'loading' && issues.length === 0 && [0, 1, 2].map((i) => <IssueCardSkeleton key={i} />)}
        {status === 'error' && (
          <div className="space-y-3">
            <Notice tone="error"><span className="flex items-center gap-2"><AlertCircle size={15} />{error}</span></Notice>
            <div className="flex flex-wrap gap-2">
              <button onClick={refresh} className={btn.ghost}><RefreshCw size={14} />Try again</button>
              {DATA_MODE === 'github' && <button onClick={() => setSample(true)} className={btn.ghost}>Preview with sample data instead</button>}
            </div>
          </div>
        )}
        {status !== 'error' && (status === 'ready' || issues.length > 0) && results.slice(0, shownCount).map((i) => (
          <IssueCard key={i.id} issue={i} saved={saved.isSaved(i.id)} onToggleSave={() => saved.toggle(i)} onExplain={() => setExplain(i)} />
        ))}
        {status !== 'error' && results.length > shownCount && (
          <button onClick={() => setShownCount((n) => n + PAGE)} className={`${btn.ghost} w-full`}>Show more ({results.length - shownCount} remaining)</button>
        )}
        {status === 'ready' && results.length === 0 && (
          <EmptyState icon={<SearchX size={20} />} title="No issues match" body="Try removing a filter or broadening your search." action={<button onClick={reset} className={btn.ghost}>Clear filters and search</button>} />
        )}
      </div>

      <ExplainDialog issue={explain} profile={profile} onClose={() => setExplain(null)} />
    </div>
  )
}
