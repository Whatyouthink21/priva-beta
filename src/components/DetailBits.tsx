import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../hooks/useStore'
import { useAsync } from '../hooks/useAsync'
import * as api from '../lib/tmdb'
import { cn } from '../lib/utils'
import { personHref } from '../lib/card'
import { HeroTrailer } from './HeroTrailer'
import { SmartLink } from './SmartLink'
import { Poster } from './Poster'
import { Rail } from './Rail'
import { IcBookmark, IcBookmarkFilled, IcDownload, IcExternal, IcLayers, IcPlay, IcStar } from './icons'
import { inMyList, rateTitle, toggleMyList } from '../lib/store'
import { useToast } from '../contexts/ToastProvider'
import { usePicker } from '../contexts/PickerProvider'
import type { CrewMember, MediaType, TitleMeta } from '../lib/types'

/* ------------------------------------------------------------------ *
 * hero for a title page — same trailer machinery as the home hero, but
 * the play button lives inside it
 * ------------------------------------------------------------------ */

export function DetailHero({
  type,
  meta,
  tagline,
  overview,
  trailer,
  backdrop,
  poster,
  badges,
  extra,
}: {
  type: MediaType
  meta: TitleMeta
  tagline?: string | null
  overview: string
  trailer: api.Trailer | null
  backdrop: string | null
  poster: string | null
  badges?: ReactNode
  extra?: ReactNode
}) {
  const toast = useToast()
  const picker = usePicker()
  const { prefs, data } = useStore()
  const [playing, setPlaying] = useState(false)
  const saved = inMyList(meta.id)
  const progress = data.progress[`${type}:${meta.id}`]
  const resumable = progress && progress.progress > 1 && progress.progress < 93

  const href = useMemo(() => {
    const p = new URLSearchParams()
    if (resumable && prefs.resumePlayback) p.set('t', String(Math.floor(progress!.timestamp)))
    const qs = p.toString()
    return `/watch/${type}/${meta.id}${qs ? `?${qs}` : ''}`
  }, [type, meta.id, resumable, prefs.resumePlayback, progress])

  return (
    <section className="hero hero--detail">
      <HeroTrailer backdrop={backdrop} poster={poster} trailer={trailer} title={meta.title} />
      <div className="wrap">
        <div className="hero__body">
          <div className="kicker">
            <span className="kicker--flare">{type === 'tv' ? 'Series' : 'Film'}</span>
            {meta.year ? ` · ${meta.year}` : ''}
            {badges ? <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6 }}>{badges}</span> : null}
          </div>
          <h1 className="hero__title">{meta.title}</h1>
          {tagline ? <p className="hero__tag">“{tagline}”</p> : null}
          {overview ? <p className="hero__synopsis">{overview}</p> : null}
          {extra}
          <div className="hero__actions">
            {playing ? (
              <span className="btn btn--glass">
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> opening the player…
              </span>
            ) : (
              <SmartLink className="btn btn--primary btn--play" to={href} onClick={() => setPlaying(true)}>
                <IcPlay /> {resumable && prefs.resumePlayback ? `Resume · ${Math.round(progress!.progress)}%` : 'Play'}
              </SmartLink>
            )}
            <button
              className="btn btn--glass"
              onClick={() => {
                const added = toggleMyList(meta)
                toast.push(added ? `Saved to My List` : 'Removed from My List', {
                  kind: 'ok',
                  action: { label: 'Undo', run: () => toggleMyList(meta) },
                })
              }}
            >
              {saved ? <IcBookmarkFilled size={16} /> : <IcBookmark size={16} />} {saved ? 'Saved' : 'My List'}
            </button>
            <button className="btn btn--outline" onClick={() => picker.open(meta)}>
              <IcLayers size={16} /> Collection
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * the play block: play + download. Server switching stays in the player.
 * ------------------------------------------------------------------ */

