import { useCallback, useEffect, useMemo, useState } from 'react'
import { season as seasonEpisodes } from '../lib/tmdb'
import type { TvDetail, TvEpisode, WatchProgress } from '../lib/types'
import { cn, runtime, secondsToClock } from '../lib/utils'
import { useStore } from '../hooks/useStore'
import { progressKey } from '../lib/store'
import { SmartLink } from './SmartLink'
import { IcPlay, IcDownload, IcClock } from './icons'

/** Season tabs + the episode list. Episodes come from TMDB one season at a
 *  time — the show payload only carries season metadata.
 *
 *  The season can be driven from the outside (the page keeps it so the play
 *  button knows where to send you) or left to the component. */
export function SeasonBrowser({
  show,
  onDownload,
  season,
  onSeasonChange,
}: {
  show: TvDetail
  onDownload?: (ep: TvEpisode, seasonNo: number) => void
  season?: number
  onSeasonChange?: (seasonNo: number) => void
}) {
  const seasons = useMemo(() => (show.seasons ?? []).filter((s) => s.season_number > 0), [show.seasons])
  const [internal, setInternal] = useState(seasons[0]?.season_number ?? 1)
  const [data, setData] = useState<TvEpisode[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data: userData } = useStore()
  const active = season ?? internal

  const setActive = useCallback(
    (n: number) => {
      setInternal(n)
      onSeasonChange?.(n)
    },
    [onSeasonChange],
  )

  useEffect(() => {
    if (seasons.some((s) => s.season_number === active)) return
    setActive(seasons[0]?.season_number ?? 1)
  }, [seasons, active, setActive])

  useEffect(() => {
    let alive = true
    setError(null)
    seasonEpisodes(show.id, active)
      .then((res) => {
        if (alive) setData(res.episodes ?? [])
      })
      .catch((err: Error) => {
        if (alive) setError(err.message || 'Could not load that season')
      })
    return () => {
      alive = false
    }
  }, [show.id, active])

  return (
    <section className="panel" id="episodes">
      <div className="panel__head">
        <h3>Episodes</h3>
        <div className="grow" />
        <span className="hint num">{data?.length ?? seasons.find((s) => s.season_number === active)?.episode_count ?? '—'} this season</span>
      </div>

      <div className="season-select no-bar" role="tablist" aria-label="Seasons">
        {seasons.map((s) => (
          <button
            key={s.id ?? s.season_number}
            role="tab"
            aria-selected={s.season_number === active}
            className={cn('chip', s.season_number === active && 'is-on')}
            onClick={() => setActive(s.season_number)}
            style={{ flex: 'none' }}
            title={s.overview || s.name}
          >
            {s.name.replace(/^Season\s+/i, '') === String(s.season_number) ? `Season ${s.season_number}` : s.name}
            <span className="num" style={{ opacity: 0.65, fontSize: 11 }}>
              {s.episode_count}
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="hint hint--bad" style={{ marginTop: 12 }}>{error}</p> : null}

      <div style={{ marginTop: 10 }}>
        {!data && !error
          ? Array.from({ length: 6 }, (_, i) => <div className="skel skel--wide" key={i} style={{ height: 66, marginTop: 8, borderRadius: 12 }} />)
          : data?.map((ep) => (
              <EpisodeRow
                key={ep.id ?? ep.episode_number}
                showId={show.id}
                seasonNo={active}
                episode={ep}
                progress={userData.progress[progressKey('tv', show.id, active, ep.episode_number)]}
                onDownload={onDownload ? (ep) => onDownload!(ep, active) : undefined}
              />
            ))}
      </div>
    </section>
  )
}

function EpisodeRow({
  showId,
  seasonNo,
  episode,
  progress,
  onDownload,
}: {
  showId: number
  seasonNo: number
  episode: TvEpisode
  progress?: WatchProgress
  onDownload?: (ep: TvEpisode) => void
}) {
  const watched = progress ? Math.round(progress.progress) : 0
  const done = watched >= 93
  const remaining = episode.runtime && progress?.duration ? Math.max(0, Math.round((progress.duration - progress.timestamp) / 60)) : null

  return (
    <article className={cn('episode', progress && 'is-current')}>
      <div className="episode__num num">{episode.episode_number}</div>

      <SmartLink to={`/watch/tv/${showId}/${seasonNo}/${episode.episode_number}`} aria-label={`Play ${episode.name}`}>
        <div className="episode__thumb">
          {episode.still_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="noart" style={{ position: 'absolute', inset: 0 }}>
              <IcPlay size={16} />
            </div>
          )}
          <span className="episode__play">
            <IcPlay size={15} />
          </span>
          {progress ? (
            <span className="card__progress">
              <i style={{ width: `${Math.min(100, watched)}%` }} />
            </span>
          ) : null}
        </div>
      </SmartLink>

      <div className="episode__body">
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h4 className="episode__title truncate">{episode.name || `Episode ${episode.episode_number}`}</h4>
          <span className="hint num" style={{ flex: 'none' }}>
            {episode.air_date || '—'}
          </span>
          {done ? <span className="badge" style={{ color: 'var(--color-jade)' }}>watched</span> : null}
          {!done && watched > 1 ? (
            <span className="badge badge--flare">
              {secondsToClock(progress!.timestamp)} / {secondsToClock(progress!.duration)}
            </span>
          ) : null}
        </div>
        <p className="episode__desc clamp-2">{episode.overview || 'No synopsis yet — TMDB has not filled this one in.'}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 2 }}>
          <span className="hint" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
            <IcClock size={12} /> {runtime(episode.runtime) === '—' ? 'unknown' : runtime(episode.runtime)}
          </span>
          {remaining ? <span className="hint">{remaining} min left</span> : null}
          {episode.vote_average ? (
            <span className="rating" style={{ fontSize: 11.5 }}>
              <i>★</i>
              {episode.vote_average.toFixed(1)}
            </span>
          ) : null}
          {onDownload ? (
            <button className="btn btn--link" style={{ marginLeft: 'auto', fontSize: 12.5 }} onClick={() => onDownload(episode)}>
              <IcDownload size={13} /> download
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
