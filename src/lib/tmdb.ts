import { TMDB_BASE, IMG_BASE } from './constants'
import { tmdbCredential } from './env'
import { cacheGet, cacheSet } from './cache'
import { slug, titleOf, year } from './utils'
import type {
  CastMember,
  CrewMember,
  MovieDetail,
  PersonCredit,
  PersonDetail,
  ResultsPage,
  TitleMeta,
  TmdbGenre,
  TmdbPoster,
  TmdbVideo,
  TvDetail,
  TvSeason,
  MediaType,
} from './types'

export class TmdbError extends Error {
  code: number
  constructor(message: string, code = 0) {
    super(message)
    this.name = 'TmdbError'
    this.code = code
  }
}

export const HOUR = 3_600_000

const inflight = new Map<string, Promise<unknown>>()

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    usp.set(k, String(v))
  }
  const cred = tmdbCredential()
  if (cred?.mode === 'v3') usp.set('api_key', cred.value)
  return usp.toString()
}

function headers(): Record<string, string> {
  const cred = tmdbCredential()
  if (cred?.mode === 'v4') return { Authorization: `Bearer ${cred.value}` }
  return {}
}

interface RequestOptions {
  ttl?: number
  signal?: AbortSignal
  /** skip the localStorage layer (search queries, anything one-shot) */
  nocache?: boolean
}

async function request<T>(path: string, params: Record<string, unknown> = {}, opts: RequestOptions = {}): Promise<T> {
  const { ttl = HOUR, signal, nocache } = opts
  const key = path + '?' + JSON.stringify(params)

  if (!nocache) {
    const hit = cacheGet<T>(key)
    if (hit && !hit.stale) return hit.value
  }

  const running = inflight.get(key) as Promise<T> | undefined
  if (running) return running

  const promise = (async () => {
    const url = `${TMDB_BASE}${path}?${qs(params as Record<string, string | number | boolean | undefined | null>)}`
    let lastError: TmdbError | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { headers: headers(), signal })
        if (res.status === 429 || res.status >= 500) {
          lastError = new TmdbError(`TMDB is busy (${res.status})`, res.status)
          await wait(320 * (attempt + 1))
          continue
        }
        if (!res.ok) {
          throw new TmdbError(`TMDB replied ${res.status} for ${path}`, res.status)
        }
        const json = (await res.json()) as T
        if (json && typeof json === 'object' && (json as { success?: boolean }).success === false) {
          throw new TmdbError('TMDB rejected the request — check the API key on the Settings page.', 401)
        }
        if (!nocache && ttl > 0) cacheSet(key, json, ttl)
        return json
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err
        lastError = err instanceof TmdbError ? err : new TmdbError((err as Error).message || 'Network error')
        if (lastError.code === 401 || lastError.code === 404) throw lastError
      }
    }
    // serve stale rather than nothing
    const stale = cacheGet<T>(key)
    if (stale) return stale.value
    throw lastError ?? new TmdbError('Request failed')
  })().finally(() => inflight.delete(key))

  inflight.set(key, promise)
  return promise
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ *
 * Home / rails
 * ------------------------------------------------------------------ */

export const trending = (media: 'all' | MediaType = 'all', day = true) =>
  request<ResultsPage>(`/trending/${media}/${day ? 'day' : 'week'}`, { language: 'en-US' }, { ttl: 30 * 60_000 })

export const popular = (type: MediaType, page = 1) =>
  request<ResultsPage>(`/${type}/popular`, { language: 'en-US', page }, { ttl: 2 * HOUR })

export const topRated = (type: MediaType, page = 1) =>
  request<ResultsPage>(`/${type}/top_rated`, { language: 'en-US', page }, { ttl: 6 * HOUR })

export const nowPlaying = (region: string) =>
  request<ResultsPage>(`/movie/now_playing`, { language: 'en-US', region }, { ttl: HOUR })

export const upcoming = (region: string) =>
  request<ResultsPage>(`/movie/upcoming`, { language: 'en-US', region }, { ttl: 6 * HOUR })

export const airToday = () =>
  request<ResultsPage>(`/tv/on_the_air`, { language: 'en-US', page: 1 }, { ttl: HOUR })

export const recommendations = (type: MediaType, id: number) =>
  request<ResultsPage>(`/${type}/${id}/recommendations`, { language: 'en-US' }, { ttl: 6 * HOUR })

export const similar = (type: MediaType, id: number) =>
  request<ResultsPage>(`/${type}/${id}/similar`, { language: 'en-US' }, { ttl: 6 * HOUR })

/* ------------------------------------------------------------------ *
 * Browsing / search
 * ------------------------------------------------------------------ */

export interface DiscoverParams {
  genre?: number
  yearFrom?: number
  yearTo?: number
  provider?: number
  minVotes?: number
  language?: string
  country?: string
  sort?: string
  page?: number
  withRuntimeGte?: number
  withRuntimeLte?: number
  /** TV only — filter to a network id */
  network?: number
}

