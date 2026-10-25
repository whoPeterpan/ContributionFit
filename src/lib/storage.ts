import { useCallback, useSyncExternalStore } from 'react'
import type { DeveloperProfile, ExperienceLevel } from './types'

export const STORAGE_VERSION = 1
export const KEYS = {
  profile: 'cf:v1:profile',
  saved: 'cf:v1:saved',
  checklists: 'cf:v1:checklists',
  demo: 'cf:v1:demo',
} as const
const PREFIX = 'cf:v'
const LEGACY = { profile: 'cf.profile', checklists: 'cf.checklists' }

type Validate<T> = (raw: unknown) => T | null

function backend(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

/** Reads a versioned envelope; any missing, malformed, outdated or invalid value yields `fallback`. */
export function readStored<T>(key: string, validate: Validate<T>, fallback: T): T {
  const raw = readRaw(key)
  return parseEnvelope(raw, validate) ?? fallback
}
const readRaw = (key: string) => { try { return backend()?.getItem(key) ?? null } catch { return null } }

export function parseEnvelope<T>(raw: string | null, validate: Validate<T>): T | null {
  if (!raw) return null
  try {
    const env = JSON.parse(raw) as { v?: unknown; data?: unknown } | null
    if (!env || typeof env !== 'object' || env.v !== STORAGE_VERSION) return null
    return validate(env.data)
  } catch { return null }
}

export function writeStored(key: string, data: unknown): boolean {
  try {
    const b = backend()
    if (!b) return false
    b.setItem(key, JSON.stringify({ v: STORAGE_VERSION, data }))
    return true
  } catch { return false }
}

const errListeners = new Set<() => void>()
let storageError: string | null = null
const setStorageError = (m: string | null) => { if (m !== storageError) { storageError = m; errListeners.forEach((l) => l()) } }
export function useStorageError() {
  return useSyncExternalStore((cb) => { errListeners.add(cb); return () => { errListeners.delete(cb) } }, () => storageError, () => null)
}

interface Store<T> { get: () => T; set: (v: T) => void; subscribe: (cb: () => void) => () => void; refresh: () => void }

function createStore<T>(key: string, validate: Validate<T>, fallback: T): Store<T> {
  const listeners = new Set<() => void>()
  let cache: { raw: string | null; value: T } | null = null
  let mem: { value: T } | null = null // used only while localStorage is unwritable, so the UI still works this session
  const notify = () => listeners.forEach((l) => l())
  return {
    get() {
      if (mem) return mem.value
      const raw = readRaw(key)
      if (cache && cache.raw === raw) return cache.value
      cache = { raw, value: parseEnvelope(raw, validate) ?? fallback }
      return cache.value
    },
    set(v) {
      if (writeStored(key, v)) { mem = null; setStorageError(null) } else {
        mem = { value: v }
        setStorageError('Could not write to this browser’s storage (it may be full or blocked). Changes will be lost when you close the tab.')
      }
      cache = null
      notify()
    },
    subscribe(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
    refresh() { mem = null; cache = null; notify() },
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const strs = (v: unknown, max = 60) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 60))].slice(0, max) : [])
const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']

export const EMPTY_PROFILE: DeveloperProfile = {
  skills: [], experienceLevel: 'beginner', preferredLanguages: [], preferredTaskTypes: [], preferredDifficulty: [], topics: [], timeCommitment: '',
}

export const validateProfile: Validate<DeveloperProfile> = (r) => {
  if (!isObj(r)) return null
  return {
    skills: strs(r.skills), preferredLanguages: strs(r.preferredLanguages), preferredTaskTypes: strs(r.preferredTaskTypes),
    preferredDifficulty: strs(r.preferredDifficulty), topics: strs(r.topics),
    experienceLevel: LEVELS.includes(r.experienceLevel as ExperienceLevel) ? (r.experienceLevel as ExperienceLevel) : 'beginner',
    timeCommitment: typeof r.timeCommitment === 'string' ? r.timeCommitment.slice(0, 60) : '',
  }
}