export function PlayCard({
  meta,
  season,
  episode,
  onDownload,
}: {
  meta: TitleMeta
  season?: number
  episode?: number
  onDownload?: () => void
}) {
  return (
    <div className="play-card">
      <div className="play-card__row">
        <SmartLink
          className="btn btn--primary"
          style={{ flex: 1 }}
          to={`/watch/${meta.type}/${meta.id}${meta.type === 'tv' && season ? `/${season}/${episode ?? 1}` : ''}`}
        >
          <IcPlay /> {meta.type === 'tv' ? `Play S${season ?? 1}·E${episode ?? 1}` : 'Watch now'}
        </SmartLink>
        {onDownload ? (
          <button className="btn btn--outline" onClick={onDownload}>
            <IcDownload size={16} /> Download
          </button>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * facts panel — the " IMDb, budget, revenue, country" block
 * ------------------------------------------------------------------ */

export function Facts({
  items,
  title,
  note,
  wide = false,
}: {
  items: { label: string; value: ReactNode }[]
  title?: string
  note?: ReactNode
  /** wide = lay the facts out in columns instead of one long list */
  wide?: boolean
}) {
  const rows = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== '' && i.value !== '—')
  return (
    <section className="panel">
      <div className="panel__head">
        <h3>{title ?? 'The numbers'}</h3>
        {note ? (
          <>
            <div className="grow" />
            <span className="hint">{note}</span>
          </>
        ) : null}
      </div>
      <div className={cn('kv', wide && 'kv--wide')}>
        {rows.map((r) => (
          <div key={r.label}>
            <b>{r.label}</b>
            <span>{r.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function RatingBadge({ value, count, label = 'TMDB' }: { value?: number | null; count?: number; label?: string }) {
  if (!value) return null
  return (
    <span className="rating" title={`${count ?? 0} votes on ${label}`}>
      <i>★</i>
      {value.toFixed(1)}
      <small>
        {label}
        {count ? ` · ${count.toLocaleString()} votes` : ''}
      </small>
    </span>
  )
}

export function ImdbRow({ imdbId }: { imdbId?: string | null }) {
  const key = import.meta.env.VITE_OMDB_KEY?.trim()
  const { data: state } = useAsync(async () => (key && imdbId ? api.imdbRating(imdbId) : null), [imdbId, key])
  if (!imdbId) return null
  return (
    <a className="provider" href={`https://www.imdb.com/title/${imdbId}/`} target="_blank" rel="noreferrer noopener" style={{ marginTop: 8 }}>
      <span className="provider__imdb">
        IMDb
      </span>
      {state ? (
        <>
          <b className="num">{state.rating}</b>/10
          <span className="hint" style={{ marginLeft: 4 }}>
            {state.votes} votes
          </span>
        </>
      ) : (
        <span>
          {key ? 'looking up the score…' : 'the number lives on IMDb'}
          <IcExternal size={12} style={{ marginLeft: 6, verticalAlign: -2 }} />
        </span>
      )}
    </a>
  )
}

/* ------------------------------------------------------------------ *
 * crew highlights + "more like this"
 * ------------------------------------------------------------------ */

export function CrewHighlights({ crew }: { crew: CrewMember[] }) {
  const picks = useMemo(() => {
    const find = (jobs: string[]) => crew.filter((c) => jobs.includes(c.job)).slice(0, 3)
    return {
      Directing: find(['Director', 'Directing', 'Creator', 'Executive Producer']),
      Writing: find(['Writer', 'Screenplay', 'Story', 'Novel', 'Characters', 'Teleplay']),
      Sound: find(['Original Music Composer', 'Music Director', 'Sound Designer', 'Supervising Sound Editor']),
      Camera: find(['Director of Photography', 'Editor']),
    }
  }, [crew])

  const groups: { label: string; items: CrewMember[] }[] = [
    { label: 'Directed by', items: picks.Directing },
    { label: 'Written by', items: picks.Writing },
    { label: 'Music', items: picks.Sound },
    { label: 'Shot & cut by', items: picks.Camera },
  ].filter((g) => g.items.length)

  if (!groups.length) return null

  return (
    <section className="panel">
      <div className="panel__head">
        <h3>Behind it</h3>
      </div>
      <div className="crew-groups">
        {groups.map((g) => (
          <div key={g.label}>
            <span className="kicker">{g.label}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {g.items.map((c, i) => (
                <SmartLink key={`${c.id}-${i}`} to={personHref(c.id, c.name)} className="pill pill--link">
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="hint">· {c.job}</span>
                </SmartLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function MoreLikeThis({ type, id, title }: { type: MediaType; id: number; title: string }) {
  const recs = useAsync(() => api.recommendations(type, id), [type, id])
  const similar = useAsync(() => api.similar(type, id), [type, id])
  const items = useMemo(() => {
    const a = recs.data?.results ?? []
    const b = similar.data?.results ?? []
    const seen = new Set<number>([id])
    return [...a, ...b].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
  }, [recs.data, similar.data, id])

  if (!recs.loading && !items.length) return null

  return (
    <>
      <Rail
        title={`More like ${title}`}
        note="TMDB’s own recommendation graph"
        items={items.slice(0, 18)}
        loading={recs.loading}
        error={recs.error}
        onRetry={recs.reload}
      />
      {similar.data?.results?.length ? (
        <Rail
          title={`Also filed under “${title}”`}
          note="similar titles"
          items={similar.data.results.slice(0, 18)}
          loading={similar.loading}
        />
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * rate strip
 * ------------------------------------------------------------------ */

export function RateThis({ meta }: { meta: TitleMeta }) {
  const { data } = useStore()
  const mine = data.rated[`${meta.type}:${meta.id}`]?.score ?? 0
  const [hover, setHover] = useState(0)
  const toast = useToast()
  return (
    <div className="rate-row">
      <span className="kicker">{mine ? 'Your rating' : 'Rate it'}</span>
      <span className="stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            data-on={n <= (hover || mine)}
            aria-label={`${n} of 10`}
            onMouseEnter={() => setHover(n)}
            onClick={() => {
              rateTitle(meta, n === mine ? 0 : n)
              toast.push(n === mine ? 'Rating cleared' : `You rated ${meta.title} ${n}/10`, { kind: 'ok' })
            }}
          >
            <IcStar size={16} />
          </button>
        ))}
      </span>
    </div>
  )
}

export function PosterCard({ path, w = 'w342' }: { path?: string | null; w?: string }) {
  return (
    <span className="mini-poster">
      <Poster path={path} size={w} alt="" />
    </span>
  )
}
