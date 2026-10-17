import { useEffect, useRef, useState } from 'react'
import { trailerUrl, type Trailer } from '../lib/tmdb'
import { useTrailerAllowed } from '../hooks/useMedia'
import { IcPlay } from './icons'
import { cn } from '../lib/utils'
import { usePageVisible } from '../hooks/useMedia'

interface Props {
  backdrop?: string | null
  poster?: string | null
  trailer: Trailer | null
  title: string
  /** detail pages want the sound off forever; the hero is always muted anyway */
  className?: string
  /** dim the media a little more for text contrast */
  scrim?: boolean
  children?: React.ReactNode
}

/**
 * The background trailer.
 *
 * It is an embedded YouTube frame, which is not free, so: it only mounts once
 * the hero is in view and the tab is visible, it unmounts when you scroll
 * away, it never runs on cellular or when "reduce motion" is on, and the
 * backdrop image stays underneath so there is never a black box.
 */
export function HeroTrailer({ backdrop, poster, trailer, title, className, scrim = true, children }: Props) {
  const allowed = useTrailerAllowed()
  const visible = usePageVisible()
  const hostRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [wantSound, setWantSound] = useState(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio > 0.35)
        if (!entry.isIntersecting) setReady(false)
      },
      { threshold: [0, 0.35, 0.8] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const shouldMount = allowed && !!trailer && inView && visible
  const mountKey = `${trailer?.key ?? 'none'}-${wantSound ? 'sound' : 'mute'}`

  useEffect(() => {
    if (!shouldMount) {
      setMounted(false)
      return
    }
    // wait for an idle moment so the first paint is never blocked by a video
    let cancel = false
    const schedule = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 400))
    const handle = schedule(() => {
      if (!cancel) setMounted(true)
    })
    return () => {
      cancel = true
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle as number)
    }
  }, [shouldMount])

  // safety net: if the frame never reports ready, drop back to the still
  useEffect(() => {
    if (!mounted || ready) return
    const t = setTimeout(() => setReady(true), 2600)
    return () => clearTimeout(t)
  }, [mounted, ready])

  return (
    <div className={cn('hero__media', className)} ref={hostRef} data-paused={inView ? undefined : 'true'}>
      <img
        src={backdrop ? `https://image.tmdb.org/t/p/w1280${backdrop}` : poster ? `https://image.tmdb.org/t/p/w780${poster}` : ''}
        alt=""
        aria-hidden="true"
        data-shown={ready ? 'false' : 'true'}
        fetchPriority="high"
        decoding="async"
        style={backdrop || poster ? undefined : { display: 'none' }}
      />
      {mounted && trailer ? (
        <iframe
          key={mountKey}
          src={trailerUrl(trailer, { mute: !wantSound, start: wantSound ? 0 : 2 })}
          title={`${title} — trailer`}
          data-shown="true"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          tabIndex={-1}
          onLoad={() => setReady(true)}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}
      {scrim ? <div className="hero__scrim" /> : null}
      {children}
      {mounted && !wantSound ? (
        <button
          className="sound-toggle"
          onClick={() => setWantSound(true)}
          title="Turn the trailer sound on"
          aria-label="Unmute trailer"
        >
          <IcPlay size={13} /> <span>sound on</span>
        </button>
      ) : null}
    </div>
  )
}
