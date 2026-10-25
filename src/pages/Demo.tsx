import { useNavigate, Link } from 'react-router'
import { ArrowRight, HardDrive, ShieldOff, Sparkles } from 'lucide-react'
import { DEMO_PROFILE, useDemo, useProfile } from '../lib/storage'
import { btn, Logo, Notice } from '../components/ui'

export default function Demo() {
  const nav = useNavigate()
  const { save, configured } = useProfile()
  const { demo, update } = useDemo()

  const startDemo = () => {
    save(DEMO_PROFILE)
    update({ displayName: demo.displayName || 'Demo developer', onboardingDone: true })
    nav('/discover')
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="ContributionFit home" className="mb-8 inline-block"><Logo /></Link>
        <p className="font-mono text-xs uppercase tracking-widest text-lime">Local demo mode</p>
        <h1 className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">No account needed</h1>
        <p className="mt-3 text-dim">ContributionFit runs entirely in your browser right now. Discovery uses real public GitHub issues; your profile and saved issues stay on this device.</p>

        <div className="mt-6 space-y-3">
          <button onClick={startDemo} className={`${btn.primary} w-full justify-center`}><Sparkles size={15} />Try with a demo profile</button>
          <button onClick={() => { update({ onboardingDone: true }); nav('/profile') }} className={`${btn.ghost} w-full justify-center`}>Set up my own skills<ArrowRight size={15} /></button>
          <Link to="/discover" className="block py-1 text-center text-sm text-dim underline underline-offset-2 hover:text-ink">Just browse issues</Link>
        </div>
        {configured && <div className="mt-4"><Notice tone="info">You already have a local profile. “Try with a demo profile” will replace it.</Notice></div>}

        <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-dim">
          <li className="flex gap-3"><HardDrive size={16} className="mt-0.5 shrink-0 text-faint" /><span>Saved issues, profile and checklists are stored in this browser’s localStorage. They are not synced across browsers or devices, and clearing site data removes them.</span></li>
          <li className="flex gap-3"><ShieldOff size={16} className="mt-0.5 shrink-0 text-faint" /><span>This is not an account and nobody is verified or signed in. Sign-in may be added later.</span></li>
        </ul>
      </div>
    </div>
  )
}
