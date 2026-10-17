/* Priva's own state: My List, watch progress, collections, ratings, prefs.
 *
 * Everything is written to localStorage first (so the site works signed out,
 * offline, and on the next paint), then mirrored to Firestore under
 * `users/{uid}/data/*` when someone is signed in. Nothing here knows about
 * React — see hooks/useStore.ts for that. */

import { DEFAULT_PREFS, LS } from './constants'
import { storageGet, storageSet, uid } from './utils'
import { patchPrefs, readCloud, trimProgress, writeBucket } from './firestore'
import type { Bucket, CloudData } from './firestore'
import type { Collection, MediaType, PlayerSource, PrivaPrefs, TitleMeta, WatchProgress } from './types'

export interface UserData {
  myList: number[]
  myListMeta: Record<string, TitleMeta>
  progress: Record<string, WatchProgress>
  collections: Collection[]
  rated: Record<string, { type: MediaType; score: number; at: number }>
  recentSearches: string[]
}

export const EMPTY_USER: UserData = {
  myList: [],
  myListMeta: {},
  progress: {},
  collections: [],
  rated: {},
  recentSearches: [],
}

export type SyncState = 'device' | 'saving' | 'saved' | 'error'

export type CloudTarget = { kind: 'device'; label: string } | { kind: 'user'; uid: string; email?: string | null }

export interface Snapshot {
  data: UserData
  prefs: PrivaPrefs
  sync: SyncState
  bound: CloudTarget | null
  deviceId: string
  hydrated: boolean
  lastSyncAt: number
}

const listeners = new Set<() => void>()
const dirty = new Set<Bucket>()
let flushTimer: ReturnType<typeof setTimeout> | undefined
let flushing = false

function readLocalData(): UserData {
  return { ...EMPTY_USER, ...storageGet<Partial<UserData>>(LS.local, {}) }
}

function readLocalPrefs(): PrivaPrefs {
  return { ...DEFAULT_PREFS, ...storageGet<Partial<PrivaPrefs>>(LS.prefs, {}) }
}

function readDeviceId(): string {
  let id = storageGet<string>(LS.device, '')
  if (!id) {
    id = uid(12)
    storageSet(LS.device, id)
  }
  return id
}

let snapshot: Snapshot = {
  data: readLocalData(),
  prefs: readLocalPrefs(),
  sync: 'device',
  bound: null,
  deviceId: readDeviceId(),
  hydrated: false,
  lastSyncAt: 0,
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSnapshot(): Snapshot {
  return snapshot
}

function emit(): void {
  for (const fn of listeners) fn()
}

function set(patch: Partial<Snapshot>): void {
  snapshot = { ...snapshot, ...patch }
  emit()
}

/** The one place user data changes: write local, flag the cloud bucket, hand
 *  React a fresh object identity. */
function mutate(fn: (draft: UserData) => UserData): void {
  const next = fn({ ...snapshot.data })
  storageSet(LS.local, next)
  set({ data: next })
}

function touch(bucket: Bucket): void {
  dirty.add(bucket)
  if (snapshot.bound?.kind !== 'user') return
  set({ sync: 'saving' })
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = undefined
    void flushCloud()
  }, 900)
}

export async function flushCloud(): Promise<void> {
  if (flushing || !dirty.size) return
  if (snapshot.bound?.kind !== 'user') {
    dirty.clear()
    return
  }
  flushing = true
  const uidStr = snapshot.bound.uid
  const buckets = [...dirty]
  dirty.clear()
  let ok = true
  for (const bucket of buckets) {
    const payload = payloadFor(bucket)
    if (!payload) continue
    const wrote = bucket === 'prefs' ? await patchPrefs(uidStr, payload as Record<string, unknown>) : await writeBucket(uidStr, bucket, payload)
    if (!wrote) ok = false
  }
  flushing = false
  set({ sync: ok ? 'saved' : 'error', lastSyncAt: ok ? Date.now() : snapshot.lastSyncAt })
  if (dirty.size) void flushCloud()
}

function payloadFor(bucket: Bucket): unknown {
  const d = snapshot.data
  switch (bucket) {
    case 'prefs':
      return snapshot.prefs
    case 'mylist':
      return { ids: d.myList, meta: d.myListMeta }
    case 'progress':
      return { items: trimProgress(d.progress) }
    case 'collections':
      return { items: d.collections }
    case 'rated':
      return { items: d.rated }
    case 'searches':
      return { items: d.recentSearches }
  }
}

/* ---------------- binding to an account ---------------- */

