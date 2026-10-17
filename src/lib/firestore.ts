/* ------------------------------------------------------------------ *
 * The storage API the rest of Priva talks to. This file is deliberately
 * cheap: it holds the shapes and the pure helpers, and forwards anything
 * that needs the Firestore SDK to ./sdk.ts through the lazy loader in
 * ./firebase.ts. Callers can therefore `await writeBucket(...)` without
 * caring whether the heavy chunk has arrived yet.
 *
 * Firestore layout — one document per "bucket" under the user:
 *
 *   users/{uid}/data/prefs | mylist | progress | collections | rated | searches
 *   users/{uid}/devices/{deviceId}
 * ------------------------------------------------------------------ */
import { firebaseImpl } from './firebase'
import type { Collection, WatchProgress } from './types'

export type Bucket = 'prefs' | 'mylist' | 'progress' | 'collections' | 'rated' | 'searches'

export interface CloudData {
  prefs?: { value: Record<string, unknown>; updatedAt?: number }
  myList?: { ids: number[]; meta: Record<string, unknown>; updatedAt?: number }
  progress?: { items: Record<string, WatchProgress>; updatedAt?: number }
  collections?: { items: Collection[]; updatedAt?: number }
  rated?: { items: Record<string, { type: 'movie' | 'tv'; score: number; at: number }>; updatedAt?: number }
  searches?: { items: string[]; updatedAt?: number }
}

/** Priva only keeps the tail of a long history — 80 rows is a generous
 *  "Continue watching" list and stays well under the 1 MiB document limit. */
const MAX_PROGRESS = 80
export function trimProgress(items: Record<string, WatchProgress>): Record<string, WatchProgress> {
  const entries = Object.entries(items)
  if (entries.length <= MAX_PROGRESS) return items
  const sorted = entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
  return Object.fromEntries(sorted.slice(0, MAX_PROGRESS))
}

export async function readCloud(uid: string): Promise<CloudData & { found: boolean }> {
  const sdk = await firebaseImpl()
  if (!sdk) return { found: false }
  return sdk.readCloud(uid)
}

export async function writeBucket(uid: string, bucket: Bucket, payload: unknown): Promise<boolean> {
  const sdk = await firebaseImpl()
  if (!sdk) return false
  return sdk.writeBucket(uid, bucket, payload)
}

export async function patchPrefs(uid: string, value: Record<string, unknown>): Promise<boolean> {
  const sdk = await firebaseImpl()
  if (!sdk) return false
  return sdk.patchPrefs(uid, value)
}

export async function writeProfile(
  uid: string,
  profile: { displayName?: string | null; email?: string | null; photoURL?: string | null; bio?: string },
): Promise<void> {
  const sdk = await firebaseImpl()
  if (!sdk) return
  await sdk.writeProfile(uid, profile)
}

export async function touchDevice(uid: string, deviceId: string, label?: string): Promise<void> {
  const sdk = await firebaseImpl()
  if (!sdk) return
  await sdk.touchDevice(uid, deviceId, label)
}

export async function listDevices(uid: string): Promise<{ id: string; name: string; seenAt: number }[]> {
  const sdk = await firebaseImpl()
  if (!sdk) return []
  return sdk.listDevices(uid)
}

export async function wipeCloud(uid: string): Promise<void> {
  const sdk = await firebaseImpl()
  if (!sdk) return
  await sdk.wipeCloud(uid)
}
