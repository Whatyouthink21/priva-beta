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

/* how much of the quota the cache is using right now. Kept in memory so a
 * write does not have to walk the whole of localStorage every time. */
let bytes = 0
let sized = false

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
    const raw = JSON.stringify(entry)
    const old = localStorage.getItem(PREFIX + key)
    if (old !== null) bytes -= old.length + key.length
    localStorage.setItem(PREFIX + key, raw)
    bytes += raw.length + key.length
    if (bytes > MAX_BYTES) pruneIfNeeded()
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
    bytes = 0
    sized = true
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
  let total = bytes
  const keys: string[] = []
  if (!sized) {
    // first run in this session: measure what is already on the device
    total = 0
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX)) continue
      keys.push(k)
      total += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
    bytes = total
    sized = true
  }
  if (total < MAX_BYTES) return
  const all = keys.length ? keys : Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
  // Oldest-expiry first: the least likely to be useful again.
  all.sort((a, b) => {
    const ea = safeExp(a)
    const eb = safeExp(b)
    return ea - eb
  })
  const dropCount = Math.ceil(all.length * 0.4)
  for (let i = 0; i < dropCount; i++) {
    const raw = localStorage.getItem(all[i])
    localStorage.removeItem(all[i])
    bytes -= (raw?.length ?? 0) + all[i].length
  }
  if (bytes < 0) bytes = 0
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
  bytes = 0
  sized = true
}
