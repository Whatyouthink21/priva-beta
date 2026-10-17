import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { useAsync } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { cn, money, runtime, year } from '../lib/utils'
import { COUNTRY_NAME, LANGUAGES } from '../lib/constants'
import { DetailHero, Facts, ImdbRow, MoreLikeThis, PlayCard, RateThis, CrewHighlights } from '../components/DetailBits'
import { CastStrip, CreditsTable } from '../components/CastCrew'
import { StreamingProviders } from '../components/Providers'
import { Downloads } from '../components/Downloads'
import { ErrorNote, PageHead } from '../components/Bits'
import { Poster } from '../components/Poster'
import { Modal } from '../components/Modal'
import { IcDownload, IcExternal, IcLink, IcSearch } from '../components/icons'
import { hasTmdbKey } from '../lib/env'
import type { MovieDetail as Movie } from '../lib/types'

export default function MoviePage({ mode }: { mode?: 'credits' }) {
  const { id } = useParams()
  const movieId = Number(id)
  const { prefs } = useStore()
  const [region, setRegion] = useState(prefs.region)
  const { data, loading, error, reload } = useAsync(
    () => (Number.isFinite(movieId) ? api.movie(movieId, region) : Promise.reject(new Error('That is not a movie id'))),
    [movieId, region],
  )
  const movie = data as Movie | undefined

  if (!hasTmdbKey()) return <NoKey />
  if (loading && !movie) return <LoadingMovie />
  if (error || !movie) return <Broken message={error ?? 'TMDB has no movie with that id.'} onRetry={reload} />

  if (mode === 'credits') return <CreditsFor movie={movie} loading={loading} />

  return <MovieView movie={movie} region={region} onRegion={setRegion} />
}

