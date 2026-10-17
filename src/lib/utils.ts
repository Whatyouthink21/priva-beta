/* Small helpers. Deliberately hand-rolled instead of pulling in three
 * packages nobody needs. */

export function cn(...parts: (string | false | null | undefined | 0)[]): string {
  let out = ''
  for (const p of parts) {
    if (!p) continue
    out = out ? out + ' ' + p : p
  }
  return out
}

export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}

export function year(date?: string | null): number | null {
  if (!date) return null
  const y = Number(date.slice(0, 4))
  return Number.isFinite(y) && y > 0 ? y : null
}

export function releaseDate(item: { release_date?: string; first_air_date?: string }): string {
  return item.release_date || item.first_air_date || ''
}

export function titleOf(item: { title?: string; name?: string; original_title?: string }): string {
  return item.title || item.name || item.original_title || 'Untitled'
}

export function money(n?: number | null): string {
  if (!n || n <= 0) return '—'
  if (n >= 1e9) return '$' + trim(n / 1e9) + 'B'
  if (n >= 1e6) return '$' + trim(n / 1e6) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + n
}

function trim(n: number): string {
  const s = n.toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

export function runtime(mins?: number | null): string {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return m + 'm'
  return m ? `${h}h ${m}m` : `${h}h`
}

export function secondsToClock(total: number): string {
  if (!Number.isFinite(total) || total < 0) total = 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const pad = (v: number) => (v < 10 ? '0' + v : String(v))
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function ago(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  if (days < 31) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48)
}

/** TMDB gives us relative paths; this turns them into a sized CDN url. */
export function img(path?: string | null, size = 'w500'): string {
  if (!path) return ''
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function pct(n: number): number {
  return clamp(Math.round(n), 0, 100)
}

/** "1 film", "2 films" — the small thing that makes a count read as written. */
export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`
}

export function formatBytes(bytes: number): string {
  if (!bytes) return ''
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return gb.toFixed(2) + ' GB'
  return (bytes / 1024 ** 2).toFixed(0) + ' MB'
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function storageGet<T>(key: string, fallback: T): T {
  try {
    return safeJsonParse(localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}

export function storageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / quota — Priva keeps working in memory only */
  }
}

export function storageDel(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function uid(len = 10): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  const rnd = new Uint32Array(len)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(rnd)
  for (let i = 0; i < len; i++) out += alphabet[(rnd[i] || Math.random() * 4294967296) % alphabet.length]
  return out
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 250) {
  let t: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
  wrapped.cancel = () => t && clearTimeout(t)
  return wrapped
}

export function uniq<T extends string | number>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    const bucket = map.get(k)
    if (bucket) bucket.push(item)
    else map.set(k, [item])
  }
  return map
}
