/* A tiny TTL cache in localStorage.
 *
 * Why: TMDB is rate limited and slow on a cold mobile connection, and the
 * same 20 titles show up on Home, Movies and a detail page. Entries are kept
 * for an hour (24h for static-ish stuff), and a page renders whatever is
 * cached immediately, then revalidates in the background. */

interface Entry {
  v: unknown
  e: number
}

const MEM = new Map<string, Entry>()
const PREFIX = 'priva.cache.'
const MAX_BYTES = 1_400_000

const HOUR = 3_600_000

export function cacheGet<T>(key: string): { value: T; stale: boolean } | null {
  const hit = MEM.get(key) ?? read(key)
  if (!hit) return null
  MEM.set(key, hit)
  return { value: hit.v as T, stale: hit.e < Date.now() }
}

export function cacheSet(key: string, value: unknown, ttlMs = HOUR): void {
  const entry: Entry = { v: value, e: Date.now() + ttlMs }
  MEM.set(key, entry)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
    pruneIfNeeded()
  } catch {
    // Quota blown — drop half the cache and move on. Not worth failing a page.
    try {
      wipe()
      localStorage.setItem(PREFIX + key, JSON.stringify(entry))
    } catch {
      /* nothing else we can do */
    }
  }
}

export function cacheClear(): number {
  let removed = 0
  try {
    const keys = Object.keys(localStorage)
    for (const k of keys) {
      if (k.startsWith(PREFIX)) {
        localStorage.removeItem(k)
        removed++
      }
    }
    MEM.clear()
  } catch {
    /* ignore */
  }
  return removed
}

export function cacheSize(): number {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).length
  } catch {
    return MEM.size
  }
}

function read(key: string): Entry | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Entry
    if (!parsed || typeof parsed !== 'object' || !('v' in parsed)) return null
    if (parsed.e < Date.now() - 7 * 24 * HOUR) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function pruneIfNeeded(): void {
  let total = 0
  const keys: string[] = []
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(PREFIX)) continue
    keys.push(k)
    total += k.length + (localStorage.getItem(k)?.length ?? 0)
  }
  if (total < MAX_BYTES) return
  // Oldest-expiry first: the least likely to be useful again.
  keys.sort((a, b) => {
    const ea = safeExp(a)
    const eb = safeExp(b)
    return ea - eb
  })
  const dropCount = Math.ceil(keys.length * 0.4)
  for (let i = 0; i < dropCount; i++) localStorage.removeItem(keys[i])
}

function safeExp(fullKey: string): number {
  try {
    return (JSON.parse(localStorage.getItem(fullKey) ?? '{}') as Entry).e ?? 0
  } catch {
    return 0
  }
}

function wipe(): void {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
  MEM.clear()
}
