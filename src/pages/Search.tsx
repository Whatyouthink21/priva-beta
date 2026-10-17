import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { usePaged } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { rememberSearch, forgetSearches } from '../lib/store'
import { MediaCard } from '../components/MediaCard'
import { PersonCard } from '../components/CastCrew'
import { ErrorNote, SkeletonGrid } from '../components/Bits'
import { IcClose, IcFilm, IcSearch, IcSparkle, IcTv, IcUsers } from '../components/icons'
import { GENRES } from '../lib/constants'
import type { TmdbPoster } from '../lib/types'

type Scope = 'all' | 'movie' | 'tv' | 'person'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'person', label: 'People' },
]

const SUGGESTIONS = ['Arrival', 'Severance', 'Dune', 'Studio Ghibli', 'HBO', 'true crime', '90s thrillers']

const GENRE_LINKS = GENRES.movie.filter((g) => ['Science Fiction', 'Thriller', 'Animation', 'Documentary', 'Comedy', 'Horror'].includes(g.name)).slice(0, 8)

export default function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const committed = params.get('q') ?? ''
  const scope = (params.get('in') as Scope) ?? 'all'
  const [term, setTerm] = useState(committed)
  const { data } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // type → wait → run. Only real searches get written to the URL, so the
  // back button walks the queries and a link to /search?q=… just works.
  useEffect(() => {
    if (term === committed) return
    const t = setTimeout(() => {
      const trimmed = term.trim()
      const next = new URLSearchParams(params)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      setParams(next, { replace: true })
      if (trimmed.length > 2) rememberSearch(trimmed)
    }, 420)
    return () => clearTimeout(t)
  }, [term, committed, params, setParams])

  useEffect(() => {
    setTerm(committed)
  }, [committed])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const run = useCallback(
    (page: number) => {
      if (!committed) return Promise.resolve(undefined)
      if (scope === 'person') return api.searchPeople(committed).then((r) => ({ ...r, page }))
      if (scope === 'movie' || scope === 'tv') return api.searchType(scope, committed, page)
      return api.searchMulti(committed, page)
    },
    [committed, scope],
  )

  const { items, loading, error, hasMore, next } = usePaged<TmdbPoster>(run, [committed, scope])

  /* search/multi mixes people in with the titles — split them so the poster
   * grid stays posters-only and the actors get their own band on top */
  const titles = useMemo(
    () => (scope === 'person' ? [] : items.filter((i) => scope !== 'all' || i.media_type !== 'person')),
    [items, scope],
  )

  const people = useMemo<TmdbPoster[]>(
    () => (scope === 'person' ? items : items.filter((i) => i.media_type === 'person')),
    [items, scope],
  )

  const setScope = (id: Scope) => {
    const nextParams = new URLSearchParams(params)
    if (id === 'all') nextParams.delete('in')
    else nextParams.set('in', id)
    setParams(nextParams, { replace: true })
  }

  const total = titles.length + people.length
  const searching = Boolean(committed)

  return (
    <div className="wrap page search-page">
      <header className="search-page__head">
        <div className="kicker kicker--flare">Search</div>
        <h1 className="search-page__title">
          {searching ? <>Results for <em>“{committed}”</em></> : <>Find something to watch</>}
        </h1>
        <p className="search-page__lead">
          {searching
            ? scope === 'all'
              ? 'Films, series and the people behind them, straight from TMDB.'
              : `Only ${SCOPES.find((s) => s.id === scope)?.label.toLowerCase()} for “${committed}”.`
            : 'Films, series and the people behind them — straight from TMDB, no account needed.'}
        </p>
      </header>

      <div className="search-panel">
        <form
          className="search-hero"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = term.trim()
            if (trimmed) {
              rememberSearch(trimmed)
              navigate(`/search?q=${encodeURIComponent(trimmed)}${scope !== 'all' ? `&in=${scope}` : ''}`)
            }
            inputRef.current?.blur()
          }}
        >
          <IcSearch size={20} style={{ color: 'var(--color-dim)', flex: 'none' }} />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="A film, a show, a director, a weird 2004 miniseries…"
            aria-label="Search Priva"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
          />
          {term ? (
            <button type="button" className="icon-btn icon-btn--quiet" style={{ width: 28, height: 28 }} aria-label="Clear" onClick={() => { setTerm(''); setParams(new URLSearchParams(), { replace: true }) }}>
              <IcClose size={14} />
            </button>
          ) : (
            <kbd className="key" aria-hidden="true">
              /
            </kbd>
          )}
        </form>

        <div className="search-scopes" role="tablist" aria-label="What to search">
          {SCOPES.map((s) => (
            <button key={s.id} role="tab" aria-selected={scope === s.id} onClick={() => setScope(s.id)}>
              {s.id === 'all' ? <IcSparkle size={14} /> : s.id === 'movie' ? <IcFilm size={14} /> : s.id === 'tv' ? <IcTv size={14} /> : <IcUsers size={14} />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {data.recentSearches.length ? (
        <div className="search-recent">
          <span className="field-label">recent</span>
          {data.recentSearches.slice(0, 8).map((r) => (
            <button key={r} className="pill pill--link" onClick={() => setTerm(r)}>
              {r}
            </button>
          ))}
          <button className="btn btn--link" style={{ fontSize: 12 }} onClick={forgetSearches}>
            clear
          </button>
        </div>
      ) : null}

      {!searching ? (
        <SearchIdle onPick={setTerm} />
      ) : (
        <>
          <div className="search-summary">
            {loading && !total ? (
              <span className="hint">Looking for “{committed}”…</span>
            ) : total ? (
              <span className="hint">
                <b className="num">{total}{hasMore ? '+' : ''}</b> {total === 1 ? 'result' : 'results'} for “{committed}”
              </span>
            ) : null}
            {scope !== 'all' ? (
              <button className="btn btn--sm btn--outline" onClick={() => setScope('all')}>
                search everything
              </button>
            ) : null}
          </div>

          {error ? <ErrorNote message={error} /> : null}

          {people.length ? (
            scope === 'person' ? (
              <div className="grid-people">
                {people.map((p) => (
                  <PersonCard key={p.id} person={p as unknown as { id: number; name: string; profile_path: string | null }} />
                ))}
              </div>
            ) : (
              <section className="panel search-band">
                <div className="panel__head">
                  <h3>People</h3>
                  <div className="grow" />
                  <span className="hint">{people.length}</span>
                </div>
                <div className="grid-people">
                  {people.slice(0, 8).map((p) => (
                    <PersonCard key={p.id} person={p as unknown as { id: number; name: string; profile_path: string | null }} />
                  ))}
                </div>
              </section>
            )
          ) : null}

          {loading && !titles.length ? (
            <SkeletonGrid count={12} />
          ) : titles.length ? (
            <div className="grid-posters">
              {titles.map((item, i) => (
                <MediaCard key={`${item.id}-${i}`} item={{ ...item, media_type: item.media_type === 'tv' ? 'tv' : 'movie' }} index={i} />
              ))}
            </div>
          ) : !loading && !people.length ? (
            <div className="empty">
              <div className="empty__art">
                <IcSparkle />
              </div>
              <h3>Nothing found for “{committed}”</h3>
              <p style={{ maxWidth: '46ch' }}>
                TMDB is strict about spelling and does not translate titles on the first pass. Try the original title, fewer
                words, or the year.
              </p>
            </div>
          ) : null}

          {hasMore && !loading ? (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className="btn btn--outline" onClick={next}>
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function SearchIdle({ onPick }: { onPick: (term: string) => void }) {
  return (
    <div className="search-idle">
      <section className="panel">
        <div className="panel__head">
          <h3>Try one of these</h3>
        </div>
        <div className="tag-row">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 14 }}>
          Search covers titles in any language, plus actors, directors and crew — tap a person on the People tab to see every
          credit they have.
        </p>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h3>Or start from a shelf</h3>
          <div className="grow" />
          <Link className="pill pill--link" to="/movies">
            all movies
          </Link>
        </div>
        <div className="tag-row">
          {GENRE_LINKS.map((g) => (
            <Link key={g.id} className="pill pill--link" to={`/movies?genre=${g.id}`}>
              {g.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
