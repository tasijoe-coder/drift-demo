import { useSyncExternalStore } from 'react'
import { isMuted, setMuted, unlock } from './sfx'

const listeners = new Set<() => void>()
function initialLarge() {
  try { return localStorage.getItem('hx.novel.large-text') === 'true' } catch { return false }
}
let preferences = { large: initialLarge(), muted: isMuted() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const snapshot = () => preferences
function publish(next: typeof preferences) {
  preferences = next
  listeners.forEach(listener => listener())
}
export function useReaderPreferences() {
  return {
    ...useSyncExternalStore(subscribe, snapshot),
    toggleLarge: () => {
      const large = !preferences.large
      try { localStorage.setItem('hx.novel.large-text', String(large)) } catch { /* Session preference. */ }
      publish({ ...preferences, large })
    },
    toggleSound: () => {
      const muted = !preferences.muted
      setMuted(muted)
      publish({ ...preferences, muted })
      if (!muted) void unlock().catch(() => { /* Audio never blocks reading. */ })
    },
  }
}
