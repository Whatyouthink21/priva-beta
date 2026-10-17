/* Route table lives here so that <SmartLink> can warm the exact chunk a
 * hover is about to need. Lazy per route keeps the first paint small —
 * on a phone over 4G that is the difference between "snappy" and not. */

export const routes = {
  home: () => import('./pages/Home'),
  movies: () => import('./pages/Movies'),
  series: () => import('./pages/Series'),
  search: () => import('./pages/Search'),
  movie: () => import('./pages/MovieDetail'),
  tv: () => import('./pages/TvDetail'),
  person: () => import('./pages/Person'),
  collections: () => import('./pages/Collections'),
  my: () => import('./pages/MyPriva'),
  settings: () => import('./pages/Settings'),
  auth: () => import('./pages/Auth'),
  watch: () => import('./pages/Watch'),
  notFound: () => import('./pages/NotFound'),
} as const

type RouteKey = keyof typeof routes

const loaded = new Set<RouteKey>()

function keyFor(path: string): RouteKey | null {
  const p = path.split('?')[0] ?? '/'
  if (p === '/') return 'home'
  if (p.startsWith('/movie/')) return 'movie'
  if (p.startsWith('/tv/')) return 'tv'
  if (p.startsWith('/person/')) return 'person'
  if (p.startsWith('/watch/')) return 'watch'
  if (p.startsWith('/movies')) return 'movies'
  if (p.startsWith('/series')) return 'series'
  if (p.startsWith('/search')) return 'search'
  if (p.startsWith('/collections')) return 'collections'
  if (p.startsWith('/my')) return 'my'
  if (p.startsWith('/settings')) return 'settings'
  if (p.startsWith('/sign')) return 'auth'
  return null
}

/** Fire-and-forget: Vite caches the dynamic import, so the real navigation
 *  later resolves from memory. */
export function prefetch(path: string): void {
  if (typeof window === 'undefined') return
  const key = keyFor(path)
  if (!key || loaded.has(key)) return
  loaded.add(key)
  void routes[key]().catch(() => loaded.delete(key))
}