export function discover(type: MediaType, p: DiscoverParams, opts: RequestOptions = {}) {
  const dated =
    p.yearFrom || p.yearTo
      ? type === 'movie'
        ? {
            'primary_release_date.gte': p.yearFrom ? `${p.yearFrom}-01-01` : undefined,
            'primary_release_date.lte': p.yearTo ? `${p.yearTo}-12-31` : undefined,
          }
        : {
            'first_air_date.gte': p.yearFrom ? `${p.yearFrom}-01-01` : undefined,
            'first_air_date.lte': p.yearTo ? `${p.yearTo}-12-31` : undefined,
          }
      : {}

  return request<ResultsPage>(
    `/discover/${type}`,
    {
      language: 'en-US',
      page: p.page ?? 1,
      sort_by: p.sort ?? 'popularity.desc',
      include_adult: false,
      with_genres: p.genre || undefined,
      'vote_count.gte': p.minVotes ?? (p.sort?.startsWith('vote') ? 250 : undefined),
      with_original_language: p.language || undefined,
      with_watch_providers: p.provider,
      watch_region: p.provider ? p.country : undefined,
      with_networks: p.network,
      with_runtime_gte: p.withRuntimeGte,
      with_runtime_lte: p.withRuntimeLte,
      ...dated,
    },
    { ttl: 30 * 60_000, ...opts },
  )
}

export function searchMulti(query: string, page = 1, withAdult = false) {
  return request<ResultsPage>(
    '/search/multi',
    {
      query,
      language: 'en-US',
      page,
      include_adult: withAdult,
    },
    { ttl: 10 * 60_000, nocache: page > 1 },
  )
}

export function searchType(type: MediaType, query: string, page = 1) {
  return request<ResultsPage>(`/search/${type}`, { query, language: 'en-US', page }, { ttl: 10 * 60_000 })
}

export function searchPeople(query: string) {
  return request<ResultsPage>('/search/person', { query, language: 'en-US', page: 1 }, { ttl: 6 * HOUR })
}

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

export const movieAppend =
  'credits,reviews,images,external_ids,keywords,content_ratings,alternative_titles,release_dates,videos,watch/providers,recommendations,similar'

export const tvAppend =
  'credits,videos,images,external_ids,keywords,content_ratings,alternative_titles,recommendations,similar,watch/providers'

export function movie(id: number, region: string) {
  return request<MovieDetail>(`/movie/${id}`, {
    language: 'en-US',
    append_to_response: movieAppend,
    watch_region: region,
    include_image_language: 'en,null,mul',
  })
}

export function tv(id: number, region: string) {
  return request<TvDetail>(`/tv/${id}`, {
    language: 'en-US',
    append_to_response: tvAppend,
    watch_region: region,
    include_image_language: 'en,null,mul',
  })
}

export function season(id: number, seasonNo: number) {
  return request<TvSeason & { id: number }>(`/tv/${id}/season/${seasonNo}`, { language: 'en-US' }, { ttl: 6 * HOUR })
}

export function episode(id: number, seasonNo: number, epNo: number) {
  return request<Record<string, unknown>>(
    `/tv/${id}/season/${seasonNo}/episode/${epNo}`,
    { language: 'en-US', append_to_response: 'credits,images,videos,external_ids' },
    { ttl: 6 * HOUR },
  )
}

export function person(id: number) {
  return request<PersonDetail>(
    `/person/${id}`,
    { language: 'en-US', append_to_response: 'combined_credits,images,external_ids' },
    { ttl: 6 * HOUR },
  )
}

/** Full credits, paged. This is what backs the "every credit, down to the
 *  second assistant art director" page — TMDB caps a page at 40 rows. */
export async function fullCredits(type: MediaType, id: number, maxPages = 6) {
  const key = `/credits-all-${type}-${id}`
  const cached = cacheGet<{ cast: CastMember[]; crew: CrewMember[] }>(key)
  if (cached && !cached.stale) return cached.value
  const first = await request<{ cast: CastMember[]; crew: CrewMember[]; page: number; total_pages: number }>(
    `/${type}/${id}/credits`,
    { language: 'en-US' },
    { ttl: 24 * HOUR },
  )
  const cast = [...first.cast]
  const crew = [...first.crew]
  const pages = Math.min(first.total_pages || 1, maxPages)
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        request<{ cast: CastMember[]; crew: CrewMember[] }>(`/${type}/${id}/credits`, {
          language: 'en-US',
          page: i + 2,
        }).catch(() => ({ cast: [], crew: [] })),
      ),
    )
    for (const r of rest) {
      cast.push(...r.cast)
      crew.push(...r.crew)
    }
  }
  const out = { cast, crew }
  cacheSet(key, out, 24 * HOUR)
  return out
}

