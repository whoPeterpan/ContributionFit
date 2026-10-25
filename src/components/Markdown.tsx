import { Fragment, type ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))|(@[\w-]+)/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (m[1]) out.push(<code key={k++} className="rounded bg-card2 px-1.5 py-0.5 font-mono text-[0.85em] text-lime">{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k++} className="font-semibold text-ink">{t.slice(2, -2)}</strong>)
    else if (m[3]) out.push(<a key={k++} href={m[4]} target="_blank" rel="noopener noreferrer nofollow" className="text-violet underline underline-offset-2">{t.slice(1, t.indexOf(']'))}</a>)
    else out.push(<span key={k++} className="font-mono text-dim">{t}</span>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Minimal safe renderer: builds React elements only, never injects HTML. */
export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      blocks.push(<pre key={blocks.length} className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs text-ink">{code.join('\n')}</pre>)
    } else if (/^#{1,4}\s/.test(l)) {
      blocks.push(<h4 key={blocks.length} className="mt-2 text-sm font-semibold text-ink">{inline(l.replace(/^#+\s/, ''))}</h4>)
      i++
    } else if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ''))
      blocks.push(
        <ul key={blocks.length} className="space-y-1.5 pl-1">
          {items.map((t, j) => {
            const cb = /^\[( |x)\]\s/i.exec(t)
            return (
              <li key={j} className="flex gap-2.5">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-faint" aria-hidden />
                <span>{cb ? (cb[1] === ' ' ? '☐ ' : '☑ ') : ''}{inline(cb ? t.slice(4) : t)}</span>
              </li>
            )
          })}
        </ul>,
      )
    } else if (!l.trim()) i++
    else {
      const p: string[] = []
      while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*([-*]|\d+\.)\s)/.test(lines[i])) p.push(lines[i++])
      blocks.push(<p key={blocks.length}>{p.map((x, j) => <Fragment key={j}>{j > 0 && <br />}{inline(x)}</Fragment>)}</p>)
    }
  }
  return <div className="space-y-3 text-sm leading-relaxed text-dim">{blocks}</div>
}
