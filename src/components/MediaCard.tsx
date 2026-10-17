import { memo } from 'react'
import { cn } from '../lib/utils'
import { cardHref, normalize, type CardLike } from '../lib/card'
import { Poster } from './Poster'
import { SmartLink } from './SmartLink'
import { IcBookmark, IcBookmarkFilled, IcLayers, IcPlay } from './icons'
import { useStore } from '../hooks/useStore'
import { inMyList, progressKey, toggleMyList } from '../lib/store'
import { useToast } from '../contexts/ToastProvider'
import { usePicker } from '../contexts/PickerProvider'

interface Props {
  item: CardLike
  index?: number
  ranked?: boolean
  /** show the resume bar under the artwork */
  progress?: boolean
  /** compact = poster only, no caption underneath */
  compact?: boolean
}

/** The poster tile used in every rail and grid on the site. */
export const MediaCard = memo(function MediaCard({ item, index, ranked, progress = true, compact }: Props) {
  const meta = normalize(item)
  const { data } = useStore()
  const toast = useToast()
  const picker = usePicker()
  const watch = data.progress[progressKey(meta.type, meta.id)]
  const saved = inMyList(meta.id)
  const pct = watch && watch.progress > 1 && watch.progress < 93 ? Math.round(watch.progress) : 0

  const card = (
    <article className="card">
      <div className="card__media">
        <Poster path={item.poster_path ?? meta.poster} size="w342" alt={meta.title} eager={index !== undefined && index < 3} />
        {item.backdrop_path || meta.backdrop ? (
          <Poster path={item.backdrop_path ?? meta.backdrop} size="w780" alt="" />
        ) : null}

        <div className="card__flag">
          {meta.year && meta.year >= new Date().getFullYear() - 1 ? <span className="badge badge--flare">new</span> : null}
          {item.adult ? <span className="badge">18+</span> : null}
          {!compact && watch ? (
            <span className="badge" title={`Watched ${Math.round(watch.progress)}%`}>
              {watch.type === 'tv' && watch.season ? `S${watch.season}·E${watch.episode}` : `${Math.round(watch.progress)}%`}
            </span>
          ) : null}
        </div>

        {meta.rating ? (
          <div className="card__score">
            <span className="rating" style={{ fontSize: 11.5 }}>
              <i>★</i>
              {meta.rating.toFixed(1)}
            </span>
          </div>
        ) : null}

        <div className="card__veil">
          <div className="card__title">{meta.title}</div>
          <div className="card__sub">
            {[meta.year, meta.type === 'tv' ? 'series' : 'film'].filter(Boolean).join(' · ')}
          </div>
          <div className="card__actions">
            <SmartLink className="icon-btn" to={cardHref(meta.type, meta.id, meta.title) + '?start=play'} aria-label={`Play ${meta.title}`} tabIndex={-1}>
              <IcPlay />
            </SmartLink>
            <button
              className={cn('icon-btn', saved && 'is-on')}
              aria-label={saved ? 'Remove from My List' : 'Save to My List'}
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const added = toggleMyList(meta)
                toast.push(added ? `Saved ${meta.title} to My List` : `Removed ${meta.title}`, {
                  kind: 'ok',
                  action: {
                    label: 'Undo',
                    run: () => toggleMyList(meta),
                  },
                })
              }}
            >
              {saved ? <IcBookmarkFilled /> : <IcBookmark />}
            </button>
            <button
              className="icon-btn"
              aria-label={`Add ${meta.title} to a collection`}
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                picker.open(meta)
              }}
            >
              <IcLayers />
            </button>
          </div>
        </div>

        {progress && pct ? (
          <div className="card__progress" title={`${pct}% watched`}>
            <i style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="card__body">
          <div className="card__name clamp-2">{meta.title}</div>
          <div className="card__meta">
            <span>{meta.year ?? '—'}</span>
            {watch?.type === 'tv' && watch.season ? <span>S{watch.season}·E{watch.episode}</span> : null}
            {progress && pct ? <span style={{ color: 'var(--color-flare)' }}>{pct}%</span> : null}
          </div>
        </div>
      ) : null}
    </article>
  )

  if (!ranked) {
    return (
      <SmartLink to={cardHref(meta.type, meta.id, meta.title)} aria-label={meta.title} style={{ display: 'block' }}>
        {card}
      </SmartLink>
    )
  }

  return (
    <div className="rank">
      <span className="rank__num num" aria-hidden="true">
        {(index ?? 0) + 1}
      </span>
      <SmartLink to={cardHref(meta.type, meta.id, meta.title)} aria-label={meta.title} style={{ display: 'block' }}>
        {card}
      </SmartLink>
    </div>
  )
})


