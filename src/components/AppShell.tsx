import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router'
import { Bookmark, Compass, Menu, RotateCcw, User, X } from 'lucide-react'
import { useDemo, useProfile } from '../lib/storage'
import { useSaved } from '../lib/saved'
import { DATA_MODE } from '../lib/api'
import { Logo } from './ui'

const NAV = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/saved', label: 'Saved issues', icon: Bookmark },
  { to: '/profile', label: 'My profile', icon: User },
]

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const saved = useSaved()
  return (
    <nav aria-label="Primary" className="space-y-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-card2 text-ink' : 'text-dim hover:bg-card hover:text-ink'}`}>
          {({ isActive }) => (<>
            <Icon size={17} className={isActive ? 'text-lime' : ''} />{label}
            {to === '/saved' && saved.ids.length > 0 && <span className="ml-auto font-mono text-xs text-dim">{saved.ids.length}</span>}
          </>)}
        </NavLink>
      ))}
    </nav>
  )
}

function ProfileSummary() {
  const { profile, configured } = useProfile()
  const { demo, update } = useDemo()
  const nav = useNavigate()
  const langs = [...profile.preferredLanguages, ...profile.skills].slice(0, 3)
  const name = demo.displayName || (configured ? 'Local profile' : 'No profile yet')
  const initials = demo.displayName ? demo.displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : ''
  return (
    <div className="space-y-2">
      <Link to="/profile" className="block rounded-lg border border-line bg-card p-3 text-sm transition hover:border-faint">
        <div className="flex items-center gap-2">
          {initials ? <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-lime/15 font-mono text-xs font-semibold text-lime">{initials}</span> : <span className="grid h-7 w-7 place-items-center rounded-md bg-card2 text-dim"><User size={15} /></span>}
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs capitalize text-dim">{configured ? profile.experienceLevel : 'Set up your skills'}</p>
          </div>
        </div>
        {langs.length > 0 && <p className="mt-2 truncate font-mono text-[11px] text-dim">{langs.join(' · ')}</p>}
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">Local demo · this browser only</p>
      </Link>
      <button onClick={() => { update({ displayName: '', onboardingDone: false }); nav('/demo') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-dim hover:bg-card hover:text-ink"><RotateCcw size={16} />Reset demo session</button>
    </div>
  )
}

function SavedErr() {
  const { error } = useSaved()
  return error ? <div className="mb-4" role="alert"><div className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</div></div> : null
}

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-line bg-bg2 p-4 lg:flex">
        <div className="space-y-6"><Link to="/" aria-label="ContributionFit home" className="block px-2 pt-1"><Logo /></Link><Nav /></div>
        <ProfileSummary />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg2/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" aria-label="ContributionFit home"><Logo /></Link>
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="rounded-md p-1.5 text-dim hover:bg-card2">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-[53px] z-20 space-y-4 border-b border-line bg-bg2 p-4 lg:hidden">
          <Nav onNavigate={() => setOpen(false)} /><ProfileSummary />
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">
        {DATA_MODE === 'sample' && (
          <div role="status" className="mx-auto mb-5 max-w-5xl rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
            <span className="font-mono font-semibold">SAMPLE DATA</span> · These issues are fictional fixtures for development, not live GitHub results. Remove <span className="font-mono">VITE_DATA_MODE=sample</span> to read real issues from GitHub.
          </div>
        )}
        <div className="mx-auto max-w-5xl"><SavedErr /><Outlet /></div>
      </main>
    </div>
  )
}
