import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { APP_NAME, APP_TAGLINE, APP_VERSION, DOWNLOAD_SOURCES, SOURCES } from '../lib/constants'
import { useStore } from '../hooks/useStore'
import { useAuth } from '../contexts/AuthProvider'
import { Modal } from './Modal'
import { IcBookmark, IcFilm, IcGrid, IcHome, IcKeyboard, IcSearch, IcTv } from './icons'

export function Footer() {
  const { data, prefs, sync } = useStore()
  const { user } = useAuth()
  const [open, setOpen] = useState<'keys' | 'sources' | 'report' | null>(null)

  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="site-foot__grid">
          <div>
            <h4>{APP_NAME}</h4>
            <p className="hint" style={{ maxWidth: '34ch' }}>
              {APP_TAGLINE} A small front-end over public metadata — no accounts required, no ads, no third-party trackers.
            </p>
            <button className="btn btn--sm btn--outline" style={{ marginTop: 12 }} onClick={() => setOpen('keys')}>
              <IcKeyboard size={14} /> Keyboard shortcuts
            </button>
          </div>

          <div>
            <h4>Browse</h4>
            <ul>
              <li>
                <Link to="/movies">Movies</Link>
              </li>
              <li>
                <Link to="/series">TV shows</Link>
              </li>
              <li>
                <Link to="/search">Search</Link>
              </li>
              <li>
                <Link to="/collections">Collections</Link>
              </li>
              <li>
                <Link to="/my?tab=list">My list · {data.myList.length}</Link>
              </li>
              <li>
                <Link to="/my?tab=continue">Continue watching · {Object.keys(data.progress).length}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Sources</h4>
            <ul>
              {SOURCES.map((s) => (
                <li key={s.id}>
                  <a href={s.docs} target="_blank" rel="noreferrer noopener">
                    {s.name}
                  </a>
                  {prefs.defaultSource === s.id ? <span className="badge" style={{ marginLeft: 6 }}>default</span> : null}
                </li>
              ))}
              {DOWNLOAD_SOURCES.map((d) => (
                <li key={d.id}>
                  <a href={`https://${d.host}/`} target="_blank" rel="noreferrer noopener">
                    {d.name}
                  </a>
                </li>
              ))}
              <li>
                <button onClick={() => setOpen('sources')}>How sources work</button>
              </li>
            </ul>
          </div>

          <div>
            <h4>Your data</h4>
            <ul>
              <li>
                <Link to="/settings">Settings</Link>
              </li>
              <li>
                <span className="sync-dot" data-sync={sync}>
                  <i /> {user ? 'synced to your account' : 'stored on this device'}
                </span>
              </li>
              <li>
                <Link to="/settings#data">Export a copy</Link>
              </li>
              <li>
                <Link to="/settings#danger">Delete everything</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>If it breaks</h4>
            <ul>
              <li>
                <button onClick={() => setOpen('report')}>Report a broken title</button>
              </li>
              <li>
                <a href="https://www.themoviedb.org/terms-of-use" target="_blank" rel="noreferrer noopener">
                  TMDB terms
                </a>
              </li>
              <li>
                <Link to="/settings#playback">Change default player</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-note">
          <span>
            {APP_NAME} v{APP_VERSION} — metadata &amp; artwork by{' '}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer noopener" style={{ color: 'inherit' }}>
              TMDB
            </a>
            . Players and download hosts are third-party services that Priva neither owns nor controls.
          </span>
          <span>Made for phones first, desktops second.</span>
        </div>
      </div>

      <Modal open={open === 'keys'} onClose={() => setOpen(null)} title="Keyboard shortcuts">
        <div className="keys-grid">
          {[
            ['/', 'Jump to the search box'],
            ['s', 'Search page'],
            ['h', 'Home'],
            ['m', 'Movies'],
            ['t', 'TV shows'],
            ['l', 'My list'],
            ['c', 'Continue watching'],
            ['Esc', 'Close a dialog, or leave the player'],
          ].map(([key, what]) => (
            <div key={key}>
              <kbd className="key">{key}</kbd>
              <span>{what}</span>
            </div>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 14 }}>
          Single-key shortcuts stay quiet while you are typing in a field.
        </p>
      </Modal>

      <Modal open={open === 'sources'} onClose={() => setOpen(null)} title="Where the video actually comes from" wide>
        <div className="doc">
          {SOURCES.map((s) => (
            <p key={s.id}>
              <b>{s.name}</b> — {s.blurb} Embeds <code>{s.docs}</code> keyed by TMDB id. {s.quality}, {s.subs}.
            </p>
          ))}
          {DOWNLOAD_SOURCES.map((d) => (
            <p key={d.id}>
              <b>{d.name}</b> ({d.host}) — {d.blurb}
            </p>
          ))}
          <p>
            Priva hosts, stores and transcodes nothing. Changing the default player on the Settings page only changes which embed
            the Play button opens.
          </p>
        </div>
      </Modal>

      <Modal open={open === 'report'} onClose={() => setOpen(null)} title="Something not playing?">
        <div className="doc">
          <p>Sources are chosen by the embed providers, so a dead title is almost always their problem rather than Priva's. Try, in order:</p>
          <ol>
            <li>Flip the source on the watch page (Vidstuck ⇄ TGVID) — one of them usually has a live server.</li>
            <li>Change server inside the player; both list alternates in their own menus.</li>
            <li>
              Still nothing? Search the title on <code>themoviedb.org</code> and report it to the provider you were using — that
              is where a missing stream gets fixed.
            </li>
          </ol>
          <p className="hint">If a listing itself is wrong, that is TMDB metadata and can be corrected there.</p>
        </div>
      </Modal>
    </footer>
  )
}

const TABS = [
  { to: '/', label: 'Home', Icon: IcHome, end: true },
  { to: '/movies', label: 'Movies', Icon: IcFilm, end: false },
  { to: '/series', label: 'Series', Icon: IcTv, end: false },
  { to: '/search', label: 'Search', Icon: IcSearch, end: false },
  { to: '/collections', label: 'Lists', Icon: IcGrid, end: false },
  { to: '/my', label: 'Mine', Icon: IcBookmark, end: false },
] as const

export function TabBar() {
  const { data } = useStore()
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
          <Icon />
          <span>
            {label}
            {to === '/my' && data.myList.length ? ` · ${data.myList.length}` : null}
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
