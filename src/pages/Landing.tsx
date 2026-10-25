import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpenCheck, ListChecks, Menu, Target, X, Sparkles, ExternalLink, Bookmark } from 'lucide-react'
import { btn, Logo, ScoreRing, Tag } from '../components/ui'

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [['/discover', 'Discover'], ['#how', 'How it works']]
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link to="/" aria-label="ContributionFit home"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm text-dim md:flex">
          {links.map(([h, l]) => h.startsWith('#') ? <a key={h} href={h} className="hover:text-ink">{l}</a> : <Link key={h} to={h} className="hover:text-ink">{l}</Link>)}
          <Link to="/demo" className="hover:text-ink">Demo mode</Link>
          <Link to="/discover" className={btn.primary}>Find my first issue</Link>
        </nav>
        <button className="rounded-md p-1.5 text-dim md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line px-5 py-4 text-sm md:hidden">
          <Link to="/discover" className="block text-dim">Discover</Link>
          <a href="#how" onClick={() => setOpen(false)} className="block text-dim">How it works</a>
          <Link to="/demo" className="block text-dim">Demo mode</Link>
          <Link to="/discover" className={`${btn.primary} w-full`}>Find my first issue</Link>
        </div>
      )}
    </header>
  )
}

function Preview() {
  return (
    <figure className="relative">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-lime/25 to-transparent opacity-60 blur-sm" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-bg2 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5"><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="ml-3 font-mono text-[11px] text-faint">contributionfit / discover</span></div>
        <div className="p-4 sm:p-5">
          <article className="rounded-xl border border-line bg-card p-4">
            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-dim">acme/example-project <span className="text-faint">#214</span></p>
                <h3 className="mt-1.5 font-semibold leading-snug">Add retry handling to API requests</h3>
                <div className="mt-3 flex flex-wrap gap-1.5"><Tag tone="lime">JavaScript</Tag><Tag tone="lime">REST APIs</Tag><Tag>intermediate</Tag></div>
              </div>
              <div className="flex flex-col items-center gap-1"><ScoreRing score={86} /><span className="text-[10px] text-dim">Strong match</span></div>
            </div>
            <ul className="mt-4 space-y-1.5 rounded-lg bg-bg/60 p-3 text-sm text-dim">
              <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime" />Your JavaScript and API experience is relevant.</li>
              <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime" />Focused change with clear expected behavior.</li>
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <span className={`${btn.primary} pointer-events-none`}>Review contribution plan <ArrowRight size={14} /></span>
              <span className={`${btn.ai} pointer-events-none hidden sm:inline-flex`}><Sparkles size={14} />Explain</span>
              <Bookmark size={17} className="ml-auto text-dim" /><ExternalLink size={17} className="text-dim" />
            </div>
          </article>
        </div>
      </div>
      <figcaption className="mt-3 text-center font-mono text-[11px] text-faint">Illustrative example, not a live issue</figcaption>
    </figure>
  )
}

export default function Landing() {
  const benefits = [
    { icon: Target, t: 'Matched to your skills', d: 'Every issue gets an explainable fit score based on your languages, tools, and level, with the evidence shown.' },
    { icon: BookOpenCheck, t: 'Understand before you start', d: 'Plain-English explanations, likely prerequisites, and honest warnings about assigned, stale, or already-claimed issues.' },
    { icon: ListChecks, t: 'A clear path to contribute', d: 'A practical checklist from reading CONTRIBUTING.md to opening a focused pull request.' },
  ]
  const steps = [['Tell us what you know', 'Pick languages, tools, and your comfort level. It takes a minute and stays in your browser.'], ['Discover relevant GitHub issues', 'Search and filter issues ranked by fit, with reasons you can inspect.'], ['Get your contribution plan', 'Open any issue for a readiness breakdown, AI explanation, and step-by-step checklist.']]
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24 [&>*]:min-w-0">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-lime">Open-source, but make it fit</p>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl">Your next open-source contribution starts <em className="text-lime">here.</em></h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-dim">Find issues that fit your skills, understand what they need, and turn your interest in open source into your next contribution.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/profile" className={`${btn.primary} px-5 py-3`}>Find my fit <ArrowRight size={16} /></Link>
              <a href="#how" className={`${btn.ghost} px-5 py-3`}>Explore how it works</a>
            </div>
          </div>
          <Preview />
        </section>

        <section className="border-y border-line bg-bg2">
          <div className="mx-auto grid max-w-6xl gap-px bg-line px-0 md:grid-cols-3">
            {benefits.map(({ icon: Icon, t, d }) => (
              <div key={t} className="bg-bg2 p-7 sm:p-9">
                <Icon size={20} className="text-lime" />
                <h2 className="mt-5 text-lg font-semibold">{t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-dim">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-24">
          <h2 className="font-display text-4xl sm:text-5xl">How it works</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="border-t border-line pt-5">
                <span className="font-mono text-sm text-lime">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-xl text-xs text-faint">Scores estimate suitability for you. They are not a prediction that a pull request will be accepted or merged.</p>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center sm:py-20">
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-6xl">Stop searching endlessly. Start contributing.</h2>
            <Link to="/discover" className={`${btn.primary} mt-8 px-6 py-3`}>Explore open issues <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-8 text-sm text-dim">
          <div className="max-w-sm"><Logo size={18} /><p className="mt-2">Helping developers find open-source issues worth attempting, and how to start.</p></div>
          <p className="max-w-xs text-xs text-faint">Public issue data comes from GitHub. ContributionFit is not affiliated with or endorsed by GitHub.</p>
        </div>
      </footer>
    </div>
  )
}