export async function bindCloud(target: CloudTarget): Promise<void> {
  if (target.kind !== 'user') {
    set({ bound: target, hydrated: true, sync: 'device', data: readLocalData(), prefs: readLocalPrefs() })
    return
  }
  set({ bound: target, sync: 'saving' })
  const remote: CloudData & { found: boolean } = await readCloud(target.uid)
  const merged = mergeInto(snapshot.data, remote)
  const prefs = remote.prefs?.value ? { ...DEFAULT_PREFS, ...(remote.prefs.value as Partial<PrivaPrefs>) } : snapshot.prefs
  storageSet(LS.local, merged)
  storageSet(LS.prefs, prefs)
  set({ data: merged, prefs, bound: target, hydrated: true, sync: 'saved', lastSyncAt: Date.now() })
  for (const bucket of ['prefs', 'mylist', 'progress', 'collections', 'rated', 'searches'] as Bucket[]) dirty.add(bucket)
  await flushCloud()
}

export function unbindCloud(): void {
  set({ bound: null, sync: 'device', data: readLocalData(), prefs: readLocalPrefs() })
}

function mergeInto(local: UserData, remote: CloudData & { found?: boolean }): UserData {
  if (!remote.found) return local
  const out: UserData = { ...local }

  const remoteIds = remote.myList?.ids ?? []
  const seen = new Set(remoteIds)
  out.myList = [...remoteIds, ...local.myList.filter((id) => !seen.has(id))]
  out.myListMeta = { ...local.myListMeta, ...(remote.myList?.meta as Record<string, TitleMeta>) }

  const progress: Record<string, WatchProgress> = { ...local.progress }
  for (const [key, value] of Object.entries(remote.progress?.items ?? {})) {
    const mine = progress[key]
    if (!mine || value.updatedAt > mine.updatedAt) progress[key] = value
  }
  out.progress = progress

  const collections: Collection[] = [...(remote.collections?.items ?? [])]
  for (const mine of local.collections) {
    const byId = collections.findIndex((c) => c.id === mine.id)
    if (byId >= 0) {
      collections[byId] = { ...collections[byId], items: mergeItems(collections[byId].items, mine.items) }
      continue
    }
    const byName = collections.findIndex((c) => c.name.trim().toLowerCase() === mine.name.trim().toLowerCase())
    if (byName >= 0) {
      collections[byName] = { ...collections[byName], items: mergeItems(collections[byName].items, mine.items) }
      continue
    }
    collections.push(mine)
  }
  out.collections = collections

  out.rated = { ...local.rated, ...(remote.rated?.items ?? {}) }
  out.recentSearches = [...new Set([...(remote.searches?.items ?? []), ...local.recentSearches])].slice(0, 12)
  return out
}

function mergeItems(a: TitleMeta[], b: TitleMeta[]): TitleMeta[] {
  const out = [...a]
  for (const item of b) if (!out.some((x) => x.id === item.id && x.type === item.type)) out.push(item)
  return out
}

/* ---------------- My List ---------------- */

export const inMyList = (id: number): boolean => snapshot.data.myList.includes(id)

export function toggleMyList(meta: TitleMeta): boolean {
  const key = `${meta.type}:${meta.id}`
  const added = !snapshot.data.myList.includes(meta.id)
  mutate((d) => {
    const myListMeta = { ...d.myListMeta }
    if (added) myListMeta[key] = meta
    else delete myListMeta[key]
    return {
      ...d,
      myList: added ? [meta.id, ...d.myList] : d.myList.filter((id) => id !== meta.id),
      myListMeta,
    }
  })
  touch('mylist')
  return added
}

export function removeFromMyList(id: number): void {
  mutate((d) => {
    const myListMeta = { ...d.myListMeta }
    for (const k of Object.keys(myListMeta)) if (k.endsWith(`:${id}`)) delete myListMeta[k]
    return { ...d, myList: d.myList.filter((x) => x !== id), myListMeta }
  })
  touch('mylist')
}

/* ---------------- watch progress ---------------- */

export const progressKey = (type: MediaType, id: number, season?: number, episode?: number): string =>
  type === 'tv' && season ? `${type}:${id}:s${season}e${episode ?? 0}` : `${type}:${id}`

export function saveProgress(input: {
  id: number
  type: MediaType
  title?: string
  poster?: string | null
  backdrop?: string | null
  progress?: number
  timestamp?: number
  duration?: number
  season?: number
  episode?: number
  episodeName?: string
  source?: PlayerSource
}): void {
  if (!input.id) return
  const key = progressKey(input.type, input.id, input.season, input.episode)
  mutate((d) => {
    const prev = d.progress[key]
    const next: WatchProgress = {
      id: input.id,
      type: input.type,
      title: input.title ?? prev?.title ?? 'Untitled',
      poster: input.poster ?? prev?.poster ?? null,
      backdrop: input.backdrop ?? prev?.backdrop ?? null,
      progress: input.progress ?? prev?.progress ?? 0,
      timestamp: input.timestamp ?? prev?.timestamp ?? 0,
      duration: input.duration ?? prev?.duration ?? 0,
      season: input.season ?? prev?.season,
      episode: input.episode ?? prev?.episode,
      episodeName: input.episodeName ?? prev?.episodeName,
      source: input.source ?? prev?.source ?? snapshot.prefs.defaultSource,
      updatedAt: Date.now(),
    }
    return { ...d, progress: { ...d.progress, [key]: next } }
  })
  touch('progress')
}

