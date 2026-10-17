import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../lib/utils'
import { MediaCard } from './MediaCard'
import { SmartLink } from './SmartLink'
import { IcAlert, IcChevronLeft, IcChevronRight, IcRefresh } from './icons'
import type { CardLike } from '../lib/card'

interface RailProps {
  id?: string
  title: ReactNode
  note?: ReactNode
  seeAllLabel?: string
  seeAllTo?: string
  items: CardLike[]
  loading?: boolean
  error?: string | null
  ranked?: boolean
  action?: ReactNode
  onRetry?: () => void
  compact?: boolean
  cardWidth?: number
  count?: number
}

/** A horizontal strip. Arrows only appear on pointer devices; on touch the
 *  same track becomes a snap scroller, so nothing is duplicated. */
export function Rail({
  id,
  title,
  note,
  seeAllLabel,
  seeAllTo,
  items,
  loading,
  error,
  ranked,
  action,
  onRetry,
  compact,
  cardWidth,
  count,
}: RailProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.82), behavior: 'smooth' })
  }, [])

  const show = items.slice(0, count ?? items.length)

  return (
    <section className={cn('rail', ranked && 'rail--ranked')} id={id} style={cardWidth ? ({ '--card-w': `${cardWidth}px` } as CSSProperties) : undefined}>
      <header className="rail__head">
        <h2>{title}</h2>
        {note ? <span className="rail__note">{note}</span> : null}
        <div className="grow" />
        {action}
        {seeAllTo && seeAllLabel ? (
          <SmartLink className="pill pill--link" to={seeAllTo}>
            {seeAllLabel}
            <IcChevronRight size={14} />
          </SmartLink>
        ) : null}
        <div className="rail__arrows">
          <button className="icon-btn" onClick={() => scrollBy(-1)} aria-label="Scroll left">
            <IcChevronLeft />
          </button>
          <button className="icon-btn" onClick={() => scrollBy(1)} aria-label="Scroll right">
            <IcChevronRight />
          </button>
        </div>
      </header>

      {error ? (
        <div className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <IcAlert size={18} style={{ color: 'var(--color-rose)' }} />
          <span className="muted" style={{ fontSize: 13.5 }}>
            {error}
          </span>
          {onRetry ? (
            <button className="btn btn--sm btn--outline" style={{ marginLeft: 'auto' }} onClick={onRetry}>
              <IcRefresh size={14} /> Retry
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rail__track no-bar" ref={trackRef}>
          {loading && !show.length
            ? Array.from({ length: 7 }, (_, i) => <div className="skel skel--poster" key={i} />)
            : show.map((item, i) => (
                <MediaCard key={`${item.id}-${i}`} item={item} index={i} ranked={ranked} compact={compact} />
              ))}
        </div>
      )}
    </section>
  )
}

export function RailEmpty({ children }: { children: ReactNode }) {
  return <div className="empty" style={{ padding: '34px 18px' }}>{children}</div>
}
