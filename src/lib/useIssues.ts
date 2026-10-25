import { useCallback, useEffect, useRef, useState } from 'react'
import { getIssue, searchIssues } from './api'
import { ApiError, type DeveloperProfile, type IssueRecommendation } from './types'

type State = { status: 'loading' | 'ready' | 'error'; issues: IssueRecommendation[]; error?: string; fetchedAt?: number }

const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong while loading issues.')

export function useIssues(profile: DeveloperProfile, query: string, sample = false) {
  const [state, setState] = useState<State>({ status: 'loading', issues: [] })
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(profile)
  const force = useRef(false)

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ ...s, status: 'loading', error: undefined }))
    const f = force.current
    force.current = false
    searchIssues(JSON.parse(key), query, ctrl.signal, f, sample)
      .then(({ issues, fetchedAt }) => setState({ status: 'ready', issues, fetchedAt }))
      .catch((e) => { if (!ctrl.signal.aborted) setState({ status: 'error', issues: [], error: msg(e) }) })
    return () => ctrl.abort()
  }, [key, query, tick, sample])

  return { ...state, refresh: useCallback(() => { force.current = true; setTick((t) => t + 1) }, []) }
}

export function useSavedIssues(ids: string[], profile: DeveloperProfile) {
  const [state, setState] = useState<State>({ status: 'loading', issues: [] })
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(profile)
  const idKey = ids.join('|')

  useEffect(() => {
    if (!idKey) { setState({ status: 'ready', issues: [] }); return }
    const ctrl = new AbortController()
    setState((s) => ({ ...s, status: 'loading' }))
    Promise.allSettled(idKey.split('|').map((id) => getIssue(id, JSON.parse(key), ctrl.signal))).then((rs) => {
      if (ctrl.signal.aborted) return
      const issues = rs.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
      const failed = rs.length - issues.length
      setState(failed === rs.length ? { status: 'error', issues, error: 'Could not load your saved issues.' } : { status: 'ready', issues, error: failed ? `${failed} saved issue(s) could not be loaded.` : undefined })
    })
    return () => ctrl.abort()
  }, [idKey, key, tick])

  return { ...state, refresh: useCallback(() => setTick((t) => t + 1), []) }
}

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