export function clearProgress(key: string): void {
  mutate((d) => {
    const progress = { ...d.progress }
    delete progress[key]
    return { ...d, progress }
  })
  touch('progress')
}

export function clearAllProgress(): void {
  mutate((d) => ({ ...d, progress: {} }))
  touch('progress')
}

export function resumePoint(type: MediaType, id: number, season?: number, episode?: number): WatchProgress | undefined {
  return snapshot.data.progress[progressKey(type, id, season, episode)]
}

/* ---------------- collections ---------------- */

export function createCollection(name: string, description = '', accent = DEFAULT_PREFS.accent): Collection {
  const now = Date.now()
  const col: Collection = { id: uid(9), name: name.trim() || 'Untitled', description: description.trim(), accent, items: [], createdAt: now, updatedAt: now }
  mutate((d) => ({ ...d, collections: [col, ...d.collections] }))
  touch('collections')
  return col
}

export function updateCollection(id: string, patch: Partial<Omit<Collection, 'id'>>): void {
  mutate((d) => ({
    ...d,
    collections: d.collections.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
  }))
  touch('collections')
}

export function deleteCollection(id: string): void {
  mutate((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) }))
  touch('collections')
}

export function toggleInCollection(id: string, meta: TitleMeta): boolean {
  const col = snapshot.data.collections.find((c) => c.id === id)
  const has = !!col?.items.some((x) => x.id === meta.id && x.type === meta.type)
  mutate((d) => ({
    ...d,
    collections: d.collections.map((c) =>
      c.id === id
        ? {
            ...c,
            items: has ? c.items.filter((x) => !(x.id === meta.id && x.type === meta.type)) : [...c.items, meta],
            updatedAt: Date.now(),
          }
        : c,
    ),
  }))
  touch('collections')
  return !has
}

export function removeFromCollection(id: string, meta: TitleMeta): void {
  mutate((d) => ({
    ...d,
    collections: d.collections.map((c) =>
      c.id === id
        ? { ...c, items: c.items.filter((x) => !(x.id === meta.id && x.type === meta.type)), updatedAt: Date.now() }
        : c,
    ),
  }))
  touch('collections')
}

export function moveCollectionItem(collectionId: string, meta: TitleMeta, direction: -1 | 1): void {
  mutate((d) => ({
    ...d,
    collections: d.collections.map((c) => {
      if (c.id !== collectionId) return c
      const items = [...c.items]
      const i = items.findIndex((x) => x.id === meta.id && x.type === meta.type)
      const j = i + direction
      if (i < 0 || j < 0 || j >= items.length) return c
      const tmp = items[i]
      items[i] = items[j]
      items[j] = tmp
      return { ...c, items, updatedAt: Date.now() }
    }),
  }))
  touch('collections')
}

/* ---------------- ratings ---------------- */

export function rateTitle(meta: TitleMeta, score: number): void {
  const key = `${meta.type}:${meta.id}`
  mutate((d) => {
    const rated = { ...d.rated }
    if (score <= 0) delete rated[key]
    else rated[key] = { type: meta.type, score, at: Date.now() }
    return { ...d, rated }
  })
  touch('rated')
}

/* ---------------- search history ---------------- */

export function rememberSearch(term: string): void {
  const clean = term.trim()
  if (clean.length < 2) return
  mutate((d) => ({
    ...d,
    recentSearches: [clean, ...d.recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 12),
  }))
  touch('searches')
}

export function forgetSearches(): void {
  mutate((d) => ({ ...d, recentSearches: [] }))
  touch('searches')
}

/* ---------------- settings surface ---------------- */

export function setPrefs(patch: Partial<PrivaPrefs>): void {
  const prefs = { ...snapshot.prefs, ...patch }
  storageSet(LS.prefs, prefs)
  set({ prefs })
  touch('prefs')
}

export function exportData(): string {
  return JSON.stringify({ app: 'priva', version: 1, exportedAt: new Date().toISOString(), prefs: snapshot.prefs, ...snapshot.data }, null, 2)
}

export function resetEverything(): void {
  storageSet(LS.local, EMPTY_USER)
  mutate(() => ({ ...EMPTY_USER }))
  for (const bucket of ['mylist', 'progress', 'collections', 'rated', 'searches'] as Bucket[]) dirty.add(bucket)
  void flushCloud()
}
