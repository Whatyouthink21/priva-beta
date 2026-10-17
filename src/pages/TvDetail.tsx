import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { useAsync } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { cn, runtime, year } from '../lib/utils'
import { COUNTRY_NAME } from '../lib/constants'
import { DetailHero, Facts, ImdbRow, MoreLikeThis, PlayCard, RateThis, CrewHighlights } from '../components/DetailBits'
import { CastStrip, CreditsTable } from '../components/CastCrew'
import { StreamingProviders } from '../components/Providers'
import { SeasonBrowser } from '../components/SeasonBrowser'
import { Downloads } from '../components/Downloads'
import { ErrorNote, PageHead } from '../components/Bits'
import { Poster } from '../components/Poster'
import { Modal } from '../components/Modal'
import { IcDownload, IcExternal, IcLink } from '../components/icons'
import { NoKey } from './MovieDetail'
import { hasTmdbKey } from '../lib/env'
import type { TvDetail as Show, TvEpisode } from '../lib/types'

export default function TvPage({ mode }: { mode?: 'credits' }) {
  const { id } = useParams()
  const showId = Number(id)
  const { prefs } = useStore()
  const [region, setRegion] = useState(prefs.region)
  const { data, loading, error, reload } = useAsync(
    () => (Number.isFinite(showId) ? api.tv(showId, region) : Promise.reject(new Error('That is not a series id'))),
    [showId, region],
  )
  const show = data

  if (!hasTmdbKey()) return <NoKey />
  if (loading && !show) return <LoadingShow />
  if (error || !show) return <ErrorShell message={error ?? 'TMDB has no series with that id.'} onRetry={reload} />
  if (mode === 'credits') return <CreditsFor show={show} loading={loading} />

  return <ShowView show={show} region={region} onRegion={setRegion} />
}

