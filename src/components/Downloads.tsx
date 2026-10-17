import { useCallback, useEffect, useState } from 'react'
import { DOWNLOAD_SOURCES } from '../lib/constants'
import { downloadUrl, vidsrcDownloadUrl, vidvaultDownloadUrl } from '../lib/players'
import type { MediaType } from '../lib/types'
import { formatBytes } from '../lib/utils'
import { IcExternal, IcDownload, IcRefresh } from './icons'

export interface DownloadTarget {
  type: MediaType
  id: number
  season?: number
  episode?: number
  title?: string
}

interface VidsrcQuality {
  quality: string
  height?: number
  sizeLabel?: string
  size?: number
  videoCodec?: string
  mp4: string
  mkv?: string
}

interface VidsrcPayload {
  media?: { title?: string; year?: string }
  filename?: string
  downloads?: VidsrcQuality[]
  subtitles?: { label: string; lang: string; srt?: string; vtt?: string }[]
  error?: string
}

/**
 * The download block. vidSRC exposes a JSON API, so when it answers we render
 * the real qualities and sizes; when it does not (CORS, rate limit, offline)
 * we hand over a plain link to its page instead of pretending.
 */
export function Downloads({ target, compact }: { target: DownloadTarget; compact?: boolean }) {
  const [payload, setPayload] = useState<VidsrcPayload | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')

  const load = useCallback(async () => {
    setState('loading')
    const api =
      target.type === 'tv' && target.season && target.episode
        ? `https://dl.vidsrc.party/api/download/tv/${target.id}/${target.season}/${target.episode}`
        : `https://dl.vidsrc.party/api/download/movie/${target.id}`
    try {
      const res = await fetch(api)
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as VidsrcPayload
      if (!json.downloads?.length) throw new Error('empty')
      setPayload(json)
      setState('ready')
    } catch {
      setState('failed')
    }
  }, [target.id, target.type, target.season, target.episode])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="dl-grid">
      <section className="panel dl-card">
        <header className="dl-card__head">
          <div>
            <h3>{DOWNLOAD_SOURCES[0].name}</h3>
            <p className="hint">{DOWNLOAD_SOURCES[0].blurb}</p>
          </div>
          <a
            className="btn btn--sm btn--outline"
            href={vidsrcDownloadUrl(target)}
            target="_blank"
            rel="noreferrer noopener"
          >
            <IcExternal size={14} /> Open page
          </a>
        </header>

        {state === 'loading' ? <p className="hint">Asking {DOWNLOAD_SOURCES[0].host} for what it has…</p> : null}

        {state === 'failed' ? (
          <div className="dl-fallback">
            <p className="hint">
              The API did not answer from here (it usually means CORS). The page itself always works — it lists every quality and
              subtitle file.
            </p>
            <button className="btn btn--sm btn--glass" onClick={() => void load()}>
              <IcRefresh size={14} /> Ask again
            </button>
          </div>
        ) : null}

        {state === 'ready' && payload?.downloads?.length ? (
          <>
            <div className="dl-rows">
              {payload.downloads.map((q) => (
                <div className="dl-row" key={q.quality}>
                  <span className="dl-row__q num">{q.quality}</span>
                  <span className="dl-row__size muted">{q.sizeLabel || formatBytes(q.size ?? 0)}</span>
                  <span className="dl-row__codec hint">{q.videoCodec?.split('.')[0]}</span>
                  <span className="dl-row__act">
                    <a className="btn btn--sm btn--primary" href={q.mp4} target="_blank" rel="noreferrer noopener">
                      <IcDownload size={14} /> MP4
                    </a>
                    {q.mkv ? (
                      <a className="btn btn--sm btn--outline" href={q.mkv} target="_blank" rel="noreferrer noopener">
                        MKV
                      </a>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            {payload.subtitles?.length ? (
              <div className="dl-subs">
                <span className="kicker">subtitles</span>
                <div className="dl-subs__list">
                  {payload.subtitles.slice(0, compact ? 6 : 14).map((s) => (
                    <a key={s.lang + s.label} className="pill pill--link" href={s.srt ?? s.vtt} target="_blank" rel="noreferrer noopener">
                      {s.label} · srt
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="panel dl-card">
        <header className="dl-card__head">
          <div>
            <h3>{DOWNLOAD_SOURCES[1].name}</h3>
            <p className="hint">{DOWNLOAD_SOURCES[1].blurb}</p>
          </div>
          <span className="badge">vidvault</span>
        </header>
        <p className="hint" style={{ marginBottom: 12 }}>
          Opens a page with 360p, 720p and 1080p buttons. Nothing to wait for — the files are already converted.
        </p>
        <a className="btn btn--block" href={vidvaultDownloadUrl(target)} target="_blank" rel="noreferrer noopener">
          <IcDownload size={16} /> {target.type === 'tv' ? `Episode S${target.season}·E${target.episode}` : 'Download page'}
        </a>
        <a
          className="btn btn--link"
          style={{ marginTop: 10, fontSize: 12.5 }}
          href={downloadUrl('vidvault', target)}
          target="_blank"
          rel="noreferrer noopener"
        >
          {DOWNLOAD_SOURCES[1].host}
        </a>
      </section>
    </div>
  )
}
