import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { APP_VERSION, NAV } from '../lib/constants'
import { cn } from '../lib/utils'
import { useStore } from '../hooks/useStore'
import { useAuth } from '../contexts/AuthProvider'
import { setPrefs } from '../lib/store'
import { IcBookmark, IcExternal, IcGrid, IcLogout, IcMoon, IcSettings, IcSun, IcUser } from './icons'

export function Header() {
  const [menu, setMenu] = useState(false)
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()
  const { prefs, sync, data } = useStore()
  const { user, ensureAuth, signOutNow } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  /* the account button is the only thing that needs the Firebase SDK, so it
   * is also the only thing that fetches it — an anonymous visitor never
   * downloads ~200 kB of auth code they will not use. */
  const openAccount = useCallback(async () => {
    if (user) {
      setMenu((m) => !m)
      return
    }
    setChecking(true)
    try {
      const who = await ensureAuth()
      if (who) setMenu(true)
      else navigate('/sign-in')
    } finally {
      setChecking(false)
    }
  }, [user, ensureAuth, navigate])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  return (
    <header className="site-head">
      <div className="wrap site-head__inner">
        <Link to="/" className="brand" aria-label="Priva — home">
          priva<em>.</em>
          <span>{APP_VERSION}</span>
        </Link>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(isActive && 'is-active')}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/search" className={({ isActive }) => cn(isActive && 'is-active')}>
            Search
          </NavLink>
        </nav>

        <div className="head-tools">
          <button
            className="icon-btn icon-btn--quiet"
            onClick={() => setPrefs({ theme: prefs.theme === 'night' ? 'paper' : 'night' })}
            aria-label={prefs.theme === 'night' ? 'Switch to the paper theme' : 'Switch to the night theme'}
            title={prefs.theme === 'night' ? 'Paper theme' : 'Night theme'}
          >
            {prefs.theme === 'night' ? <IcSun /> : <IcMoon />}
          </button>

          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              className={cn('icon-btn', menu && 'is-on')}
              onClick={() => void openAccount()}
              aria-label={user ? 'Account menu' : 'Sign in'}
              aria-expanded={menu}
              aria-busy={checking}
            >
              {user ? (
                <span className="avatar" style={{ width: 28, height: 28, borderRadius: 9, fontSize: 11 }}>
                  {user.displayName?.trim()?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'P'}
                </span>
              ) : (
                <IcUser />
              )}
            </button>

            {menu ? (
              <div className="menu">
                <div className="menu__head">
                  <div style={{ fontSize: 13.5, fontWeight: 600 }} className="truncate">
                    {user?.displayName || user?.email || 'Signed out'}
                  </div>
                  <div className="sync-dot" data-sync={sync} style={{ marginTop: 4 }}>
                    <i />{' '}
                    {sync === 'saved' ? 'in sync' : sync === 'saving' ? 'saving…' : sync === 'error' ? 'not synced' : 'this device only'}
                  </div>
                </div>
                <Link to="/my" onClick={() => setMenu(false)}>
                  <IcBookmark size={16} /> My Priva
                  <small>{data.myList.length} saved</small>
                </Link>
                <Link to="/collections" onClick={() => setMenu(false)}>
                  <IcGrid size={16} /> Collections
                  <small>{data.collections.length}</small>
                </Link>
                <Link to="/settings" onClick={() => setMenu(false)}>
                  <IcSettings size={16} /> Settings
                </Link>
                <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer noopener">
                  <IcExternal size={16} /> Data by TMDB
                </a>
                <button
                  onClick={() => {
                    setMenu(false)
                    void signOutNow()
                  }}
                >
                  <IcLogout size={16} /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
