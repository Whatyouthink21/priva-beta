import { ago, cn, img, secondsToClock } from '../lib/utils'
import { SmartLink } from './SmartLink'
import { IcClose, IcPlay, IcClock } from './icons'
import { clearProgress, progressKey, saveProgress } from '../lib/store'
import type { WatchProgress } from '../lib/types'
import { useToast } from '../contexts/ToastProvider'
import { cardHref } from '../lib/card'
import { useStore } from '../hooks/useStore'

/** The "keep your place" tile: 16:9 still, a bar, and the part that is left. */
export function WideCard({ entry, onOpen }: { entry: WatchProgress; onOpen?: () => void }) {
  const toast = useToast()
  const { data } = useStore()
  const key = progressKey(entry.type, entry.id, entry.season, entry.episode)
  const pct = Math.max(1, Math.min(99, Math.round(entry.progress)))
  const left = entry.duration ? Math.max(0, Math.round((entry.duration * (100 - pct)) / 100 / 60)) : null
  const saved = data.myList.includes(entry.id)

  return (
    <article className="wide-card">
      <SmartLink to={cardHref(entry.type, entry.id, entry.title)} className="wide-card__media" onClick={onOpen} aria-label={entry.title}>
        {entry.backdrop || entry.poster ? (
          <img src={img(entry.backdrop ?? entry.poster, entry.backdrop ? 'w780' : 'w342')} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="noart" style={{ position: 'absolute', inset: 0 }}>
            <IcPlay size={18} />
          </div>
        )}
        <span className="wide-card__play">
          <IcPlay size={16} />
        </span>
        <span className="card__progress" style={{ height: 4 }}>
          <i style={{ width: `${pct}%` }} />
        </span>
      </SmartLink>

      <div className="wide-card__body">
        <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
          <SmartLink to={cardHref(entry.type, entry.id, entry.title)} className="wide-card__title truncate">
            {entry.title}
          </SmartLink>
          <div className="wide-card__meta">
            {entry.type === 'tv' && entry.season ? (
              <span>
                S{entry.season}·E{entry.episode} {entry.episodeName ? <span className="truncate">· {entry.episodeName}</span> : null}
              </span>
            ) : null}
            <span className={cn('hint', 'num')}>{ago(entry.updatedAt)}</span>
          </div>
          <div className="wide-card__foot">
            <span className="num" style={{ color: 'var(--color-flare)' }}>
              {pct}%
            </span>
            {left ? (
              <span className="hint" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <IcClock size={12} /> {left} min left
              </span>
            ) : (
              <span className="hint">{secondsToClock(entry.timestamp)} in</span>
            )}
            {saved ? <span className="badge">in list</span> : null}
            <button
              className="icon-btn icon-btn--quiet"
              style={{ marginLeft: 'auto', width: 26, height: 26 }}
              aria-label={`Remove ${entry.title} from Continue watching`}
              title="Remove from Continue watching"
              onClick={() => {
                clearProgress(key)
                toast.push(`Cleared progress for ${entry.title}`, {
                  kind: 'ok',
                  action: {
                    label: 'Undo',
                    run: () => saveProgress({ ...entry, source: entry.source }),
                  },
                })
              }}
            >
              <IcClose size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
