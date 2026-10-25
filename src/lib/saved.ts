import { stores, useSavedItems, useStorageError, type SavedItem } from './storage'

export interface SaveTarget { id: string; repository: string; number: number; title: string; url: string }

export function toggleSaved(t: SaveTarget) {
  const items = stores.saved.get()
  if (items.some((i) => i.id === t.id)) { stores.saved.set(items.filter((i) => i.id !== t.id)); return }
  const item: SavedItem = { id: t.id, repository: t.repository, number: t.number, title: t.title, url: t.url, savedAt: Date.now() }
  stores.saved.set([item, ...items])
}

export function useSaved() {
  const items = useSavedItems()
  const error = useStorageError()
  return {
    items, ids: items.map((i) => i.id), error,
    isSaved: (id: string) => items.some((i) => i.id === id),
    toggle: toggleSaved,
  }
}
