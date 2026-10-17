import { useCallback, useRef, useSyncExternalStore } from 'react'
import { getSnapshot, subscribe } from '../lib/store'
import type { Snapshot } from '../lib/store'

/** One subscription for the whole app. The store keeps a stable snapshot
 *  object between writes, so this only re-renders when data changed. */
export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Shallow equality for the small objects the selectors below return. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false
  }
  return true
}

/**
 * Subscribe to one slice of the store.
 *
 * Every card on the page used to re-render whenever anything in the store
 * changed — a progress tick on another title was enough. This keeps the
 * re-render to the component that actually cares.
 */
export function useStoreSelector<T>(selector: (snapshot: Snapshot) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const last = useRef<{ value: T; primed: boolean }>({ value: undefined as never, primed: false })
  const get = useCallback(() => {
    const next = selector(getSnapshot())
    const prev = last.current
    if (prev.primed && isEqual(prev.value, next)) return prev.value
    last.current = { value: next, primed: true }
    return next
  }, [selector, isEqual])
  return useSyncExternalStore(subscribe, get, get)
}
