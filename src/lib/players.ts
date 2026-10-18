/* The two embeddable players Priva speaks to, plus the two download
 * services. All of it is just URL building — the iframes never talk back to
 * us except through postMessage, which the watch page listens for.
 *
 *   Vidstuck  https://vidstuck.cc/embed/{movie|tv}/{id}[/season/episode]
 *   TGVID     https://tgvid.lovable.app/embed/{movie|tv}/{id}[/season/episode]
 */

import type { MediaType, PlayerSource, PrivaPrefs } from './types'

export const VIDSTUCK_ORIGIN = 'https://vidstuck.cc'
export const TGVID_ORIGIN = 'https://tgvid.lovable.app'

export interface EmbedTarget {
  type: MediaType
  id: number
  season?: number
  episode?: number
}

export interface EmbedOptions {
  prefs: Pick<PrivaPrefs, 'accent' | 'branding' | 'subtitle' | 'server' | 'tgvidLang' | 'autoPlayNext'>
  /** seconds to resume from */
  startAt?: number
}

export function vidstuckUrl({ type, id, season, episode }: EmbedTarget, o: EmbedOptions): string {
  const p = new URLSearchParams()
  if (o.prefs.accent) p.set('color', o.prefs.accent.replace('#', ''))
  if (o.prefs.branding) p.set('branding', o.prefs.branding)
  if (o.prefs.subtitle) p.set('subtitle', o.prefs.subtitle)
  if (o.prefs.server) p.set('server', o.prefs.server)
  if (type === 'tv' && season && episode) {
    p.set('nextEpisode', 'true')
    p.set('episodeSelector', 'true')
    if (o.prefs.autoPlayNext) p.set('autoplayNextEpisode', 'true')
  }
  p.set('overlay', 'true')
  if (o.startAt && o.startAt > 5) p.set('progress', String(Math.floor(o.startAt)))
  return `${VIDSTUCK_ORIGIN}/${embedPath(type, id, season, episode)}?${p}`
}

export function tgvidUrl({ type, id, season, episode }: EmbedTarget, o: EmbedOptions): string {
  const p = new URLSearchParams()
  if (o.prefs.accent) p.set('color', o.prefs.accent.replace('#', ''))
  p.set('back', 'false')
  if (o.prefs.tgvidLang) p.set('lang', o.prefs.tgvidLang)
  if (type === 'tv') {
    p.set('episodeSelector', 'true')
    p.set('autoplayNextEp', o.prefs.autoPlayNext ? 'true' : 'false')
  }
  if (o.startAt && o.startAt > 5) p.set('t', String(Math.floor(o.startAt)))
  return `${TGVID_ORIGIN}/${embedPath(type, id, season, episode)}?${p}`
}

const embedPath = (type: MediaType, id: number, season?: number, episode?: number) =>
  type === 'tv' && season && episode ? `embed/tv/${id}/${season}/${episode}` : `embed/movie/${id}`

export function playerUrl(source: PlayerSource, target: EmbedTarget, o: EmbedOptions): string {
  return source === 'tgvid' ? tgvidUrl(target, o) : vidstuckUrl(target, o)
}

export function sourceName(source: PlayerSource): string {
  return source === 'tgvid' ? 'Server 2' : 'Server 1'
}

/* ---------------- downloads ---------------- */

export interface DownloadTarget {
  type: MediaType
  id: number
  season?: number
  episode?: number
}

export type DownloadSourceId = 'vidsrc' | 'vidvault'

/** https://dl.vidsrc.party — the page carries every quality the source has,
 *  MP4 or MKV, plus SRT/VTT subtitle files. */
export function vidsrcDownloadUrl(t: DownloadTarget, quality?: string, mkv = false): string {
  const base =
    t.type === 'tv' && t.season && t.episode
      ? `https://dl.vidsrc.party/tv/${t.id}/${t.season}/${t.episode}`
      : `https://dl.vidsrc.party/movie/${t.id}`
  if (!quality) return base
  const p = new URLSearchParams({ quality })
  if (mkv) p.set('format', 'mkv')
  return `${base}?${p}`
}

/** https://vidvault.to — pre-converted 360p–1080p files, opens instantly. */
export function vidvaultDownloadUrl(t: DownloadTarget): string {
  return t.type === 'tv' && t.season && t.episode
    ? `https://vidvault.to/tv/${t.id}/${t.season}/${t.episode}`
    : `https://vidvault.to/movie/${t.id}`
}

export function downloadUrl(source: DownloadSourceId, t: DownloadTarget, quality?: string): string {
  return source === 'vidvault'
    ? vidvaultDownloadUrl(t)
    : vidsrcDownloadUrl(t, quality)
}

export const DOWNLOAD_QUALITIES = ['best', '1080p', '720p', '480p'] as const
