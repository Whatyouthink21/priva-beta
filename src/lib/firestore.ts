import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { Collection, WatchProgress } from './types'

/* Firestore layout — one document per "bucket" under the user, so a single
 * toggle writes a few hundred bytes instead of the whole account:
 *
 *   users/{uid}/data/prefs
 *   users/{uid}/data/mylist
 *   users/{uid}/data/progress
 *   users/{uid}/data/collections
 *   users/{uid}/data/rated
 *   users/{uid}/devices/{deviceId}
 */

export type Bucket = 'prefs' | 'mylist' | 'progress' | 'collections' | 'rated' | 'searches'

export interface CloudData {
  prefs?: { value: Record<string, unknown>; updatedAt?: number }
  myList?: { ids: number[]; meta: Record<string, unknown>; updatedAt?: number }
  progress?: { items: Record<string, WatchProgress>; updatedAt?: number }
  collections?: { items: Collection[]; updatedAt?: number }
  rated?: { items: Record<string, { type: 'movie' | 'tv'; score: number; at: number }>; updatedAt?: number }
  searches?: { items: string[]; updatedAt?: number }
}

const MAX_PROGRESS = 80

export async function readCloud(uid: string): Promise<CloudData & { found: boolean }> {
  const db = getDb()
  if (!db) return { found: false }
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'data'))
    const out: CloudData & { found: boolean } = { found: snap.size > 0 }
    for (const d of snap.docs) {
      ;(out as unknown as Record<string, unknown>)[d.id] = d.data()
    }
    return out
  } catch (err) {
    console.warn('[priva] could not read from Firestore', err)
    return { found: false }
  }
}

export async function writeBucket(uid: string, bucket: Bucket, payload: unknown): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  try {
    await setDoc(doc(db, 'users', uid, 'data', bucket), { ...(payload as object), updatedAt: Date.now() })
    return true
  } catch (err) {
    console.warn('[priva] cloud write failed (offline?)', err)
    return false
  }
}

export async function patchPrefs(uid: string, value: Record<string, unknown>): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  try {
    await setDoc(doc(db, 'users', uid, 'data', 'prefs'), { value, updatedAt: Date.now() }, { merge: true })
    return true
  } catch (err) {
    console.warn('[priva] prefs write failed', err)
    return false
  }
}

export async function writeProfile(
  uid: string,
  profile: { displayName?: string | null; email?: string | null; photoURL?: string | null; bio?: string },
): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    await setDoc(doc(db, 'users', uid), { ...profile, lastSeenAt: serverTimestamp() }, { merge: true })
  } catch (err) {
    console.warn('[priva] profile write failed', err)
  }
}

export async function touchDevice(uid: string, deviceId: string): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    await setDoc(
      doc(db, 'users', uid, 'devices', deviceId),
      {
        name: deviceName(),
        seenAt: Date.now(),
        at: serverTimestamp(),
      },
      { merge: true },
    )
  } catch {
    /* not important enough to bother the user */
  }
}

export async function listDevices(uid: string): Promise<{ id: string; name: string; seenAt: number }[]> {
  const db = getDb()
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, 'devices'), limit(12)))
    return snap.docs.map((d) => ({ id: d.id, name: String(d.data().name ?? 'device'), seenAt: Number(d.data().seenAt ?? 0) }))
  } catch {
    return []
  }
}

/** Priva only ever keeps the tail of a long history — 80 rows is a generous
 *  "Continue watching" list and keeps the document well under Firestore's
 *  1 MiB limit. */
export function trimProgress(items: Record<string, WatchProgress>): Record<string, WatchProgress> {
  const entries = Object.entries(items)
  if (entries.length <= MAX_PROGRESS) return items
  const sorted = entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
  return Object.fromEntries(sorted.slice(0, MAX_PROGRESS))
}

export async function wipeCloud(uid: string): Promise<void> {
  const db = getDb()
  if (!db) return
  const buckets: Bucket[] = ['prefs', 'mylist', 'progress', 'collections', 'rated', 'searches']
  await Promise.all(buckets.map((b) => deleteDoc(doc(db, 'users', uid, 'data', b)).catch(() => undefined)))
}

function deviceName(): string {
  const ua = navigator.userAgent
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Mac OS X/i.test(ua)
        ? 'macOS'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  return `${browser} · ${os}`
}
