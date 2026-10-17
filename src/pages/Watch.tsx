import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { useAsync } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { playerUrl, sourceName, type EmbedTarget } from '../lib/players'
import { SOURCES } from '../lib/constants'
import { saveProgress, toggleMyList } from '../lib/store'
import { cn, secondsToClock } from '../lib/utils'
import { cardHref } from '../lib/card'
import { IcBookmark, IcBookmarkFilled, IcChevronLeft, IcDownload, IcExpand, IcExternal, IcLayers, IcPlay, IcTv } from '../components/icons'
import { Modal } from '../components/Modal'
import { Downloads } from '../components/Downloads'
import { useToast } from '../contexts/ToastProvider'
import { usePicker } from '../contexts/PickerProvider'
import type { MovieDetail, PlayerSource, TitleMeta, TvDetail } from '../lib/types'

interface Tick {
  pct: number
  time: number
  dur: number
}

export default function WatchPage() {
  const params = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const picker = usePicker()
  const { prefs, data } = useStore()

  const type = params.type === 'tv' ? 'tv' : 'movie'
  const id = Number(params.id)
  const season = params.season ? Number(params.season) : undefined
  const episode = params.episode ? Number(params.episode) : undefined
  const startAt = Math.max(0, Number(sp.get('t') ?? 0) || 0)

  const [source, setSource] = useState<PlayerSource>((sp.get('src') as PlayerSource) || prefs.defaultSource)
  const [tick, setTick] = useState<Tick | null>(null)
  const [heard, setHeard] = useState(false)
  const [download, setDownload] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const lastSave = useRef(0)

  const { data: detail } = useAsync<{ title: string; meta: TitleMeta }>(async () => {
    if (type === 'movie') {
      const m = (await api.movie(id, prefs.region)) as MovieDetail
      return { title: m.title, meta: api.toMeta({ ...m, media_type: 'movie' }) }
    }
    const t = (await api.tv(id, prefs.region)) as TvDetail
    const ep = season && episode ? await api.season(id, season).then((s) => s.episodes?.find((e) => e.episode_number === episode)) : undefined
    return { title: ep?.name ? `${t.name} · ${ep.name}` : t.name, meta: api.toMeta({ ...t, media_type: 'tv', name: t.name }) }
  }, [type, id, season, episode])

  const target: EmbedTarget = useMemo(() => ({ type, id, season, episode }), [type, id, season, episode])
  const src = useMemo(() => playerUrl(source, target, { prefs, startAt }), [source, target, prefs, startAt])
  const saved = data.myList.includes(id)

  /* ---------------- the two players, one listener ---------------- */
  const onMessage = useCallback(
    (event: MessageEvent) => {
      const now = Date.now()
      // Vidstuck: string payload, percent-based
      if (typeof event.data === 'string') {
        try {
          const d = JSON.parse(event.data) as {
            id?: number | string
            type?: 'movie' | 'tv'
            progress?: number
            timestamp?: number
            duration?: number
            season?: number
            episode?: number
          }
          if (d.progress === undefined && d.timestamp === undefined) return
          const pct = Number(d.progress ?? 0)
          const dur = Number(d.duration ?? 0)
          const time = Number(d.timestamp ?? 0)
          setHeard(true)
          setTick({ pct: Math.max(0, Math.min(100, pct)), time, dur })
          if (now - lastSave.current > 5000) {
            lastSave.current = now
            saveProgress({
              id,
              type,
              title: detail?.meta.title ?? 'Untitled',
              poster: detail?.meta.poster ?? null,
              backdrop: detail?.meta.backdrop ?? null,
              progress: Math.max(0, Math.min(100, pct)),
              timestamp: time,
              duration: dur,
              season,
              episode,
              source,
            })
          }
        } catch {
          /* not ours */
        }
        return
      }

      // TGVID: typed events with currentTime/duration
      const d = event.data as {
        type?: string
        event?: string
        currentTime?: number
        duration?: number
        tmdbId?: number
        mediaType?: string
      }
      if (!d || d.type !== 'TGFLIX_EVENT' || typeof d.currentTime !== 'number') return
      if (d.tmdbId && d.tmdbId !== id) return
      const dur = Number(d.duration ?? 0)
      const pct = dur ? (d.currentTime / dur) * 100 : 0
      setHeard(true)
      setTick({ pct, time: d.currentTime, dur })
      if ((d.event === 'timeupdate' || d.event === 'pause' || d.event === 'ended') && now - lastSave.current > 5000) {
        lastSave.current = now
        saveProgress({
          id,
          type,
          title: detail?.meta.title ?? 'Untitled',
          poster: detail?.meta.poster ?? null,
          backdrop: detail?.meta.backdrop ?? null,
          progress: Math.round(pct),
          timestamp: Math.floor(d.currentTime),
          duration: Math.floor(dur),
          season,
          episode,
          source,
        })
      }
    },
    [id, type, season, episode, source, detail, setTick],
  )

  useEffect(() => {
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onMessage])

  // one last save when you leave
  useEffect(() => {
    const bye = () => {
      if (!tick) return
      saveProgress({
        id,
        type,
        title: detail?.meta.title ?? 'Untitled',
        poster: detail?.meta.poster,
        backdrop: detail?.meta.backdrop,
        progress: Math.round(tick.pct),
        timestamp: Math.floor(tick.time),
        duration: Math.floor(tick.dur),
        season,
        episode,
        source,
      })
    }
    window.addEventListener('pagehide', bye)
    return () => {
      window.removeEventListener('pagehide', bye)
      bye()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick?.time, id, type, season, episode, source])

  useEffect(() => {
    const prev = document.title
    if (detail) document.title = `${detail.meta.title}${type === 'tv' && season ? ` S${season}·E${episode}` : ''} — Priva`
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) return
        navigate(cardHref(type, id, detail?.meta.title))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.title = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [detail, navigate, type, id, season, episode])

  const nextHref = type === 'tv' && season && episode ? `/watch/tv/${id}/${season}/${(episode ?? 1) + 1}` : null

  return (
    <div className="player-shell">
      <div className="player-bar">
        <button className="icon-btn icon-btn--quiet" onClick={() => navigate(cardHref(type, id, detail?.meta.title))} aria-label="Back to the title page">
          <IcChevronLeft />
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.01em' }}>
            {detail?.meta.title ?? 'Loading…'}
            {type === 'tv' && season ? (
              <span className="hint" style={{ fontWeight: 400 }}>
                {' '}
                · S{season}·E{episode}
              </span>
            ) : null}
          </div>
          <div className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: heard ? 'var(--color-jade)' : 'var(--color-dim)' }}>{heard ? '● playing' : '○ waiting for the player'}</span>
            {tick ? (
              <span className="num">
                {secondsToClock(tick.time)} / {tick.dur ? secondsToClock(tick.dur) : '—'}
              </span>
            ) : null}
            {tick && tick.dur ? <span className="num">{Math.round(tick.pct)}%</span> : null}
          </div>
        </div>

        <div className="sources" style={{ marginLeft: 'auto' }}>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              className={cn('chip', source === s.id && 'is-on')}
              style={{ height: 30, fontSize: 12.5 }}
              onClick={() => {
                if (source === s.id) return
                setSource(s.id)
                setHeard(false)
                toast.push(`Switched to ${s.name}`, { kind: 'info', timeout: 2200 })
              }}
              title={s.blurb}
            >
              <IcPlay size={12} /> {s.name}
            </button>
          ))}
          {nextHref ? (
            <Link to={nextHref} className="chip" style={{ height: 30, fontSize: 12.5 }} title="Next episode">
              <IcTv size={13} /> Next
            </Link>
          ) : null}
          <button
            className="icon-btn icon-btn--quiet"
            aria-label="Fullscreen"
            onClick={() => {
              const el = stageRef.current
              if (!el) return
              if (document.fullscreenElement) void document.exitFullscreen()
              else void el.requestFullscreen?.().catch(() => toast.push('Your browser said no to fullscreen', { kind: 'bad' }))
            }}
          >
            <IcExpand size={16} />
          </button>
          <a className="icon-btn icon-btn--quiet" href={src} target="_blank" rel="noreferrer noopener" aria-label="Open the player directly" title="Open the source directly — useful when an embed is blocked">
            <IcExternal size={15} />
          </a>
          <button
            className="icon-btn icon-btn--quiet"
            aria-label={saved ? 'Remove from My List' : 'Save to My List'}
            onClick={() => {
              if (!detail) return
              toggleMyList(detail.meta)
            }}
          >
            {saved ? <IcBookmarkFilled size={16} /> : <IcBookmark size={16} />}
          </button>
          <button className="icon-btn icon-btn--quiet" aria-label="Add to collection" onClick={() => detail && picker.open(detail.meta)}>
            <IcLayers size={15} />
          </button>
          <button className="icon-btn icon-btn--quiet" aria-label="Downloads" onClick={() => setDownload(true)}>
            <IcDownload size={15} />
          </button>
        </div>
      </div>

      <div className="player-stage" ref={stageRef}>
        {!heard ? (
          <div className="player-stage__boot" style={{ backgroundImage: detail?.meta.backdrop ? `url(${api.backdropUrl(detail.meta.backdrop, 'w1280')})` : undefined }}>
            <span className="spinner" />
            <div style={{ textAlign: 'center', maxWidth: '34ch' }}>
              <b style={{ fontSize: 14 }}>{sourceName(source)} is waking up</b>
              <p className="hint" style={{ marginTop: 6 }}>
                Nothing streams? Try the other source in the bar above, or open it directly with the ↗ button. Some browser
                extensions block third-party frames.
              </p>
            </div>
          </div>
        ) : null}
        <iframe
          key={`${source}-${id}-${season ?? 0}-${episode ?? 0}-${startAt}`}
          src={src}
          title={detail ? `${detail.meta.title} — player` : 'Player'}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <Modal open={download} onClose={() => setDownload(false)} title="Download this" subtitle="Both hosts are third-party and unaffiliated." wide>
        <Downloads target={{ type, id, season, episode, title: detail?.meta.title }} />
      </Modal>
    </div>
  )
}
