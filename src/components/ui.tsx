import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, Plus, Search, X } from 'lucide-react'
import { scoreBand } from '../lib/types'

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#B7F36B" />
        <path d="M8 7v10M8 12h4a3 3 0 0 0 3-3V7" stroke="#0B0D0F" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="15" cy="17" r="1.6" fill="#0B0D0F" />
      </svg>
      <span>ContributionFit</span>
    </span>
  )
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const band = scoreBand(score)
  const color = band.tone === 'lime' ? (score >= 80 ? '#B7F36B' : '#8fc95a') : band.tone === 'warn' ? '#F2C46D' : '#98A2AD'
  const r = (size - 6) / 2, c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Fit score ${score} out of 100, ${band.label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#282E35" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono font-semibold" style={{ fontSize: size * 0.32, color }}>{score}</span>
    </div>
  )
}

export function Tag({ children, tone = 'dim' }: { children: ReactNode; tone?: 'dim' | 'lime' | 'violet' | 'warn' | 'danger' }) {
  const t = { dim: 'border-line text-dim', lime: 'border-lime/30 text-lime bg-lime/5', violet: 'border-violet/30 text-violet bg-violet/5', warn: 'border-warn/30 text-warn bg-warn/5', danger: 'border-danger/30 text-danger bg-danger/5' }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${t}`}>{children}</span>
}

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-bg transition hover:brightness-110 active:scale-[.98] disabled:opacity-50',
  ghost: 'inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition hover:border-faint hover:bg-card2 disabled:opacity-50',
  ai: 'inline-flex items-center justify-center gap-2 rounded-lg border border-violet/40 bg-violet/10 px-3.5 py-2 text-sm font-medium text-violet transition hover:bg-violet/20',
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function Notice({ tone, children }: { tone: 'error' | 'warn' | 'info'; children: ReactNode }) {
  const c = tone === 'error' ? 'border-danger/40 bg-danger/5 text-danger' : tone === 'warn' ? 'border-warn/40 bg-warn/5 text-warn' : 'border-line bg-card2 text-dim'
  return <div role={tone === 'info' ? 'status' : 'alert'} className={`rounded-lg border px-3 py-2 text-sm ${c}`}>{children}</div>
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-lg bg-card2 text-dim">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-dim">{body}</p>
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  )
}

export function LinkButton({ to, children, className = btn.primary }: { to: string; children: ReactNode; className?: string }) {
  return <Link to={to} className={className}>{children}</Link>
}

/** Native <dialog>: focus trap, Esc to close, and aria semantics come from the browser. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby={id}
      className={`m-auto max-h-[88vh] w-[calc(100%-1.5rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-hidden rounded-2xl border border-line bg-bg2 p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-[2px]`}>
      {open && (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 id={id} className="font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-dim hover:bg-card2 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

/** Searchable multi-select with removable chips. */
export function MultiSelect({ label, options, value, onChange, hint, allowCustom = true }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; hint?: string; allowCustom?: boolean }) {
  const [q, setQ] = useState('')
  const id = useId()
  const lower = value.map((v) => v.toLowerCase())
  const suggestions = options.filter((o) => !lower.includes(o.toLowerCase()) && o.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  const add = (v: string) => { const t = v.trim(); if (t && !lower.includes(t.toLowerCase())) onChange([...value, t]); setQ('') }
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {hint && <p className="mb-2 text-xs text-faint">{hint}</p>}
      <div className="flex min-h-[2.5rem] flex-wrap gap-1.5 rounded-lg border border-line bg-bg p-1.5 focus-within:border-lime/60">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-card2 py-1 pl-2 pr-1 text-xs">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded p-0.5 text-dim hover:text-danger"><X size={12} /></button>
          </span>
        ))}
        <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={value.length ? '' : 'Search or type to add…'}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (suggestions[0] && q) add(suggestions[0]); else if (allowCustom) add(q) } if (e.key === 'Backspace' && !q && value.length) onChange(value.slice(0, -1)) }}
          className="min-w-[8rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-faint focus-visible:outline-none" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-dim hover:border-lime/50 hover:text-lime"><Plus size={11} />{s}</button>
        ))}
        {allowCustom && q.trim() && !suggestions.some((s) => s.toLowerCase() === q.trim().toLowerCase()) && (
          <button type="button" onClick={() => add(q)} className="inline-flex items-center gap-1 rounded-md border border-lime/40 px-2 py-1 text-xs text-lime"><Plus size={11} />Add “{q.trim()}”</button>
        )}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-bg p-0.5">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${value === o.v ? 'bg-card2 text-ink' : 'text-dim hover:text-ink'}`}>
          {value === o.v && <Check size={13} className="text-lime" />}{o.l}
        </button>
      ))}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input type="search" aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-bg2 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-lime/60" />
    </div>
  )
}
