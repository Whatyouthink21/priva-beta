import { memo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { cardHref, normalize, type CardLike } from '../lib/card'
import { Poster } from './Poster'
import { SmartLink } from './SmartLink'
import { IcBookmark, IcBookmarkFilled, IcLayers, IcPlay } from './icons'
import { shallowEqual, useStoreSelector } from '../hooks/useStore'
import { progressKey, toggleMyList } from '../lib/store'
import type { Snapshot } from '../lib/store'
import { useToast } from '../contexts/ToastProvider'
import { usePicker } from '../contexts/PickerProvider'

/** computed once: a card must not re-decide what year it is on every render */
const THIS_YEAR = new Date().getFullYear()

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
  const toast = useToast()
  const picker = usePicker()
  const navigate = useNavigate()
  const { watch, saved } = useStoreSelector(
    useCallback(
      (s: Snapshot) => ({
        watch: s.data.progress[progressKey(meta.type, meta.id)],
        saved: s.data.myList.includes(meta.id),
      }),
      [meta.type, meta.id],
    ),
    shallowEqual,
  )
  const pct = watch && watch.progress > 1 && watch.progress < 93 ? Math.round(watch.progress) : 0
  /* the wide still is only ever seen on hover, so it is not fetched until
   * then — a rail of twenty cards used to pull twenty extra images */
  const backdrop = item.backdrop_path ?? meta.backdrop
  const [peek, setPeek] = useState(false)
  const [peekReady, setPeekReady] = useState(false)

  const card = (
    <article
      className="card"
      data-peek={peekReady ? 'ready' : undefined}
      onMouseEnter={() => setPeek(true)}
      onMouseLeave={() => setPeek(false)}
      onFocus={() => setPeek(true)}
      onBlur={() => setPeek(false)}
    >
      <div className="card__media">
        <Poster path={item.poster_path ?? meta.poster} size="w342" alt={meta.title} eager={index !== undefined && index < 3} />
        {backdrop && peek ? <Poster path={backdrop} size="w780" alt="" onLoad={() => setPeekReady(true)} /> : null}

        <div className="card__flag">
          {meta.year && meta.year >= THIS_YEAR - 1 ? <span className="badge badge--flare">new</span> : null}
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
            <button
              className="icon-btn"
              aria-label={`Play ${meta.title}`}
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                navigate(cardHref(meta.type, meta.id, meta.title) + '?start=play')
              }}
            >
              <IcPlay />
            </button>
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

      {/* the one link of the card, stretched over the whole tile — a link
       * inside a link is invalid HTML and breaks the click target */}
      <SmartLink className="card__link" to={cardHref(meta.type, meta.id, meta.title)} aria-label={meta.title} />
    </article>
  )

  if (!ranked) return card

  return (
    <div className="rank">
      <span className="rank__num num" aria-hidden="true">
        {(index ?? 0) + 1}
      </span>
      {card}
    </div>
  )
})


