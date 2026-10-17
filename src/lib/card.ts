import { titleOf, year } from './utils'
import { hrefFor } from './tmdb'
import type { MediaType, TitleMeta, TmdbPoster } from './types'

/* One card shape for everything Priva displays: TMDB search hits, list rows,
 * and the little metadata snapshots we store in Firestore all collapse into
 * TitleMeta so a card never needs another request to render. */

export interface CardLike extends Partial<TitleMeta>, Partial<TmdbPoster> {
  id: number
}

export const cardHref = hrefFor

export function normalize(item: CardLike): TitleMeta {
  const asTv = item as { name?: string; original_name?: string; first_air_date?: string }
  const guess: MediaType = asTv.name || asTv.original_name || asTv.first_air_date ? 'tv' : 'movie'
  const rawType = item.type ?? item.media_type ?? guess
  // 'person' can ride along on a search hit but it is not a TitleMeta type
  const type: MediaType = rawType === 'tv' ? 'tv' : 'movie'
  return {
    id: item.id,
    type,
    title: item.title ?? item.name ?? titleOf(item as { title?: string; name?: string }),
    poster: item.poster ?? item.poster_path ?? null,
    backdrop: item.backdrop ?? item.backdrop_path ?? null,
    year: item.year ?? year(item.release_date ?? asTv.first_air_date ?? ''),
    rating: item.rating ?? (typeof item.vote_average === 'number' ? Math.round(item.vote_average * 10) / 10 : null),
  }
}

export function normalizeList(items: CardLike[]): TitleMeta[] {
  const seen = new Set<string>()
  const out: TitleMeta[] = []
  for (const item of items) {
    const meta = normalize(item)
    const key = `${meta.type}:${meta.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(meta)
  }
  return out
}

/** A rail can hold movies, series and people. People are not TitleMeta, so
 *  they get their own tiny card. */
export const personHref = (id: number, name?: string) => `/person/${id}${name ? '/' + name.replace(/\s+/g, '-') : ''}`
