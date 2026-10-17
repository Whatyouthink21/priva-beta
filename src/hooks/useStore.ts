import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe } from '../lib/store'
import type { Snapshot } from '../lib/store'

/** One subscription for the whole app. The store keeps a stable snapshot
 *  object between writes, so this only re-renders when data changed. */
export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
