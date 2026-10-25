import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { explainIssue } from '../lib/api'
import { ApiError, type AiExplanation, type DeveloperProfile, type IssueRecommendation } from '../lib/types'
import { btn, Modal, Notice, Skeleton } from './ui'

function Section({ title, items, mono }: { title: string; items: string[]; mono?: boolean }) {
  if (!items.length) return null
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">{title}</h3>
      <ul className="space-y-1">{items.map((x) => <li key={x} className={`flex gap-2 text-sm text-dim ${mono ? 'font-mono text-xs' : ''}`}><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet" />{x}</li>)}</ul>
    </section>
  )
}

export function ExplainDialog({ issue, profile, onClose }: { issue: IssueRecommendation | null; profile: DeveloperProfile; onClose: () => void }) {
  const [state, setState] = useState<{ status: 'loading' | 'done' | 'error'; data?: AiExplanation; error?: string }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const run = useCallback(() => setAttempt((a) => a + 1), [])

  useEffect(() => {
    if (!issue) return
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    explainIssue(issue, profile, ctrl.signal)
      .then((data) => setState({ status: 'done', data }))
      .catch((e) => { if (!ctrl.signal.aborted) setState({ status: 'error', error: e instanceof ApiError ? e.message : 'The AI explanation is unavailable right now.' }) })
    return () => ctrl.abort()
  }, [issue, profile, attempt])

  const d = state.data
  return (
    <Modal open={!!issue} onClose={onClose} title="AI contribution assistant" wide>
      {issue && (
        <div className="space-y-5">
          <div>
            <p className="font-mono text-xs text-dim">{issue.repository} #{issue.number}</p>
            <p className="font-medium">{issue.title}</p>
          </div>
          <div aria-live="polite">
            {state.status === 'loading' && (
              <div className="space-y-3" role="status">
                <p className="flex items-center gap-2 text-sm text-violet"><Sparkles size={15} className="animate-pulse" />Reading the issue and your profile…</p>
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-16 w-full" /><Skeleton className="h-4 w-2/3" />
              </div>
            )}
            {state.status === 'error' && (
              <div className="space-y-3">
                <Notice tone="error">{state.error} You can keep browsing issues without AI.</Notice>
                <button onClick={run} className={btn.ghost}><RefreshCw size={14} />Retry</button>
              </div>
            )}
            {d && (
              <div className="space-y-5">
                <Notice tone="info">
                  {d.generatedBy === 'sample'
                    ? 'Outline assembled locally from the issue text. No AI service is connected, so this is not an AI explanation.'
                    : 'AI-generated suggestions. Inferences are not verified repository facts; confirm against the issue and repository docs.'}
                </Notice>
                <section><h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">In plain English</h3><p className="text-sm text-dim">{d.summary}</p></section>
                <Section title="Why it matches you" items={d.whyItMatches} />
                <Section title="Skills required" items={d.skillsRequired} />
                <Section title="Possible gaps to close first" items={d.missingPrerequisites} />
                <Section title="Code areas to investigate (from issue evidence)" items={d.filesToInvestigate.map((f) => `${f.path} – ${f.evidence}`)} mono />
                <section>
                  <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">Suggested plan</h3>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-dim marker:text-violet">{d.plan.map((s) => <li key={s}>{s}</li>)}</ol>
                </section>
                <Section title="Questions for the maintainer" items={d.maintainerQuestions} />
                <p className="rounded-lg border border-line bg-bg p-3 text-xs text-dim">Always read <span className="font-mono text-ink">CONTRIBUTING.md</span> and any repository-specific instructions before starting.</p>
                {d.sources.length > 0 && <p className="text-xs text-faint">Sources: {d.sources.map((s, i) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-violet underline">{s.label}{i < d.sources.length - 1 ? ', ' : ''}</a>)}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