function ShowView({ show, region, onRegion }: { show: Show; region: string; onRegion: (r: string) => void }) {
  const [download, setDownload] = useState<{ season: number; episode: number; name: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const meta = api.toMeta({ ...show, media_type: 'tv', name: show.name })
  const trailer = useMemo(() => api.pickTrailer(show.videos), [show.videos])
  const cast = show.credits?.cast ?? []
  const crew = show.credits?.crew ?? []
  const creators = (show.created_by ?? []).map((c) => c.name)
  const seasons = (show.seasons ?? []).filter((s) => s.season_number > 0)
  const lastDate = show.last_air_date
  const firstDate = show.first_air_date
  const cert = show.content_ratings?.results?.find((r) => r.iso_3166_1 === region)?.rating
  const onAirNow = show.in_production
  const avgEpisode = show.episode_run_time?.[0]

  return (
    <>
      <DetailHero
        type="tv"
        meta={meta}
        tagline={show.tagline}
        overview={show.overview}
        trailer={trailer}
        backdrop={show.backdrop_path}
        poster={show.poster_path}
        badges={
          <>
            {cert ? <span className="badge">{cert}</span> : null}
            <span className="badge">{show.number_of_seasons} season{show.number_of_seasons === 1 ? '' : 's'}</span>
            {avgEpisode ? <span className="badge">~{runtime(avgEpisode)}/ep</span> : null}
          </>
        }
        extra={
          <div className="hero__row">
            <ImdbRow imdbId={show.imdb_id} />
            <span className="pill">
              {onAirNow ? 'still on the air' : 'finished'} · {show.number_of_episodes} episodes
            </span>
            {(show.genres ?? []).slice(0, 4).map((g) => (
              <Link key={g.id} to={`/series?genre=${g.id}`} className="pill pill--link">
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
                <h3>The premise</h3>
                <div className="grow" />
                <span className="hint">{show.status}</span>
              </div>
              <p className="prose" style={{ marginTop: 0 }}>
                {show.overview || 'No synopsis on TMDB yet.'}
              </p>
              {show.keywords?.results?.length ? (
                <div className="tag-row">
                  {show.keywords.results.slice(0, 12).map((k) => (
                    <span className="badge" key={k.id}>
                      {k.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <RateThis meta={meta} />
            </section>

            <PlayCard meta={meta} season={seasons[0]?.season_number} episode={1} onDownload={() => setDownload({ season: seasons[0]?.season_number ?? 1, episode: 1, name: 'S1·E1' })} />

            <SeasonBrowser
              show={show}
              onDownload={(ep: TvEpisode, seasonNo: number) => setDownload({ season: seasonNo, episode: ep.episode_number, name: ep.name })}
            />

            <StreamingProviders payload={show['watch/providers']} region={region} onRegion={onRegion} />

            {cast.length ? <CastStrip cast={cast} seeAllTo={`/tv/${show.id}/credits`} /> : null}
            <CrewHighlights crew={crew} />

            <MoreLikeThis type="tv" id={show.id} title={show.name} />
          </div>

          <aside style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            <div className="side-poster">
              <Poster path={show.poster_path} size="w342" alt={`${show.name} poster`} />
            </div>

            <Facts
              items={[
                {
                  label: 'IMDb',
                  value: show.imdb_id ? (
                    <a href={`https://www.imdb.com/title/${show.imdb_id}/`} target="_blank" rel="noreferrer noopener" className="num">
                      {show.imdb_id} <IcExternal size={11} style={{ verticalAlign: -1 }} />
                    </a>
                  ) : null,
                },
                { label: 'Score', value: show.vote_average ? `${show.vote_average.toFixed(1)} / 10 · ${show.vote_count?.toLocaleString()} votes` : null },
                { label: 'Premiered', value: firstDate ? new Date(firstDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : year(firstDate) },
                { label: 'Ended', value: !onAirNow && lastDate ? new Date(lastDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                { label: 'Created by', value: creators.join(', ') },
                { label: 'Networks', value: (show.networks ?? []).map((n) => n.name).join(', ') },
                { label: 'Country', value: (show.origin_country ?? []).map((c) => COUNTRY_NAME[c] ?? c).join(', ') },
                { label: 'Languages', value: (show.languages ?? []).map((l) => l.toUpperCase()).join(', ') },
                { label: 'Seasons', value: String(show.number_of_seasons) },
                { label: 'Episodes', value: String(show.number_of_episodes) },
                { label: 'Typical length', value: avgEpisode ? runtime(avgEpisode) : null },
                { label: 'Type', value: show.type },
                { label: 'Certification', value: cert },
                { label: 'Status', value: show.status },
              ]}
            />

            <section className="panel">
              <div className="panel__head">
                <h3>Jump to a season</h3>
              </div>
              <div className="link-list">
                {seasons.slice(0, 10).map((s) => (
                  <Link key={s.id ?? s.season_number} to={`/tv/${show.id}/credits?season=${s.season_number}#episodes`}>
                    {s.name}
                    <small>{s.episode_count} eps</small>
                  </Link>
                ))}
              </div>
            </section>

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
                <a className="btn btn--sm btn--outline" href={`https://www.themoviedb.org/tv/${show.id}`} target="_blank" rel="noreferrer noopener">
                  TMDB <IcExternal size={13} />
                </a>
                <button className="btn btn--sm btn--outline" onClick={() => setDownload({ season: seasons[0]?.season_number ?? 1, episode: 1, name: 'S1·E1' })}>
                  <IcDownload size={14} /> Downloads
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Modal
        open={!!download}
        onClose={() => setDownload(null)}
        title={download ? `${show.name} — S${download.season}·E${download.episode}` : ''}
        subtitle={download?.name}
        wide
      >
        {download ? <Downloads target={{ type: 'tv', id: show.id, season: download.season, episode: download.episode, title: show.name }} /> : null}
      </Modal>
    </>
  )
}

function CreditsFor({ show, loading }: { show: Show; loading: boolean }) {
  const { data, error, reload } = useAsync(() => (loading ? Promise.resolve(undefined) : api.fullCredits('tv', show.id)), [show.id, loading])
  return (
    <div className="wrap page">
      <PageHead kicker="Full credits" title={`Everyone who worked on ${show.name}`} lead="Every department across every season TMDB files under this show.">
        <Link className="btn btn--sm btn--outline" to={`/tv/${show.id}`}>
          Back to the series
        </Link>
      </PageHead>
      {error ? <ErrorNote message={error} onRetry={reload} /> : null}
      <div className="panel">
        {loading || !data ? (
          <p className="hint">Pulling every credit page…</p>
        ) : (
          <CreditsTable cast={data.cast} crew={data.crew} />
        )}
      </div>
    </div>
  )
}

function ErrorShell({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="wrap page">
      <PageHead kicker="Dead end" title="That page did not load" />
      <ErrorNote message={message} onRetry={onRetry} />
      <p style={{ marginTop: 16 }}>
        <Link to="/series" className={cn('btn', 'btn--sm', 'btn--outline')}>
          Back to series
        </Link>
      </p>
    </div>
  )
}

function LoadingShow() {
  return (
    <div className="wrap page" style={{ paddingTop: 0 }}>
      <div className="hero" style={{ minHeight: 'min(60vh, 480px)' }}>
        <div className="hero__media" style={{ background: 'linear-gradient(160deg, var(--color-panel2), var(--color-ink2))' }} />
      </div>
    </div>
  )
}
