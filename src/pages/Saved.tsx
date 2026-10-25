import { useState } from 'react'
import { Bookmark, ExternalLink } from 'lucide-react'
import { useProfile } from '../lib/storage'
import { useSaved } from '../lib/saved'
import { useSavedIssues } from '../lib/useIssues'
import type { IssueRecommendation } from '../lib/types'
import { IssueCard, IssueCardSkeleton } from '../components/IssueCard'
import { ExplainDialog } from '../components/ExplainDialog'
import { btn, EmptyState, LinkButton, Notice } from '../components/ui'

export default function Saved() {
  const { profile } = useProfile()
  const saved = useSaved()
  const { status, issues, error, refresh } = useSavedIssues(saved.ids, profile)
  const [explain, setExplain] = useState<IssueRecommendation | null>(null)
  const shown = issues.filter((i) => saved.ids.includes(i.id))
  const loadedIds = new Set(shown.map((i) => i.id))
  const unloaded = status === 'loading' ? [] : saved.items.filter((i) => !loadedIds.has(i.id))

  return (
    <div>
      <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">Saved issues</h1>
      <p className="mt-2 text-dim">Stored in this browser only — not synced across devices.</p>
      <div className="mt-6 space-y-3">
        {error && <Notice tone={status === 'error' ? 'error' : 'warn'}>{error} <button onClick={refresh} className="underline">Retry</button></Notice>}
        {status === 'loading' && saved.ids.length > 0 && shown.length === 0 && saved.ids.map((id) => <IssueCardSkeleton key={id} />)}
        {shown.map((i) => <IssueCard key={i.id} issue={i} saved onToggleSave={() => saved.toggle(i)} onExplain={() => setExplain(i)} />)}
        {unloaded.map((i) => (
          <article key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-4">
            <div className="min-w-0"><p className="truncate font-mono text-xs text-dim">{i.repository} #{i.number}</p><p className="truncate font-medium">{i.title}</p><p className="mt-0.5 text-xs text-faint">Saved copy — live details unavailable right now.</p></div>
            <div className="flex shrink-0 items-center gap-2">
              <a href={i.url} target="_blank" rel="noopener noreferrer" className={btn.ghost}>GitHub<ExternalLink size={13} /></a>
              <button onClick={() => saved.toggle(i)} className={btn.ghost} aria-label={`Remove ${i.title} from saved`}>Remove</button>
            </div>
          </article>
        ))}
        {saved.ids.length === 0 && (
          <EmptyState icon={<Bookmark size={20} />} title="Nothing saved yet" body="Bookmark issues while you browse and they will be waiting here." action={<LinkButton to="/discover" className={btn.primary}>Browse issues</LinkButton>} />
        )}
      </div>
      <ExplainDialog issue={explain} profile={profile} onClose={() => setExplain(null)} />
    </div>
  )
}