export interface SavedItem { id: string; repository: string; number: number; title: string; url: string; savedAt: number }
const ISSUE_ID = /^[^~\s]+~[^~\s]+~\d+$/
export const validateSaved: Validate<SavedItem[]> = (r) => {
  if (!Array.isArray(r)) return null
  const seen = new Set<string>()
  const out: SavedItem[] = []
  for (const x of r) {
    if (!isObj(x) || typeof x.id !== 'string' || !ISSUE_ID.test(x.id) || seen.has(x.id)) continue
    if (typeof x.repository !== 'string' || typeof x.number !== 'number' || typeof x.title !== 'string' || typeof x.url !== 'string' || !/^https:\/\//.test(x.url)) continue
    seen.add(x.id)
    out.push({ id: x.id, repository: x.repository, number: x.number, title: x.title.slice(0, 300), url: x.url, savedAt: typeof x.savedAt === 'number' ? x.savedAt : 0 })
  }
  return out
}

export const validateChecklists: Validate<Record<string, boolean[]>> = (r) => {
  if (!isObj(r)) return null
  const out: Record<string, boolean[]> = {}
  for (const [k, v] of Object.entries(r)) if (Array.isArray(v) && v.length <= 50) out[k] = v.map((b) => b === true)
  return out
}

export interface DemoState { displayName: string; onboardingDone: boolean }
export const DEFAULT_DEMO: DemoState = { displayName: '', onboardingDone: false }
export const validateDemo: Validate<DemoState> = (r) => {
  if (!isObj(r)) return null
  return { displayName: typeof r.displayName === 'string' ? r.displayName.trim().slice(0, 40) : '', onboardingDone: r.onboardingDone === true }
}

const NO_CHECKS: Record<string, boolean[]> = {}
export const stores = {
  profile: createStore<DeveloperProfile | null>(KEYS.profile, validateProfile, null),
  saved: createStore<SavedItem[]>(KEYS.saved, validateSaved, []),
  checklists: createStore<Record<string, boolean[]>>(KEYS.checklists, validateChecklists, NO_CHECKS),
  demo: createStore<DemoState>(KEYS.demo, validateDemo, DEFAULT_DEMO),
}

/** One-time import of pre-versioned keys (cf.profile, cf.checklists) so existing browsers keep their data. */
export function migrateLegacy() {
  const b = backend()
  if (!b) return
  try {
    const old = (k: string) => { try { return JSON.parse(b.getItem(k) ?? 'null') as unknown } catch { return null } }
    if (b.getItem(LEGACY.profile) !== null) {
      const p = validateProfile(old(LEGACY.profile))
      if (p && !b.getItem(KEYS.profile)) writeStored(KEYS.profile, p)
      b.removeItem(LEGACY.profile)
    }
    if (b.getItem(LEGACY.checklists) !== null) {
      const c = validateChecklists(old(LEGACY.checklists))
      if (c && !b.getItem(KEYS.checklists)) writeStored(KEYS.checklists, c)
      b.removeItem(LEGACY.checklists)
    }
  } catch { /* ignore */ }
}
migrateLegacy()

export type StoreName = keyof typeof stores
/** Clears the chosen stores (all by default). `cf.gh.*` is a fetch cache, cleared only when everything is reset. */
export function resetLocalData(which: StoreName[] = ['profile', 'saved', 'checklists', 'demo']) {
  const b = backend()
  const all = which.length === 4
  try {
    if (b) {
      for (const n of which) b.removeItem(KEYS[n])
      if (all) Object.keys(b).filter((k) => k.startsWith('cf.') || k.startsWith(PREFIX)).forEach((k) => b.removeItem(k))
    }
  } catch { /* ignore */ }
  for (const n of which) stores[n].refresh()
  setStorageError(null)
}

function useStore<T>(s: Store<T>, fallback: T) {
  const subscribe = useCallback((cb: () => void) => {
    const un = s.subscribe(cb)
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith(PREFIX)) { s.refresh() } }
    window.addEventListener('storage', onStorage)
    return () => { un(); window.removeEventListener('storage', onStorage) }
  }, [s])
  return useSyncExternalStore(subscribe, s.get, () => fallback)
}

export const readProfile = () => stores.profile.get()
export const setProfileLocal = (p: DeveloperProfile | null) => stores.profile.set(p)

export function useProfile() {
  const stored = useStore(stores.profile, null)
  return {
    profile: stored ?? EMPTY_PROFILE, configured: !!stored,
    save: (p: DeveloperProfile) => stores.profile.set(validateProfile(p)),
    reset: () => resetLocalData(['profile']),
  }
}

export function useChecklist(issueId: string) {
  const all = useStore(stores.checklists, NO_CHECKS)
  const checked = all[issueId] ?? []
  return {
    checked,
    toggle: (i: number) => { const n = [...checked]; n[i] = !n[i]; stores.checklists.set({ ...all, [issueId]: n }) },
  }
}

export function useDemo() {
  const demo = useStore(stores.demo, DEFAULT_DEMO)
  return {
    demo,
    update: (patch: Partial<DemoState>) => stores.demo.set({ ...demo, ...patch, displayName: (patch.displayName ?? demo.displayName).trim().slice(0, 40) }),
  }
}

export function useSavedItems() {
  return useStore(stores.saved, [] as SavedItem[])
}

export const DEMO_PROFILE: DeveloperProfile = {
  skills: ['React', 'Node.js', 'Tailwind'], preferredLanguages: ['TypeScript', 'JavaScript', 'Python'], preferredTaskTypes: ['Documentation', 'Bug fix'],
  preferredDifficulty: ['beginner', 'intermediate'], topics: ['Web', 'Developer tools'], experienceLevel: 'intermediate', timeCommitment: '3–5 hours / week',
}
