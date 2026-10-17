import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { useAsync, usePaged } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { setPrefs } from '../lib/store'
import { GENRES, REGIONS } from '../lib/constants'
import { cn } from '../lib/utils'
import { MediaCard } from './MediaCard'
import { ErrorNote, PageHead, SkeletonGrid } from './Bits'
import { ProviderRow } from './Providers'
import { IcChevronDown, IcFilter, IcRefresh, IcTrend } from './icons'
import type { MediaType, TmdbPoster } from '../lib/types'

const SORTS: { id: string; label: string; for: MediaType }[] = [
  { id: 'popularity.desc', label: 'Most watched now', for: 'movie' },
  { id: 'popularity.asc', label: 'Sleepers', for: 'movie' },
  { id: 'vote_average.desc', label: 'Best rated', for: 'movie' },
  { id: 'primary_release_date.desc', label: 'Newest first', for: 'movie' },
  { id: 'revenue.desc', label: 'Biggest grossers', for: 'movie' },
  { id: 'vote_count.desc', label: 'Most votes', for: 'movie' },
  { id: 'popularity.desc', label: 'Most watched now', for: 'tv' },
  { id: 'vote_average.desc', label: 'Best rated', for: 'tv' },
  { id: 'first_air_date.desc', label: 'Newest shows', for: 'tv' },
  { id: 'vote_count.desc', label: 'Most votes', for: 'tv' },
]

const DECADES = [2026, 2025, 2025, 2024, 2020, 2015, 2010, 2000, 1990, 1980, 1970, 1960, 1950]

const LANGS = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'mr', 'bn', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ru', 'pt', 'tr']

