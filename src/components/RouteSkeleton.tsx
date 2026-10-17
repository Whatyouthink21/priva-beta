import { cn } from '../lib/utils'

/** Shown while a lazily loaded route chunk arrives. It has roughly the shape
 *  of a page so nothing jumps when the real thing mounts. */
export function RouteSkeleton({ bare }: { bare?: boolean }) {
  if (bare) {
    return (
      <div className="player-shell" aria-busy="true">
        <div className="player-bar">
          <span className="skel skel--text" style={{ width: 160 }} />
        </div>
        <div className="player-stage">
          <div className="player-stage__boot">
            <span className="spinner" />
            <span className="hint">Loading player…</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('wrap', 'page')}>
      <div className="skel skel--wide" style={{ height: 'min(58vh, 460px)', borderRadius: 20, marginBottom: 26 }} />
      <div className="rail__head">
        <span className="skel skel--text" style={{ width: 180, height: 20 }} />
      </div>
      <div className="rail__track no-bar" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skel skel--poster" style={{ width: 'var(--card-w, 176px)' }} />
        ))}
      </div>
    </div>
  )
}
