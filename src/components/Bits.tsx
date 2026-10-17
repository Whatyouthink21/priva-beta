import type { ReactNode } from 'react'
import { IcAlert, IcRefresh } from './icons'
import { cn } from '../lib/utils'

/* Small shared bits. One file so pages can grab a heading, an error state or
 * a key/value row without twenty import lines. */

export function PageHead({
  kicker,
  title,
  lead,
  children,
  className,
}: {
  kicker?: ReactNode
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('section-title', className)} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        {kicker ? <div className="kicker kicker--flare" style={{ marginBottom: 8 }}>{kicker}</div> : null}
        <h1>{title}</h1>
        {lead ? <p className="page-lead" style={{ marginTop: 10 }}>{lead}</p> : null}
      </div>
      {children ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div> : null}
    </header>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, borderColor: 'color-mix(in oklab, var(--color-rose) 30%, transparent)' }}>
      <IcAlert size={18} style={{ color: 'var(--color-rose)', flex: 'none' }} />
      <span style={{ fontSize: 13.5, color: 'var(--color-mute)' }}>{message}</span>
      {onRetry ? (
        <button className="btn btn--sm btn--outline" style={{ marginLeft: 'auto' }} onClick={onRetry}>
          <IcRefresh size={14} /> Try again
        </button>
      ) : null}
    </div>
  )
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div>
      <b>{label}</b>
      <span>{value}</span>
    </div>
  )
}

export function Rail2({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid', className)} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>{children}</div>
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="panel__head" style={{ marginTop: 26 }}>
      <h3>{children}</h3>
      {right ? <div className="grow">{right}</div> : null}
    </div>
  )
}

export function SkeletonRail({ count = 7, wide = false }: { count?: number; wide?: boolean }) {
  return (
    <div className="rail__track no-bar" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('skel', wide ? 'skel--wide' : 'skel--poster')} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 18 }: { count?: number }) {
  return (
    <div className="grid-posters" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel skel--poster" />
      ))}
    </div>
  )
}