/** Just the videos — used by the hero carousel, which needs a trailer for
 *  every slide but has no business downloading a full credits payload. */
export const videosOnly = (type: MediaType, id: number) =>
  request<{ id: number; results: TmdbVideo[] }>(`/${type}/${id}/videos`, { language: 'en-US' }, { ttl: 12 * HOUR })

/* ------------------------------------------------------------------ *
 * Trailers
 * ------------------------------------------------------------------ */

export interface Trailer {
  key: string
  name: string
  type: string
  official: boolean
  site: string
}

/** Highest-signal YouTube video we can use as a background loop. */
export function pickTrailer(videos?: { results?: TmdbVideo[] }, prefer4k = false): Trailer | null {
  const list = videos?.results?.filter((v) => v.site === 'YouTube') ?? []
  if (!list.length) return null
  const rank = (v: TmdbVideo) => {
    let score = 0
    if (v.type === 'Trailer') score += 100
    else if (v.type === 'Teaser') score += 60
    else if (v.type === 'Clip') score += 20
    if (v.official) score += 25
    if (prefer4k && v.size >= 2160) score += 12
    if (v.key && /^[a-zA-Z0-9_-]{11}$/.test(v.key)) score += 5
    score -= Math.min(20, ageInYears(v.published_at) * 2)
    return score
  }
  const best = [...list].sort((a, b) => rank(b) - rank(a))[0]
  return { key: best.key, name: best.name, type: best.type, official: best.official, site: best.site }
}

function ageInYears(iso: string): number {
  const then = Date.parse(iso || '')
  if (!then) return 5
  return (Date.now() - then) / (365 * 24 * HOUR)
}

export function trailerUrl(trailer: Trailer, opts: { autoplay?: boolean; mute?: boolean; start?: number } = {}): string {
  const p = new URLSearchParams({
    autoplay: opts.autoplay === false ? '0' : '1',
    mute: opts.mute === false ? '0' : '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    disablekb: '1',
    iv_load_policy: '3',
    fs: '0',
    loop: '1',
    enablejsapi: '1',
    origin: typeof location !== 'undefined' ? location.origin : '',
    playlist: trailer.key,
    color: 'white',
  })
  if (opts.start) p.set('start', String(Math.floor(opts.start)))
  return `https://www.youtube-nocookie.com/embed/${trailer.key}?${p}`
}

/** YouTube embeds can fail (rights, region, embed disabled). Backdrop is the
 *  fallback, and it is what we show on metered connections. */
export function backdropUrl(path?: string | null, size = 'w1280'): string {
  return path ? `${IMG_BASE}/${size}${path}` : ''
}

export const posterUrl = (path?: string | null, size = 'w500') => (path ? `${IMG_BASE}/${size}${path}` : '')

/* ------------------------------------------------------------------ *
 * IMDb ratings (optional, via OMDb)
 * ------------------------------------------------------------------ */

export async function imdbRating(imdbId?: string | null): Promise<{ rating: string; votes: string } | null> {
  const key = import.meta.env.VITE_OMDB_KEY?.trim()
  if (!key || !imdbId) return null
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`)
    if (!res.ok) return null
    const json = (await res.json()) as { imdbRating?: string; imdbVotes?: string; Response?: string }
    if (json.Response === 'False' || !json.imdbRating || json.imdbRating === 'N/A') return null
    return { rating: json.imdbRating, votes: json.imdbVotes ?? '' }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ *
 * Normalising
 * ------------------------------------------------------------------ */

export function toMeta(item: TmdbPoster | MovieDetail | TvDetail): TitleMeta {
  const isMovie = !('name' in item && item.name)
  return {
    id: item.id,
    type: (item.media_type as MediaType) || (isMovie ? 'movie' : 'tv'),
    title: titleOf(item),
    poster: item.poster_path ?? null,
    backdrop: item.backdrop_path ?? null,
    year: year(item.release_date ?? item.first_air_date ?? ''),
    rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
  }
}

export const hrefFor = (type: MediaType, id: number, title?: string) =>
  `/${type}/${id}${title ? '/' + slug(title) : ''}`

export function genresOf(item: { genres?: TmdbGenre[]; genre_ids?: number[] }, all: TmdbGenre[] = []): string[] {
  if (item.genres?.length) return item.genres.map((g) => g.name)
  if (item.genre_ids?.length) {
    return item.genre_ids.map((id) => all.find((g) => g.id === id)?.name).filter((n): n is string => !!n)
  }
  return []
}

export function personCreditToMeta(c: PersonCredit): TitleMeta {
  return {
    id: c.id,
    type: c.media_type,
    title: c.title || c.name || c.original_title || 'Untitled',
    poster: c.poster_path,
    backdrop: c.backdrop_path ?? null,
    year: year(c.release_date ?? c.first_air_date ?? ''),
    rating: c.vote_average ?? null,
  }
}
