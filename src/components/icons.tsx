import type { ReactNode, SVGProps } from 'react'

/* Hand-written 24px stroke icons so Priva does not ship an entire icon
 * package for thirty glyphs. They inherit currentColor and size. */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function icon(name: string, children: ReactNode, opts: { fill?: boolean; viewBox?: string } = {}) {
  const Comp = ({ size = 20, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox={opts.viewBox ?? '0 0 24 24'}
      fill={opts.fill ? 'currentColor' : 'none'}
      stroke={opts.fill ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
  Comp.displayName = name
  return Comp
}

export const IcSearch = icon('IcSearch', <>
  <circle cx="11" cy="11" r="6.5" />
  <path d="m16 16 4.5 4.5" />
</>)

export const IcClose = icon('IcClose', <>
  <path d="M6 6l12 12M18 6L6 18" />
</>)

export const IcPlus = icon('IcPlus', <path d="M12 5v14M5 12h14" />)

export const IcMinus = icon('IcMinus', <path d="M5 12h14" />)

export const IcCheck = icon('IcCheck', <path d="m4.5 12.5 5 5 10-11" />)

export const IcPlay = icon('IcPlay', <path d="M7 4.8v14.4L19.2 12z" />, { fill: true })

export const IcPause = icon('IcPause', <>
  <rect x="6.5" y="5" width="3.6" height="14" rx="1" />
  <rect x="14" y="5" width="3.6" height="14" rx="1" />
</>, { fill: true })

export const IcInfo = icon('IcInfo', <>
  <circle cx="12" cy="12" r="8.5" />
  <path d="M12 11v5.5M12 7.8v.4" />
</>)

export const IcChevronLeft = icon('IcChevronLeft', <path d="m14.5 5-7 7 7 7" />)
export const IcChevronRight = icon('IcChevronRight', <path d="m9.5 5 7 7-7 7" />)
export const IcChevronDown = icon('IcChevronDown', <path d="m5 9.5 7 7 7-7" />)
export const IcChevronUp = icon('IcChevronUp', <path d="m5 14.5 7-7 7 7" />)

export const IcStar = icon('IcStar', <path d="m12 3.6 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z" />, { fill: true })

export const IcBookmark = icon('IcBookmark', <path d="M6.5 4.5h11v15l-5.5-4-5.5 4z" />)
export const IcBookmarkFilled = icon('IcBookmarkFilled', <path d="M6.5 4.5h11v15l-5.5-4-5.5 4z" />, { fill: true })

export const IcLayers = icon('IcLayers', <>
  <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8z" />
  <path d="m4.5 12.5 7.5 4 7.5-4" />
  <path d="m4.5 16.8 7.5 4 7.5-4" />
</>)

export const IcGrid = icon('IcGrid', <>
  <rect x="4" y="4" width="7" height="7" rx="1.6" />
  <rect x="13" y="4" width="7" height="7" rx="1.6" />
  <rect x="4" y="13" width="7" height="7" rx="1.6" />
  <rect x="13" y="13" width="7" height="7" rx="1.6" />
</>)

export const IcDownload = icon('IcDownload', <>
  <path d="M12 4v10" />
  <path d="m7.5 10 4.5 4.5 4.5-4.5" />
  <path d="M5 19h14" />
</>)

export const IcExternal = icon('IcExternal', <>
  <path d="M14 5h5v5" />
  <path d="M19 5l-8 8" />
  <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
</>)

export const IcSettings = icon('IcSettings', <>
  <circle cx="12" cy="12" r="3.2" />
  <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
</>)

export const IcUser = icon('IcUser', <>
  <circle cx="12" cy="8.5" r="3.6" />
  <path d="M5 20c.6-3.6 3.3-5.5 7-5.5s6.4 1.9 7 5.5" />
</>)

export const IcSun = icon('IcSun', <>
  <circle cx="12" cy="12" r="4" />
  <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
</>)

export const IcMoon = icon('IcMoon', <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4 8.4 8.4 0 1 0 20 14.4" />)

export const IcGoogle = icon('IcGoogle', <>
  <path d="M21 12.2c0-.8-.07-1.4-.2-2.1H12v3.9h5.1c-.1 1-.8 2.5-2.3 3.5l3.5 2.7c2-1.9 3.2-4.6 3.2-8z" fill="#4285F4" stroke="none" />
  <path d="M12 21.5c2.9 0 5.4-1 7.2-2.7l-3.5-2.7c-.9.7-2.2 1.2-3.7 1.2-2.8 0-5.2-1.9-6.1-4.5l-3.7 2.8C3.9 19.4 7.7 21.5 12 21.5z" fill="#34A853" stroke="none" />
  <path d="M5.9 14.1c-.4-1.2-.5-2.5 0-3.7L2.2 7.6c-1.5 2.7-1.5 6 0 8.7z" fill="#FBBC05" stroke="none" />
  <path d="M12 6.3c1.9 0 3.2.9 3.9 1.6l2.8-2.7C17 3.6 14.9 2.5 12 2.5 7.7 2.5 3.9 4.6 2.2 7.6l3.7 2.8c.9-2.6 3.3-4.1 6.1-4.1z" fill="#EA4335" stroke="none" />
</>, { viewBox: '0 0 24 24' })

export const IcFilter = icon('IcFilter', <>
  <path d="M4 6h16M7 12h10M10 18h4" />
</>)

export const IcSparkle = icon('IcSparkle', <>
  <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9z" />
  <path d="M18.5 16.5 19 18.5l2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z" />
</>)

export const IcTrash = icon('IcTrash', <>
  <path d="M5 7h14M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
  <path d="M6.5 7 7.5 20h9L17.5 7" />
  <path d="M10.5 10.5v6M13.5 10.5v6" />
</>)

export const IcPencil = icon('IcPencil', <>
  <path d="M4.5 19.5h4L20 8a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
  <path d="m14.5 6.5 3 3" />
</>)

export const IcShuffle = icon('IcShuffle', <>
  <path d="M17 4h4v4" />
  <path d="M3 20l7-7" />
  <path d="M21 4 3 20" />
  <path d="M17 20h4v-4" />
  <path d="m14 13 7 7" />
</>)

export const IcFilm = icon('IcFilm', <>
  <rect x="3" y="5" width="18" height="14" rx="2.2" />
  <path d="M8 5v14M16 5v14M3 12h18M3 8.5h5M3 15.5h5M16 8.5h5M16 15.5h5" />
</>)

export const IcTv = icon('IcTv', <>
  <rect x="3" y="7" width="18" height="12" rx="2.2" />
  <path d="m8.5 3.5 3.5 3.5 3.5-3.5" />
</>)

export const IcClock = icon('IcClock', <>
  <circle cx="12" cy="12" r="8.5" />
  <path d="M12 7.5V12l3.2 2" />
</>)

export const IcGlobe = icon('IcGlobe', <>
  <circle cx="12" cy="12" r="8.5" />
  <path d="M3.5 12h17M12 3.5c2.4 2.3 2.4 14.7 0 17M12 3.5c-2.4 2.3-2.4 14.7 0 17" />
</>)

export const IcCalendar = icon('IcCalendar', <>
  <rect x="4" y="5.5" width="16" height="14" rx="2" />
  <path d="M8 3.5v4M16 3.5v4M4 10h16" />
</>)

export const IcBanknote = icon('IcBanknote', <>
  <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
  <circle cx="12" cy="12" r="2.4" />
</>)

export const IcMonitor = icon('IcMonitor', <>
  <rect x="3" y="4.5" width="18" height="12" rx="2" />
  <path d="M9 20h6M12 16.5V20" />
</>)

export const IcRefresh = icon('IcRefresh', <>
  <path d="M20 12a8 8 0 1 1-2.6-5.9" />
  <path d="M20 4v4h-4" />
</>)

export const IcLink = icon('IcLink', <>
  <path d="M9.5 14.5 14.5 9.5" />
  <path d="M11 6.5 12.7 4.8a3.9 3.9 0 0 1 5.5 5.5L16.5 12" />
  <path d="M13 17.5 11.3 19.2a3.9 3.9 0 0 1-5.5-5.5L7.5 12" />
</>)

export const IcMenu = icon('IcMenu', <path d="M4 7h16M4 12h16M4 17h16" />)

export const IcExpand = icon('IcExpand', <>
  <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />
</>)

export const IcAlert = icon('IcAlert', <>
  <path d="M12 4.5 21 19H3z" />
  <path d="M12 10v4M12 16.6v.3" />
</>)

export const IcKey = icon('IcKey', <>
  <circle cx="8" cy="12" r="3.6" />
  <path d="M11.6 12H20M17 12v3.4M14 12v2.6" />
</>)

export const IcDatabase = icon('IcDatabase', <>
  <ellipse cx="12" cy="6" rx="7.5" ry="3" />
  <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
  <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
</>)

export const IcSliders = icon('IcSliders', <>
  <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
  <circle cx="15" cy="8" r="2" />
  <circle cx="9" cy="16" r="2" />
</>)

export const IcLogout = icon('IcLogout', <>
  <path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14" />
  <path d="M17 8.5 20.5 12 17 15.5M20 12h-9" />
</>)

export const IcMail = icon('IcMail', <>
  <rect x="3" y="5.5" width="18" height="13" rx="2" />
  <path d="m4 7 8 6 8-6" />
</>)

export const IcLock = icon('IcLock', <>
  <rect x="4.5" y="10" width="15" height="9.5" rx="2" />
  <path d="M8 10V8a4 4 0 0 1 8 0v2" />
</>)

export const IcTrend = icon('IcTrend', <>
  <path d="M3.5 16.5 9 11l3.5 3 8-8.5" />
  <path d="M15 6h5.5v5.5" />
</>)

export const IcEye = icon('IcEye', <>
  <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
  <circle cx="12" cy="12" r="2.8" />
</>)

export const IcUsers = icon('IcUsers', <>
  <circle cx="9" cy="8.5" r="3.2" />
  <path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" />
  <path d="M16 6.4a3 3 0 0 1 0 5.6M17.5 14.4c2 .6 3.2 2.2 3.5 4.6" />
</>)

export const IcHeart = icon('IcHeart', <path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" />)

export const IcShield = icon('IcShield', <>
  <path d="M12 3.5 19.5 6v6c0 4.2-3 7.3-7.5 8.5C7.5 19.3 4.5 16.2 4.5 12V6z" />
  <path d="m9 12 2.2 2.2L15.5 10" />
</>)

export const IcHome = icon('IcHome', <>
  <path d="M4 10.5 12 4l8 6.5V19a1.2 1.2 0 0 1-1.2 1.2h-3.3v-6H8.5v6H5.2A1.2 1.2 0 0 1 4 19z" />
</>)

export const IcKeyboard = icon('IcKeyboard', <>
  <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
  <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 13.5h10" />
</>)

export const IcEpisodes = icon('IcEpisodes', <>
  <rect x="3" y="4.5" width="18" height="12" rx="2" />
  <path d="M7 20h10M6 8h6M6 11.5h9" />
</>)