export function Browse({ kind }: { kind: MediaType }) {
  const [params, setParams] = useSearchParams()
  const { prefs } = useStore()
  const sentinel = useRef<HTMLDivElement>(null)
  const showFilters = params.get('filters') === '1'

  const view = params.get('view') === 'top10' ? 'top10' : params.get('view') === 'alltime' ? 'alltime' : 'browse'
  const genre = Number(params.get('genre') ?? 0) || undefined
  const provider = Number(params.get('provider') ?? 0) || undefined
  const yearFrom = Number(params.get('year_from') ?? 0) || undefined
  const language = params.get('lang') || undefined
  const minVotes = Number(params.get('minVotes') ?? 0) || undefined
  const sort = params.get('sort') || 'popularity.desc'
  const region = prefs.region

  const patch = useCallback(
    (next: Record<string, string | number | null | undefined>) => {
      const merged = new URLSearchParams(params)
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === undefined || v === '' || v === 0) merged.delete(k)
        else merged.set(k, String(v))
      }
      setParams(merged, { replace: true })
    },
    [params, setParams],
  )

  const { items, loading, error, hasMore, next, reload, page } = usePaged<TmdbPoster>(
    (p) => api.discover(kind, { genre, yearFrom, provider, language, minVotes, sort, country: region, page: p }),
    [kind, genre, yearFrom, provider, language, minVotes, sort, region],
  )

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore || loading) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) next()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, next])

  const genreList = GENRES[kind]
  const anyFilter = !!(genre || provider || yearFrom || language || minVotes)
  const sorts = SORTS.filter((s) => s.for === kind)
  const clearAll = () => patch({ genre: null, year_from: null, lang: null, minVotes: null, provider: null, sort: null })

  return (
    <div className="wrap page">
      <PageHead
        kicker={kind === 'movie' ? 'Feature films' : 'Episodic'}
        title={kind === 'movie' ? 'Movies' : 'Series'}
        lead={
          kind === 'movie'
            ? 'Everything TMDB indexes, filtered how you want it. Pick a provider below and Priva only shows what is actually streaming there this week.'
            : 'Long-form, short-form, dubbed, dropped. Same trailer behind the page, season by season.'
        }
      >
        <div className="tabs" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === 'browse'} onClick={() => patch({ view: null })}>
            Browse
          </button>
          <button role="tab" aria-selected={view === 'top10'} onClick={() => patch({ view: 'top10' })}>
            Top 10 today
          </button>
          <button role="tab" aria-selected={view === 'alltime'} onClick={() => patch({ view: 'alltime' })}>
            All time
          </button>
        </div>
      </PageHead>

      {view !== 'browse' ? <TopBoard kind={kind} mode={view === 'top10' ? 'today' : 'alltime'} region={region} /> : null}

      {view === 'browse' ? (
        <>
          <div className="browse-bar">
            <button
              className={cn('chip', anyFilter && 'is-on')}
              onClick={() => patch({ filters: showFilters ? null : 1 })}
              aria-expanded={showFilters}
            >
              <IcFilter size={14} /> Filters {anyFilter ? '· on' : ''}
              <IcChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            </button>

            <div className="genre-chips no-bar">
              {genreList.slice(0, 10).map((g) => (
                <button
                  key={g.id}
                  className={cn('chip', genre === g.id && 'is-on')}
                  onClick={() => patch({ genre: genre === g.id ? null : g.id })}
                  style={{ height: 30, fontSize: 12.5 }}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <span className="hint num" style={{ marginLeft: 'auto' }}>
              {loading && !items.length ? 'counting…' : `${items.length.toLocaleString()}+ shown`}
            </span>
          </div>

          {showFilters ? (
            <div className="filters" style={{ marginTop: 12 }}>
              <label className="field">
                <span>Genre</span>
                <select className="select" value={genre ?? ''} onChange={(e) => patch({ genre: Number(e.target.value) })}>
                  <option value="">Any</option>
                  {genreList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{kind === 'movie' ? 'Released from' : 'Premiered from'}</span>
                <select className="select" value={yearFrom ?? ''} onChange={(e) => patch({ year_from: Number(e.target.value) })}>
                  <option value="">Any year</option>
                  {[...new Set(DECADES)].map((y) => (
                    <option key={y} value={y}>
                      {y} onward
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Sort</span>
                <select className="select" value={sort} onChange={(e) => patch({ sort: e.target.value })}>
                  {sorts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Original language</span>
                <select className="select" value={language ?? ''} onChange={(e) => patch({ lang: e.target.value })}>
                  <option value="">Any</option>
                  {LANGS.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>At least … votes</span>
                <select className="select" value={minVotes ?? ''} onChange={(e) => patch({ minVotes: Number(e.target.value) })}>
                  <option value="">Anyone</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="1000">1,000</option>
                  <option value="5000">5,000</option>
                </select>
              </label>

              <label className="field">
                <span>Region for providers</span>
                <select
                  className="select"
                  value={region}
                  onChange={(e) => setPrefs({ region: e.target.value })}
                  title="Priva-wide: also changes what the title pages list as legal to watch"
                >
                  {REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              {anyFilter ? (
                <button className="btn btn--sm btn--outline" style={{ alignSelf: 'center' }} onClick={clearAll}>
                  <IcRefresh size={14} /> Clear
                </button>
              ) : null}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <ProviderRow value={provider ?? null} region={region} onChange={(id) => patch({ provider: id })} />
          </div>

          {error ? (
            <div style={{ marginTop: 16 }}>
              <ErrorNote message={error} onRetry={reload} />
            </div>
          ) : null}

          <div style={{ marginTop: 20 }}>
            {loading && !items.length ? <SkeletonGrid /> : null}
            {items.length ? (
              <div className="grid-posters">
                {items.map((item, i) => (
                  <MediaCard key={`${item.id}-${i}`} item={item} index={i} />
                ))}
              </div>
            ) : null}
            {!loading && !items.length && !error ? (
              <div className="empty" style={{ marginTop: 10 }}>
                <h3>Nothing matches that combination</h3>
                <p>Loosen a filter. TMDB indexes about a million titles, but not those ones.</p>
                <button className="btn btn--sm btn--primary" onClick={clearAll}>
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>

          <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />

          {loading && items.length ? (
            <p className="hint" style={{ textAlign: 'center', padding: '18px 0' }}>
              <span className="spinner" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: -3, marginRight: 8 }} />
              loading page {page + 1}
            </p>
          ) : null}

          {!loading && hasMore ? (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button className="btn btn--outline" onClick={next}>
                Load 20 more
              </button>
            </div>
          ) : null}

          {!hasMore && items.length ? (
            <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
              End of this filter — {items.length.toLocaleString()} titles over {page} page{page === 1 ? '' : 's'}.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** The ranked board for "Top 10 today" and "all time". */
function TopBoard({ kind, mode, region }: { kind: MediaType; mode: 'today' | 'alltime'; region: string }) {
  const { data, loading, error, reload } = useAsync(
    () =>
      mode === 'today'
        ? api.popular(kind, 1)
        : api.discover(kind, { sort: 'vote_average.desc', minVotes: 1500, page: 1 }),
    [kind, mode, region],
  )
  const items = useMemo(() => (data?.results ?? []).slice(0, 10), [data])
  const regionName = REGIONS.find((r) => r.code === region)?.name ?? region

  return (
    <div>
      <div className="board-note">
        <IcTrend size={14} />
        <span>
          {mode === 'today'
            ? `The ten ${kind === 'movie' ? 'films' : 'shows'} with the most traction in ${regionName} right now — TMDB popularity, refreshed hourly.`
            : 'Ranked by TMDB score with at least 1,500 votes, so a thousand-fan anime cannot take the top spot.'}
        </span>
      </div>
      {error ? <ErrorNote message={error} onRetry={reload} /> : null}
      {loading ? <SkeletonGrid count={10} /> : null}
      {!loading && items.length ? (
        <div className="top-board">
          {items.map((item, i) => (
            <div className="rank" key={item.id}>
              <span className="rank__num num">{i + 1}</span>
              <MediaCard item={item} index={i} progress={false} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
