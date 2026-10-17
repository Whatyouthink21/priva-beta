import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { usePaged } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { rememberSearch, forgetSearches } from '../lib/store'
import { MediaCard } from '../components/MediaCard'
import { PersonCard } from '../components/CastCrew'
import { ErrorNote, SkeletonGrid } from '../components/Bits'
import { IcClose, IcSearch, IcSparkle, IcUsers } from '../components/icons'
import type { TmdbPoster } from '../lib/types'

type Scope = 'all' | 'movie' | 'tv' | 'person'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'person', label: 'People' },
]

export default function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const committed = params.get('q') ?? ''
  const scope = (params.get('in') as Scope) ?? 'all'
  const [term, setTerm] = useState(committed)
  const { data } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(committed)
  committedRef.current = committed

  // type → wait → run. Only real searches get written to the URL, so the
  // back button walks the queries and a link to /search?q=… just works.
  useEffect(() => {
    if (term === committedRef.current) return
    const t = setTimeout(() => {
      const trimmed = term.trim()
      const next = new URLSearchParams(params)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      setParams(next, { replace: true })
      if (trimmed.length > 2) rememberSearch(trimmed)
    }, 420)
    return () => clearTimeout(t)
  }, [term, params, setParams])

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

  return (
    <div className="wrap page">
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
        ) : null}
      </form>

      <div className="search-bar">
        <div className="tabs" role="tablist" aria-label="What to search">
          {SCOPES.map((s) => (
            <button key={s.id} role="tab" aria-selected={scope === s.id} onClick={() => setScope(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {data.recentSearches.length ? (
          <div className="recent">
            <span className="field-label">recent</span>
            {data.recentSearches.slice(0, 6).map((r) => (
              <button key={r} className="pill pill--link" onClick={() => setTerm(r)}>
                {r}
              </button>
            ))}
            <button className="btn btn--link" style={{ fontSize: 12 }} onClick={forgetSearches}>
              clear
            </button>
          </div>
        ) : null}
      </div>

      {!committed ? (
        <SearchIdle onPick={setTerm} />
      ) : (
        <>
          <p className="hint" style={{ margin: '18px 0 12px' }}>
            {loading && !items.length ? (
              <>
                Looking for <b>“{committed}”</b>…
              </>
            ) : (
              <>
                {titles.length + people.length ? `${titles.length + people.length}${hasMore ? '+' : ''} result${titles.length + people.length === 1 ? '' : 's'} for ` : 'No match for '}
                <b>“{committed}”</b>
                {scope !== 'all' ? ` in ${SCOPES.find((s) => s.id === scope)?.label.toLowerCase()}` : ''}
              </>
            )}
          </p>

          {error ? <ErrorNote message={error} /> : null}

          {people.length && scope === 'person' ? (
            <div className="grid-people">
              {people.map((p) => (
                <PersonCard key={p.id} person={p as unknown as { id: number; name: string; profile_path: string | null }} />
              ))}
            </div>
          ) : loading && !titles.length ? (
            <SkeletonGrid count={12} />
          ) : people.length && scope === 'all' ? (
            <section className="panel" style={{ marginBottom: 18 }}>
              <div className="panel__head">
                <h3>People</h3>
              </div>
              <div className="grid-people">
                {people.slice(0, 6).map((p) => (
                  <PersonCard key={p.id} person={p as unknown as { id: number; name: string; profile_path: string | null }} />
                ))}
              </div>
            </section>
          ) : null}

          {loading && !titles.length ? null : titles.length ? (
            <div className="grid-posters">
              {titles.map((item, i) => (
                <MediaCard key={`${item.id}-${i}`} item={{ ...item, media_type: item.media_type === 'tv' ? 'tv' : 'movie' }} index={i} />
              ))}
            </div>
          ) : scope === 'person' && people.length ? null : !loading ? (
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
  const suggestions = ['Arrival', 'Severance', 'KPop Demon Hunters', 'Studio Ghibli', 'HBO', 'trending this week']
  return (
    <div className="search-idle">
      <div className="panel">
        <div className="panel__head">
          <h3>
            <IcUsers size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
            Try one of these
          </h3>
        </div>
        <div className="tag-row">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 14 }}>
          Search covers titles in any language, plus actors, directors and crew — tap a person on the People tab to see every
          credit they have.
        </p>
      </div>
    </div>
  )
}
