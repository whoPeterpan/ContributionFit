import { beforeEach, describe, expect, it, vi } from 'vitest'

class MemStorage {
  data = new Map<string, string>()
  failWrites = false
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { if (this.failWrites) throw new DOMException('full', 'QuotaExceededError'); this.data.set(k, v) }
  removeItem(k: string) { this.data.delete(k) }
  clear() { this.data.clear() }
}
const mem = new MemStorage()
// Object.keys(localStorage) is used by resetLocalData
const proxy = new Proxy(mem, { ownKeys: () => [...mem.data.keys()], getOwnPropertyDescriptor: (t, k) => (mem.data.has(String(k)) ? { enumerable: true, configurable: true, value: 1 } : Reflect.getOwnPropertyDescriptor(t, k)) })
vi.stubGlobal('localStorage', proxy)

const { KEYS, stores, validateProfile, validateSaved, parseEnvelope, migrateLegacy, resetLocalData, readStored, writeStored, DEMO_PROFILE } = await import('./storage')
const { toggleSaved } = await import('./saved')

const target = { id: 'octo~repo~7', repository: 'octo/repo', number: 7, title: 'Fix the thing', url: 'https://github.com/octo/repo/issues/7' }

beforeEach(() => { mem.failWrites = false; mem.data.clear(); resetLocalData() })

describe('versioned storage', () => {
  it('round-trips a value', () => {
    expect(writeStored('cf:v1:x', { a: 1 })).toBe(true)
    expect(readStored('cf:v1:x', (r) => r as { a: number }, { a: 0 })).toEqual({ a: 1 })
  })
  it.each([null, '', '{bad json', 'null', '"str"', JSON.stringify({ v: 0, data: [] }), JSON.stringify({ v: 2, data: [] }), JSON.stringify({ data: [] })])('falls back on %s', (raw) => {
    expect(parseEnvelope(raw, validateSaved)).toBeNull()
  })
  it('does not crash the store on corrupted storage', () => {
    mem.data.set(KEYS.saved, '{oops')
    mem.data.set(KEYS.profile, JSON.stringify({ v: 1, data: 'not an object' }))
    expect(stores.saved.get()).toEqual([])
    expect(stores.profile.get()).toBeNull()
  })
})

describe('profile validation', () => {
  it('sanitises arrays, level and types', () => {
    const p = validateProfile({ skills: ['React', 3, '', 'React', 'x'.repeat(100)], preferredLanguages: 'nope', experienceLevel: 'wizard', timeCommitment: 5 })
    expect(p).toMatchObject({ skills: ['React'], preferredLanguages: [], experienceLevel: 'beginner', timeCommitment: '' })
  })
  it('persists and reloads preferences', () => {
    stores.profile.set(DEMO_PROFILE)
    expect(stores.profile.get()).toEqual(DEMO_PROFILE)
    expect(JSON.parse(mem.data.get(KEYS.profile)!).v).toBe(1)
  })
})

describe('saved issues', () => {
  it('saves, survives a reload, and removes', () => {
    toggleSaved(target)
    expect(stores.saved.get().map((i) => i.id)).toEqual([target.id])
    stores.saved.refresh() // simulate reload: re-read from storage only
    expect(stores.saved.get()[0]).toMatchObject({ title: 'Fix the thing', url: target.url })
    toggleSaved(target)
    expect(stores.saved.get()).toEqual([])
    expect(validateSaved(JSON.parse(mem.data.get(KEYS.saved)!).data)).toEqual([])
  })
  it('keeps newest first and never duplicates', () => {
    toggleSaved(target)
    toggleSaved({ ...target, id: 'octo~repo~8', number: 8 })
    expect(stores.saved.get().map((i) => i.number)).toEqual([8, 7])
  })
  it('drops malformed or unsafe entries', () => {
    const out = validateSaved([{ ...target, savedAt: 1 }, { ...target }, { id: 'bad', repository: 'a/b', number: 1, title: 't', url: 'https://x' }, { ...target, id: 'a~b~1', url: 'javascript:alert(1)' }, 5, null])
    expect(out?.map((i) => i.id)).toEqual([target.id])
  })
})

describe('write failures', () => {
  it('keeps the session usable in memory and reports the error', () => {
    mem.failWrites = true
    toggleSaved(target)
    expect(stores.saved.get().map((i) => i.id)).toEqual([target.id])
    expect(mem.data.has(KEYS.saved)).toBe(false)
  })
})

describe('legacy migration and reset', () => {
  it('imports pre-versioned keys once and removes them', () => {
    mem.data.set('cf.profile', JSON.stringify({ skills: ['Go'], preferredLanguages: ['Go'], experienceLevel: 'advanced' }))
    migrateLegacy()
    expect(mem.data.has('cf.profile')).toBe(false)
    expect(stores.profile.get()).toMatchObject({ skills: ['Go'], experienceLevel: 'advanced' })
  })
  it('resets only the requested store', () => {
    stores.profile.set(DEMO_PROFILE)
    toggleSaved(target)
    resetLocalData(['profile'])
    expect(stores.profile.get()).toBeNull()
    expect(stores.saved.get()).toHaveLength(1)
  })
  it('resets everything, including caches', () => {
    stores.profile.set(DEMO_PROFILE)
    toggleSaved(target)
    mem.data.set('cf.gh.search.x', '{}')
    resetLocalData()
    expect(stores.profile.get()).toBeNull()
    expect(stores.saved.get()).toEqual([])
    expect([...mem.data.keys()]).toEqual([])
  })
})