function MovieView({ movie, region, onRegion }: { movie: Movie; region: string; onRegion: (r: string) => void }) {
  const [download, setDownload] = useState(false)
  const [copied, setCopied] = useState(false)
  const meta = api.toMeta({ ...movie, media_type: 'movie' })
  const trailer = useMemo(() => api.pickTrailer(movie.videos), [movie.videos])
  const cast = movie.credits?.cast ?? []
  const crew = movie.credits?.crew ?? []
  const director = crew.find((c) => c.job === 'Director')
  const writers = crew.filter((c) => c.job === 'Writer' || c.job === 'Screenplay').slice(0, 3)
  const composer = crew.find((c) => c.job === 'Original Music Composer')
  const dp = crew.find((c) => c.job === 'Director of Photography')
  const editor = crew.find((c) => c.job === 'Editor')
  const cert = movie.release_dates?.results?.find((r) => r.iso_3166_1 === region)?.release_dates?.find((d) => d.certification)?.certification
  const release = movie.release_dates?.results?.find((r) => r.iso_3166_1 === region)?.release_dates?.[0]?.release_date ?? movie.release_date
  const companies = movie.production_companies ?? []
  const countries = (movie.production_countries ?? []).map((c) => COUNTRY_NAME[c.iso_3166_1] ?? c.iso_3166_1)
  const spoken = (movie.spoken_languages ?? []).map((l) => l.english_name || LANGUAGES.find((x) => x.code === l.iso_639_1)?.name || l.name)
  const profit = movie.budget > 0 && movie.revenue > 0 ? movie.revenue - movie.budget : null

  return (
    <>
      <DetailHero
        type="movie"
        meta={meta}
        tagline={movie.tagline}
        overview={movie.overview}
        trailer={trailer}
        backdrop={movie.backdrop_path}
        poster={movie.poster_path}
        badges={
          <>
            {cert ? <span className="badge">{cert}</span> : null}
            {movie.runtime ? <span className="badge">{runtime(movie.runtime)}</span> : null}
          </>
        }
        extra={
          <div className="hero__row">
            <ImdbRow imdbId={movie.imdb_id} />
            {(movie.genres ?? []).map((g) => (
              <Link key={g.id} to={`/movies?genre=${g.id}`} className="pill pill--link">
                {g.name}
              </Link>
            ))}
          </div>
        }
      />

      <div className="wrap page">
        <div className="two-col two-col--sticky">
          <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            <section className="panel">
              <div className="panel__head">
                <h3>Story</h3>
                <div className="grow" />
                <span className="hint">{movie.status}</span>
              </div>
              <p className="prose" style={{ marginTop: 0 }}>
                {movie.overview || 'TMDB has no synopsis for this one yet — which usually means it is very new or very obscure.'}
              </p>
              {movie.keywords?.results?.length ? (
                <div className="tag-row">
                  {movie.keywords.results.slice(0, 12).map((k) => (
                    <span className="badge" key={k.id}>
                      {k.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <RateThis meta={meta} />
            </section>

            <PlayCard meta={meta} onDownload={() => setDownload(true)} />

            <StreamingProviders payload={movie['watch/providers']} region={region} onRegion={onRegion} />

            {cast.length ? <CastStrip cast={cast} seeAllTo={`/movie/${movie.id}/credits`} /> : null}
            <CrewHighlights crew={crew} />

            {movie.reviews?.results?.length ? <Reviews items={movie.reviews.results} /> : null}

            <MoreLikeThis type="movie" id={movie.id} title={movie.title} />
          </div>

          <aside style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            <div className="side-poster">
              <Poster path={movie.poster_path} size="w342" alt={`${movie.title} poster`} />
            </div>

            <Facts
              items={[
                {
                  label: 'IMDb',
                  value: movie.imdb_id ? (
                    <a href={`https://www.imdb.com/title/${movie.imdb_id}/`} target="_blank" rel="noreferrer noopener" className="num">
                      {movie.imdb_id} <IcExternal size={11} style={{ verticalAlign: -1 }} />
                    </a>
                  ) : null,
                },
                { label: 'Score', value: movie.vote_average ? `${movie.vote_average.toFixed(1)} / 10 · ${movie.vote_count?.toLocaleString()} votes` : null },
                { label: 'Released', value: release ? new Date(release).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : year(movie.release_date) },
                { label: 'Runtime', value: runtime(movie.runtime) },
                { label: 'Budget', value: money(movie.budget) },
                {
                  label: 'Revenue',
                  value: movie.revenue ? (
                    <>
                      {money(movie.revenue)}
                      {profit !== null ? (
                        <em style={{ marginLeft: 8, color: profit > 0 ? 'var(--color-jade)' : 'var(--color-rose)' }}>
                          {profit > 0 ? '+' : '−'}
                          {money(Math.abs(profit))} vs budget
                        </em>
                      ) : null}
                    </>
                  ) : null,
                },
                { label: 'Country', value: countries.join(', ') },
                { label: 'Languages', value: spoken.join(', ') },
                { label: 'Director', value: director?.name },
                { label: 'Writers', value: writers.map((w) => w.name).join(', ') },
                { label: 'Cinematography', value: dp?.name },
                { label: 'Edited by', value: editor?.name },
                { label: 'Music', value: composer?.name },
                { label: 'Certification', value: cert },
                { label: 'Status', value: movie.status },
              ]}
            />

            {companies.length ? (
              <section className="panel">
                <div className="panel__head">
                  <h3>Made by</h3>
                </div>
                <div className="tag-row">
                  {companies.map((c) => (
                    <span className="pill" key={c.id}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {movie.alternative_titles?.results?.length ? (
              <section className="panel">
                <div className="panel__head">
                  <h3>Also known as</h3>
                </div>
                <ul className="aka">
                  {movie.alternative_titles.results.slice(0, 10).map((t, i) => (
                    <li key={`${t.title}-${i}`}>
                      {t.title} <span className="hint">{t.iso_3166_1}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel__head">
                <h3>Share</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(location.href)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1800)
                  }}
                >
                  <IcLink size={14} /> {copied ? 'Copied' : 'Copy link'}
                </button>
                <a className="btn btn--sm btn--outline" href={`https://www.themoviedb.org/movie/${movie.id}`} target="_blank" rel="noreferrer noopener">
                  TMDB <IcExternal size={13} />
                </a>
                <button className="btn btn--sm btn--outline" onClick={() => setDownload(true)}>
                  <IcDownload size={14} /> Downloads
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Modal open={download} onClose={() => setDownload(false)} title={`Download ${movie.title}`} subtitle="Both services are third-party. Nothing is hosted here." wide>
        <Downloads target={{ type: 'movie', id: movie.id, title: movie.title }} />
      </Modal>
    </>
  )
}

function Reviews({ items }: { items: { id: string; author: string; content: string; created_at: string; url?: string }[] }) {
  const [open, setOpen] = useState(items[0]?.id ?? '')
  const active = items.find((r) => r.id === open) ?? items[0]
  return (
    <section className="panel">
      <div className="panel__head">
        <h3>What people wrote</h3>
        <div className="grow" />
        <span className="hint num">{items.length}</span>
      </div>
      <div className="review-tabs">
        {items.slice(0, 8).map((r) => (
          <button key={r.id} className={cn('chip', r.id === active?.id && 'is-on')} onClick={() => setOpen(r.id)} style={{ height: 30, fontSize: 12.5 }}>
            {r.author}
          </button>
        ))}
      </div>
      {active ? (
        <blockquote className="review clamp-3" style={{ marginTop: 12 }}>
          {active.content}
          <footer className="hint">
            {active.author} · {new Date(active.created_at).toLocaleDateString()}
            {active.url ? (
              <>
                {' · '}
                <a href={active.url} target="_blank" rel="noreferrer noopener">
                  read it all
                </a>
              </>
            ) : null}
          </footer>
        </blockquote>
      ) : null}
    </section>
  )
}

function CreditsFor({ movie, loading }: { movie: Movie; loading: boolean }) {
  const { data, error, reload } = useAsync(() => (loading ? Promise.resolve(undefined) : api.fullCredits('movie', movie.id)), [movie.id, loading])
  return (
    <div className="wrap page">
      <PageHead
        kicker="Full credits"
        title={<>Everyone credited in {movie.title}</>}
        lead="Every department, including the ones the usual sites hide. Cast and crew come from TMDB, paged to the end."
      >
        <Link className="btn btn--sm btn--outline" to={`/movie/${movie.id}`}>
          Back to the film
        </Link>
      </PageHead>
      {error ? <ErrorNote message={error} onRetry={reload} /> : null}
      <div className="panel">
        {loading || !data ? (
          <p className="hint">Pulling every credit page…</p>
        ) : (
          <>
            <div className="hint" style={{ marginBottom: 12 }}>
              <IcSearch size={12} style={{ verticalAlign: -2 }} /> {data.cast.length} cast · {data.crew.length} crew
            </div>
            <CreditsTable cast={data.cast} crew={data.crew} />
          </>
        )}
      </div>
    </div>
  )
}

function LoadingMovie() {
  return (
    <>
      <div className="hero" style={{ minHeight: 'min(64vh, 520px)' }}>
        <div className="hero__media" style={{ background: 'linear-gradient(160deg, var(--color-panel2), var(--color-ink2))' }} />
        <div className="wrap hero__body" style={{ paddingBottom: 40 }}>
          <div className="skel skel--text" style={{ width: 120 }} />
          <div className="skel skel--text" style={{ width: 'min(520px, 78%)', height: 42, marginTop: 10 }} />
          <div className="skel skel--text" style={{ width: 'min(380px, 60%)', height: 13, marginTop: 16 }} />
          <div className="skel skel--text" style={{ width: 'min(320px, 52%)', height: 13 }} />
        </div>
      </div>
      <div className="wrap page">
        <div className="two-col">
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="skel" style={{ height: 180, borderRadius: 16 }} />
            <div className="skel" style={{ height: 260, borderRadius: 16 }} />
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="skel skel--poster" style={{ maxWidth: 260 }} />
            <div className="skel" style={{ height: 320, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    </>
  )
}

function Broken({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="wrap page">
      <PageHead kicker="Dead end" title="That page did not load" />
      <ErrorNote message={message} onRetry={onRetry} />
      <p style={{ marginTop: 16 }}>
        <Link to="/movies" className="btn btn--sm btn--outline">
          Back to movies
        </Link>
      </p>
    </div>
  )
}

export function NoKey() {
  return (
    <div className="wrap page">
      <PageHead kicker="First run" title="Priva needs a TMDB key" />
      <div className="panel">
        <p className="prose">
          Every poster, credit, trailer link and provider listing on this site comes from TMDB. Add a free v3 key or a v4 read
          token on the <Link to="/settings#data">Settings → Data source</Link> page and reload — nothing else about Priva needs
          configuring.
        </p>
      </div>
    </div>
  )
}
