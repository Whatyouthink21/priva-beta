import { progressKey } from './store'
import type { TitleMeta, WatchProgress } from './types'

/* Pure derivations over the user's data. Kept out of components so the same
 * numbers show up in My Priva, the rails on Home and the header badge. */

const DONE = 92

export function continueWatching(progress: Record<string, WatchProgress>): WatchProgress[] {
  return Object.values(progress)
    .filter((p) => p.progress > 1 && p.progress < DONE)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function finishedWatching(progress: Record<string, WatchProgress>): WatchProgress[] {
  return Object.values(progress)
    .filter((p) => p.progress >= DONE)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function inProgress(progress: Record<string, WatchProgress>): WatchProgress[] {
  return Object.values(progress).sort((a, b) => b.updatedAt - a.updatedAt)
}

/** The two most recent distinct titles — that is what "Because you watched"
 *  is built from. */
export function recentSeeds(progress: Record<string, WatchProgress>, myList: number[], meta: Record<string, TitleMeta>): TitleMeta[] {
  const seeds: TitleMeta[] = []
  const push = (item: TitleMeta) => {
    if (!seeds.some((s) => s.id === item.id && s.type === item.type) && seeds.length < 2) seeds.push(item)
  }
  for (const p of Object.values(progress).sort((a, b) => b.updatedAt - a.updatedAt)) {
    push({ id: p.id, type: p.type, title: p.title, poster: p.poster, backdrop: p.backdrop, year: null, rating: null })
    if (seeds.length === 2) break
  }
  if (!seeds.length) {
    for (const id of myList.slice(0, 2)) {
      for (const key of Object.keys(meta)) {
        if (key.endsWith(`:${id}`)) push(meta[key])
      }
    }
  }
  return seeds
}

export function myListItems(ids: number[], meta: Record<string, TitleMeta>): TitleMeta[] {
  const out: TitleMeta[] = []
  for (const id of ids) {
    const hit = Object.values(meta).find((m) => m.id === id)
    if (hit) out.push(hit)
  }
  return out
}

export interface WatchStats {
  titles: number
  series: number
  hours: number
  minutesSaved: number
  lastWatchedAt: number
  streakDays: number
}

export function statsFor(progress: Record<string, WatchProgress>): WatchStats {
  let seconds = 0
  let titles = 0
  let series = 0
  const days = new Set<string>()
  let lastWatchedAt = 0
  for (const p of Object.values(progress)) {
    const watched = (p.progress / 100) * (p.duration || 0)
    seconds += watched
    lastWatchedAt = Math.max(lastWatchedAt, p.updatedAt)
    days.add(new Date(p.updatedAt).toISOString().slice(0, 10))
    if (p.type === 'tv') series++
    else titles++
  }
  return {
    titles,
    series,
    hours: Math.round(seconds / 3600),
    minutesSaved: Math.round(seconds / 60),
    lastWatchedAt,
    streakDays: streak(days),
  }
}

function streak(days: Set<string>): number {
  let n = 0
  const cursor = new Date()
  for (let i = 0; i < 366; i++) {
    const key = cursor.toISOString().slice(0, 10)
    if (days.has(key)) n++
    else if (n > 0 || i > 0) break
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

export const keyFor = progressKey
