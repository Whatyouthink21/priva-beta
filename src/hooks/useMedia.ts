import { useEffect, useMemo, useState } from 'react'
import { useStore } from './useStore'
import { progressKey } from '../lib/store'
import type { PlayerSource, TitleMeta } from '../lib/types'

/** true while the tab is actually looking at you */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : document.visibilityState === 'visible'))
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

export function usePrefers<T extends keyof MediaQueryListMap>(query: T, fallback = false): boolean {
  const [matches, setMatches] = useState(fallback)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const map: MediaQueryListMap = {
      motion: '(prefers-reduced-motion: reduce)',
      coarse: '(pointer: coarse)',
      small: '(max-width: 899px)',
      hover: '(hover: hover)',
    }
    const mq = window.matchMedia(map[query])
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

interface MediaQueryListMap {
  motion: string
  coarse: string
  small: string
  hover: string
}

/** Metered connection? Cheap heuristic: Network Information API when present,
 *  otherwise assume cellular and hold the trailers back. */
export function useSaverMode(): boolean {
  const [saver, setSaver] = useState(false)
  useEffect(() => {
    type Conn = {
      saveData?: boolean
      effectiveType?: string
      addEventListener?: (type: string, cb: () => void) => void
      removeEventListener?: (type: string, cb: () => void) => void
    }
    const conn = (navigator as { connection?: Conn }).connection
    if (!conn) return
    const update = () => setSaver(!!conn.saveData || /2g/.test(conn.effectiveType ?? ''))
    update()
    conn.addEventListener?.('change', update)
    return () => conn.removeEventListener?.('change', update)
  }, [])
  return saver
}

/** Whether a background trailer should run at all. This is the single place
 *  that decides, so the hero and the detail pages behave identically. */
export function useTrailerAllowed(): boolean {
  const { prefs } = useStore()
  const reducedMotion = usePrefers('motion') || prefs.reduceMotion
  const small = usePrefers('small')
  const saver = useSaverMode()
  const visible = usePageVisible()
  return useMemo(() => {
    if (prefs.heroTrailers === 'off' || !visible) return false
    if (saver || reducedMotion) return false
    if (prefs.heroTrailers === 'wifi' && small) return false
    return true
  }, [prefs.heroTrailers, visible, saver, reducedMotion, small])
}

export interface WatchLink {
  href: string
  source: PlayerSource
  startAt: number
  progress: number
  resumeLabel: string | null
}

/** Where "Play" goes, including the resume offset if we have one. */
export function useWatchLink(
  meta: Pick<TitleMeta, 'id' | 'type'>,
  opts: { season?: number; episode?: number; source?: PlayerSource; forceRestart?: boolean } = {},
): WatchLink {
  const { prefs, data } = useStore()
  const { season, episode } = opts
  const entry = data.progress[progressKey(meta.type, meta.id, season, episode)]
  const source = opts.source ?? prefs.defaultSource
  const resumable = !!entry && entry.progress > 1 && entry.progress < 93
  const startAt = !opts.forceRestart && prefs.resumePlayback && resumable ? Math.floor(entry!.timestamp) : 0
  const params = new URLSearchParams()
  if (startAt) params.set('t', String(startAt))
  if (source !== prefs.defaultSource) params.set('src', source)
  const qs = params.toString()
  const base =
    meta.type === 'tv' && season ? `/watch/tv/${meta.id}/${season}/${episode ?? 1}` : `/watch/${meta.type}/${meta.id}`
  return {
    href: base + (qs ? `?${qs}` : ''),
    source,
    startAt,
    progress: entry?.progress ?? 0,
    resumeLabel: resumable ? `Resume · ${Math.round(entry!.progress)}% watched` : null,
  }
}
