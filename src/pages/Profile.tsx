import { useEffect, useState } from 'react'
import { Check, RotateCcw, Save } from 'lucide-react'
import { useNavigate } from 'react-router'
import { DEMO_PROFILE, resetLocalData, useDemo, useProfile } from '../lib/storage'
import type { DeveloperProfile, ExperienceLevel } from '../lib/types'
import { FRAMEWORKS, LANGUAGES, TASK_TYPES, TOPICS } from '../lib/util'
import { btn, Modal, MultiSelect, Notice, Segmented } from '../components/ui'

const DIFFS = ['beginner', 'intermediate', 'advanced']
const TIMES = ['', '1–2 hours / week', '3–5 hours / week', '6–10 hours / week', '10+ hours / week']

export default function Profile() {
  const { profile, configured, save, reset } = useProfile()
  const [draft, setDraft] = useState<DeveloperProfile>(profile)
  const [errors, setErrors] = useState<string[]>([])
  const [savedMsg, setSavedMsg] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const nav = useNavigate()
  const { demo, update } = useDemo()
  const [name, setName] = useState(demo.displayName)
  const [confirmAll, setConfirmAll] = useState(false)
  useEffect(() => { setDraft(profile) }, [configured]) // eslint-disable-line react-hooks/exhaustive-deps
  const up = <K extends keyof DeveloperProfile>(k: K, v: DeveloperProfile[K]) => { setDraft((d) => ({ ...d, [k]: v })); setSavedMsg(false) }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: string[] = []
    if (draft.preferredLanguages.length + draft.skills.length === 0) errs.push('Add at least one language or tool so we can match issues to you.')
    if (draft.skills.concat(draft.preferredLanguages).some((s) => s.length > 40)) errs.push('Skill names must be 40 characters or fewer.')
    setErrors(errs)
    if (errs.length) return
    save(draft)
    update({ displayName: name, onboardingDone: true })
    setSavedMsg(true)
  }

  return (
    <div>
      <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">My profile</h1>
      <p className="mt-2 max-w-xl text-dim">Your skills decide how issues are ranked. This is a local demo profile: it is stored only in this browser and is not synced or tied to an account.</p>

      {!configured && (
        <div className="mt-5"><Notice tone="info">Why this matters: without a profile, every issue is scored generically. Even two or three skills noticeably improve rankings. You can explore issues at any time.</Notice></div>
      )}

      <form onSubmit={submit} noValidate className="mt-6 space-y-7 rounded-xl border border-line bg-card p-5 sm:p-6">
        <label className="block text-sm font-medium">Display name <span className="font-normal text-faint">(optional, shown in the sidebar)</span>
          <input value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setSavedMsg(false) }} placeholder="Demo developer" className="mt-1.5 block w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal outline-none placeholder:text-faint focus:border-lime/60" />
        </label>
        <MultiSelect label="Programming languages" options={LANGUAGES} value={draft.preferredLanguages} onChange={(v) => up('preferredLanguages', v)} />
        <MultiSelect label="Frameworks and tools" options={FRAMEWORKS} value={draft.skills} onChange={(v) => up('skills', v)} />
        <div>
          <p id="lvl" className="mb-1.5 text-sm font-medium">Experience level</p>
          <Segmented<ExperienceLevel> label="Experience level" value={draft.experienceLevel} onChange={(v) => up('experienceLevel', v)} options={[{ v: 'beginner', l: 'Beginner' }, { v: 'intermediate', l: 'Intermediate' }, { v: 'advanced', l: 'Advanced' }]} />
        </div>
        <MultiSelect label="Preferred issue types" options={TASK_TYPES} value={draft.preferredTaskTypes} onChange={(v) => up('preferredTaskTypes', v)} />
        <MultiSelect label="Preferred difficulty" options={DIFFS} value={draft.preferredDifficulty} onChange={(v) => up('preferredDifficulty', v)} allowCustom={false} />
        <MultiSelect label="Topics of interest" options={TOPICS} value={draft.topics ?? []} onChange={(v) => up('topics', v)} />
        <label className="block text-sm font-medium">Time commitment <span className="font-normal text-faint">(optional)</span>
          <select value={draft.timeCommitment ?? ''} onChange={(e) => up('timeCommitment', e.target.value)} className="mt-1.5 block w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal outline-none focus:border-lime/60">
            {TIMES.map((t) => <option key={t} value={t}>{t || 'Not specified'}</option>)}
          </select>
        </label>

        {errors.length > 0 && <Notice tone="error">{errors.map((e) => <p key={e}>{e}</p>)}</Notice>}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button type="submit" className={btn.primary}><Save size={15} />Save profile</button>
          {savedMsg && <>
            <span role="status" className="inline-flex items-center gap-1.5 text-sm text-lime"><Check size={15} />Saved in this browser.</span>
            <button type="button" onClick={() => nav('/discover')} className="text-sm text-dim underline underline-offset-2 hover:text-ink">See my recommendations</button>
          </>}
          <button type="button" onClick={() => { setDraft(DEMO_PROFILE); setName((n) => n || 'Demo developer'); setSavedMsg(false) }} className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink">Fill with demo profile</button>
          <button type="button" onClick={() => setConfirmReset(true)} disabled={!configured} className="ml-auto inline-flex items-center gap-1.5 text-sm text-dim hover:text-danger disabled:opacity-40"><RotateCcw size={14} />Reset</button>
        </div>
      </form>

      <section className="mt-6 rounded-xl border border-line bg-card p-5 sm:p-6">
        <h2 className="text-sm font-medium">Local data</h2>
        <p className="mt-1 max-w-xl text-sm text-dim">Your profile, saved issues and checklist progress live in this browser’s localStorage. They are not synced to any server or other device, and clearing site data removes them.</p>
        <button type="button" onClick={() => setConfirmAll(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-dim hover:text-danger"><RotateCcw size={14} />Reset all demo data</button>
      </section>

      <Modal open={confirmAll} onClose={() => setConfirmAll(false)} title="Reset all demo data?">
        <p className="text-sm text-dim">This permanently removes your profile, saved issues, checklist progress, display name and cached GitHub results from this browser.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirmAll(false)} className={btn.ghost}>Cancel</button>
          <button onClick={() => { resetLocalData(); setConfirmAll(false); setSavedMsg(false); setName(''); setDraft({ ...profile, skills: [], preferredLanguages: [], preferredTaskTypes: [], preferredDifficulty: [], topics: [], timeCommitment: '', experienceLevel: 'beginner' }) }} className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-bg">Reset everything</button>
        </div>
      </Modal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset profile?">
        <p className="text-sm text-dim">This removes your saved skills and preferences from this browser. Saved issues are kept.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirmReset(false)} className={btn.ghost}>Cancel</button>
          <button onClick={() => { reset(); setDraft(profile); setConfirmReset(false); setSavedMsg(false); setDraft({ ...profile, skills: [], preferredLanguages: [], preferredTaskTypes: [], preferredDifficulty: [], topics: [], timeCommitment: '', experienceLevel: 'beginner' }) }} className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-bg">Reset profile</button>
        </div>
      </Modal>
    </div>
  )
}
