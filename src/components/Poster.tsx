import { useState } from 'react'
import { cn, img } from '../lib/utils'
import { IcFilm } from './icons'

interface PosterProps {
  path?: string | null
  /** TMDB size token: w154 w185 w342 w500 w780 w1280 original */
  size?: string
  alt?: string
  className?: string
  eager?: boolean
  /** crop taller images instead of letterboxing */
  contain?: boolean
  onLoad?: () => void
}

/** Image with a fade-in, an honest fallback, and the attributes that keep
 *  mobile scroll smooth (explicit lazy loading, no layout shift). */
export function Poster({ path, size = 'w500', alt = '', className, eager = false, contain, onLoad }: PosterProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = img(path, size)

  if (!src || failed) {
    return (
      <div className={cn('noart', className)} aria-hidden="true">
        <IcFilm size={22} />
        <span>no artwork</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      // @ts-expect-error fetchpriority is not in the React 19 types yet
      fetchpriority={eager ? 'high' : undefined}
      decoding="async"
      style={contain ? { objectFit: 'contain' } : undefined}
      data-loaded={loaded ? 'true' : 'false'}
      onLoad={() => {
        setLoaded(true)
        onLoad?.()
      }}
      onError={() => setFailed(true)}
    />
  )
}
