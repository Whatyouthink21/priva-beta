import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { setPrefs } from '../lib/store'
import { cacheClear, cacheSize } from '../lib/cache'
import { APP_VERSION, LANGUAGES, REGIONS, SOURCES, DOWNLOAD_SOURCES, DEFAULT_PREFS, LS } from '../lib/constants'
import { authMessage, useAuth } from '../contexts/AuthProvider'
import { useToast } from '../contexts/ToastProvider'
import { PageHead } from '../components/Bits'
import { Modal } from '../components/Modal'
import { cn, storageGet, storageSet, storageDel } from '../lib/utils'
import { forgetSearches, resetEverything } from '../lib/store'
import { listDevices } from '../lib/firestore'
import { exportData } from '../lib/store'
import { hasTmdbKey } from '../lib/env'
import { IcCheck, IcDatabase, IcDownload, IcExternal, IcKey, IcLogout, IcMoon, IcShield, IcSliders, IcSun, IcTrash, IcUser } from '../components/icons'
import type { PlayerSource, PrivaPrefs } from '../lib/types'

export default function SettingsPage() {
  const { prefs, sync, bound, data, deviceId } = useStore()
  const { user, ready, signOutNow, changeDisplayName, removeAccount } = useAuth()
  const toast = useToast()
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [keyDraft, setKeyDraft] = useState(() => storageGet<string>(LS.key, ''))
  const [nameDraft, setNameDraft] = useState(user?.displayName ?? '')
  const [devices, setDevices] = useState<{ id: string; name: string; seenAt: number }[]>([])
  const [busy, setBusy] = useState(false)

  const toggle = (key: keyof PrivaPrefs, value: boolean) => setPrefs({ [key]: value } as Partial<PrivaPrefs>)
  const segment = (key: keyof PrivaPrefs, value: string) => setPrefs({ [key]: value } as Partial<PrivaPrefs>)

  const saveKey = () => {
    const clean = keyDraft.trim()
    if (clean) storageSet(LS.key, clean)
    else storageDel(LS.key)
    toast.push(clean ? 'Key saved — reloading' : 'Key cleared — reloading', { kind: 'ok' })
    setTimeout(() => location.reload(), 450)
  }

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `priva-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.push('Downloaded a copy of everything Priva keeps', { kind: 'ok' })
  }

  return (
    <div className="wrap page">
      <PageHead
        kicker="Make it yours"
        title="Settings"
        lead="One page for the things worth choosing: which server plays by default, what your region is, where your list lives. Nothing here is required."
      />

      {/* ---------------- account ---------------- */}
      <section className="panel" id="account">
        <div className="panel__head">
          <h3>
            <IcUser size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Account
          </h3>
          <div className="grow" />
          <span className="sync-dot" data-sync={user ? sync : 'device'}>
            <i /> {user ? (sync === 'saving' ? 'saving…' : sync === 'error' ? 'not saved' : 'in sync') : 'device only'}
          </span>
        </div>

        {!ready ? (
          <p className="hint">Checking with Firebase…</p>
        ) : user ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="avatar avatar--lg">{(user.displayName || user.email || 'P').slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650 }}>{user.displayName || 'No name yet'}</div>
                <div className="hint truncate">{user.email}</div>
                <div className="hint num">uid {user.uid.slice(0, 12)}…</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label className="field" style={{ minWidth: 190 }}>
                  <span>Display name</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="input" value={nameDraft} maxLength={40} onChange={(e) => setNameDraft(e.target.value)} placeholder={user.displayName ?? 'name'} />
                    <button
                      className="btn btn--sm btn--outline"
                      disabled={!nameDraft.trim() || nameDraft === user.displayName}
                      onClick={async () => {
                        await changeDisplayName(nameDraft)
                        toast.push('Name updated', { kind: 'ok' })
                      }}
                    >
                      Save
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="kv">
              <div>
                <b>Where</b>
                <span>
                  Firestore · <code>users/{user.uid}/data/*</code>
                </span>
              </div>
              <div>
                <b>Bound as</b>
                <span>{bound?.kind === 'user' ? `this account (${deviceId.slice(0, 6)}…)` : 'device'}</span>
              </div>
              <div>
                <b>Contents</b>
                <span>
                  {data.myList.length} in list · {Object.keys(data.progress).length} progress rows · {data.collections.length} collections ·{' '}
                  {Object.keys(data.rated).length} ratings
                </span>
              </div>
            </div>

            {devices.length ? (
              <div className="kv">
                {devices.map((d) => (
                  <div key={d.id}>
                    <b>{d.name}</b>
                    <span className="hint">seen {new Date(d.seenAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <button
                className="btn btn--sm btn--outline"
                style={{ justifySelf: 'start' }}
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setDevices(await listDevices(user.uid))
                  setBusy(false)
                }}
              >
                <IcDatabase size={14} /> {busy ? 'Checking…' : 'Show devices that touched this account'}
              </button>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn--outline btn--sm"
                onClick={() => {
                  void signOutNow()
                  toast.push('Signed out. Your list stays on this device.', { kind: 'ok' })
                }}
              >
                <IcLogout size={14} /> Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="sign-in-cta">
            <div>
              <h4 style={{ fontSize: 16, marginBottom: 4 }}>No account needed, but it helps</h4>
              <p className="hint" style={{ maxWidth: '54ch' }}>
                Signed out, Priva keeps your list and your place in this browser only. Sign in with email or Google and both
                follow you to any phone, with an offline cache so a bad connection never eats your list.
              </p>
            </div>
            <Link to="/sign-in" className="btn btn--primary btn--sm">
              Sign in
            </Link>
          </div>
        )}
      </section>

      {/* ---------------- playback ---------------- */}
      <section className="panel" id="playback">
        <div className="panel__head">
          <h3>
            <IcSliders size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Playback
          </h3>
        </div>

        <div className="field-label" style={{ marginBottom: 8 }}>
          Default server
        </div>
        <div className="source-cards">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              className={cn('source-card', prefs.defaultSource === s.id && 'is-on')}
              onClick={() => segment('defaultSource', s.id as PlayerSource)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b>{s.name}</b>
                {prefs.defaultSource === s.id ? <IcCheck size={15} style={{ color: 'var(--color-jade)' }} /> : null}
              </span>
              <span className="hint">{s.blurb}</span>
              <span className="source-card__tags">
                <span className="badge">{s.quality}</span>
                <span className="badge">{s.subs}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="settings-grid" style={{ marginTop: 16 }}>
          <label className="field">
            <span>Preferred server (Server 1)</span>
            <input
              className="input"
              value={prefs.server}
              placeholder="valstrax"
              onChange={(e) => setPrefs({ server: e.target.value.replace(/[^a-z0-9_-]/gi, '') })}
            />
            <span className="hint">Leave blank to let Server 1 choose automatically.</span>
          </label>

          <label className="field">
            <span>Loading screen text</span>
            <input className="input" value={prefs.branding} maxLength={24} onChange={(e) => setPrefs({ branding: e.target.value })} />
            <span className="hint">Text shown by Server 1 while it buffers.</span>
          </label>

          <label className="field">
            <span>Subtitle language (Server 1)</span>
            <select className="select" value={prefs.subtitle} onChange={(e) => setPrefs({ subtitle: e.target.value })}>
              {['english', 'hindi', 'spanish', 'french', 'german', 'italian', 'portuguese', 'japanese', 'korean', 'none'].map((l) => (
                <option key={l} value={l}>
                  {l === 'none' ? 'none — keep the server default' : l}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Audio language (Server 2)</span>
            <select className="select" value={prefs.tgvidLang} onChange={(e) => setPrefs({ tgvidLang: e.target.value })}>
              <option value="">let the player choose</option>
              <option value="eng">English</option>
              <option value="hi">Hindi</option>
              <option value="tam">Tamil</option>
              <option value="tel">Telugu</option>
              <option value="jap">Japanese</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 6 }}>
          <div className="field-label" style={{ margin: '14px 0 8px' }}>
            Player accent
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="swatches">
              {['FF4F18', 'F0B840', '43D69A', '4EA8FF', 'B98CFF', 'FF5A76', 'E8E4DA'].map((hex) => (
                <button
                  key={hex}
                  className="swatch"
                  style={{ background: `#${hex}`, color: `#${hex}` }}
                  aria-pressed={prefs.accent === hex}
                  aria-label={`Accent #${hex}`}
                  onClick={() => setPrefs({ accent: hex })}
                />
              ))}
            </div>
            <label className="field" style={{ gap: 4 }}>
              <span className="visually-hidden">Custom hex</span>
              <input
                className="input num"
                style={{ width: 116, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                value={prefs.accent}
                maxLength={6}
                onChange={(e) => setPrefs({ accent: e.target.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase() })}
              />
            </label>
            <span className="hint">Used for the player progress bar and this site’s accent.</span>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <Row label="Autoplay the next episode" note="Only shows up on series, inside the player’s own controls.">
            <Switch on={prefs.autoPlayNext} onChange={(v) => toggle('autoPlayNext', v)} />
          </Row>
          <Row label="Resume where I stopped" note="Priva stores the timestamp the player reports and asks it to start there.">
            <Switch on={prefs.resumePlayback} onChange={(v) => toggle('resumePlayback', v)} />
          </Row>
        </div>

        <div className="field-label" style={{ margin: '16px 0 8px' }}>
          Background trailers
        </div>
        <div className="tabs" role="group" aria-label="Trailers">
          {(['always', 'wifi', 'off'] as const).map((mode) => (
            <button key={mode} aria-selected={prefs.heroTrailers === mode} onClick={() => segment('heroTrailers', mode)}>
              {mode === 'always' ? 'Always' : mode === 'wifi' ? 'Wi-Fi only' : 'Never'}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Trailers are YouTube embeds, which cost battery and data. “Wi-Fi only” falls back to a still image on phones and metered
          links, which is the default for a reason.
        </p>
      </section>

      {/* ---------------- content ---------------- */}
      <section className="panel" id="content">
        <div className="panel__head">
          <h3>
            <IcShield size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Region &amp; looks
          </h3>
        </div>
        <div className="settings-grid">
          <label className="field">
            <span>Where you watch from</span>
            <select className="select" value={prefs.region} onChange={(e) => setPrefs({ region: e.target.value })}>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="hint">Drives legal-streaming listings, certifications, release dates and the Top 10 board.</span>
          </label>

          <label className="field">
            <span>Poster size</span>
            <select className="select" value={prefs.posterSize} onChange={(e) => segment('posterSize', e.target.value)}>
              <option value="compact">Compact — more per row</option>
              <option value="regular">Regular</option>
              <option value="large">Large</option>
            </select>
          </label>

          <label className="field">
            <span>Preferred subtitle language</span>
            <select className="select" value={prefs.subtitle.slice(0, 2)} onChange={(e) => setPrefs({ subtitle: LANGUAGES.find((l) => l.code === e.target.value)?.name.toLowerCase() ?? 'english' })}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <span className="hint">Used for both the player and TMDB text where it matters.</span>
          </label>
        </div>

        <div style={{ marginTop: 6 }}>
          <Row label="Paper theme" note="A light theme for daytime. Night is the default.">
            <div className="tabs">
              <button aria-selected={prefs.theme === 'night'} onClick={() => segment('theme', 'night')}>
                <IcMoon size={13} style={{ verticalAlign: -2 }} /> Night
              </button>
              <button aria-selected={prefs.theme === 'paper'} onClick={() => segment('theme', 'paper')}>
                <IcSun size={13} style={{ verticalAlign: -2}} /> Paper
              </button>
            </div>
          </Row>
          <Row label="Reduce motion" note="Kills the Ken Burns drift, card lifts and toasts sliding. Respects your OS setting too.">
            <Switch on={prefs.reduceMotion} onChange={(v) => toggle('reduceMotion', v)} />
          </Row>
        </div>
      </section>

      {/* ---------------- data ---------------- */}
      <section className="panel" id="data">
        <div className="panel__head">
          <h3>
            <IcDatabase size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Your data
          </h3>
        </div>

        <div className="kv">
          <div>
            <b>Stored where</b>
            <span>
              This browser (localStorage) {user ? '+ Firestore, cached offline' : '— sign in to sync'}
            </span>
          </div>
          <div>
            <b>API cache</b>
            <span>{cacheSize()} cached TMDB responses · one hour each</span>
          </div>
          <div>
            <b>Search history</b>
            <span>{data.recentSearches.length ? data.recentSearches.join(' · ') : 'nothing recent'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <button
            className="btn btn--sm btn--outline"
            onClick={() => {
              const n = cacheClear()
              toast.push(`Dropped ${n} cached response${n === 1 ? '' : 's'}`, { kind: 'ok' })
            }}
          >
            <IcTrash size={14} /> Clear TMDB cache
          </button>
          <button
            className="btn btn--sm btn--outline"
            onClick={() => {
              forgetSearches()
              toast.push('Search history cleared', { kind: 'ok' })
            }}
          >
            Clear searches
          </button>
          <button className="btn btn--sm btn--outline" onClick={doExport}>
            <IcDownload size={14} /> Export my data
          </button>
        </div>

        <div className="settings-grid" style={{ marginTop: 18 }}>
          <label className="field" id="providers">
            <span>
              <IcKey size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              TMDB access key
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className={cn('input', 'num')}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                value={keyDraft}
                placeholder={hasTmdbKey() ? 'a key is baked into this build' : 'paste a v3 key or v4 token'}
                onChange={(e) => setKeyDraft(e.target.value)}
              />
              <button className="btn btn--sm btn--primary" onClick={saveKey} disabled={!keyDraft.trim()}>
                Save
              </button>
            </div>
            <span className="hint">
              {hasTmdbKey() ? 'Priva is reading metadata with the built-in key; paste one here to override it for this browser.' : 'No key found — titles will not load until you add one.'}{' '}
              Free at{' '}
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer noopener">
                themoviedb.org/settings/api
              </a>
              .
            </span>
          </label>

          <div className="field">
            <span>Download services</span>
            <div className="kv" style={{ marginTop: 4 }}>
              {DOWNLOAD_SOURCES.map((d) => (
                <div key={d.id}>
                  <b>{d.name}</b>
                  <span>
                    <a href={`https://${d.host}/`} target="_blank" rel="noreferrer noopener">
                      {d.host} <IcExternal size={11} style={{ verticalAlign: -1 }} />
                    </a>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- danger ---------------- */}
      <section className="panel" id="danger" style={{ borderColor: 'color-mix(in oklab, var(--color-rose) 26%, transparent)' }}>
        <div className="panel__head">
          <h3>Leaving</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--sm btn--outline" onClick={() => setPrefs({ ...DEFAULT_PREFS })}>
            Reset preferences only
          </button>
          <button className="btn btn--sm btn--danger" onClick={() => setConfirmWipe(true)}>
            <IcTrash size={14} /> Erase list, history &amp; collections
          </button>
          {user ? (
            <button className="btn btn--sm btn--danger" onClick={() => setConfirmDelete(true)}>
              <IcUser size={14} /> Delete my account
            </button>
          ) : null}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          Priva keeps no server-side log of what you watch beyond the progress rows that make “continue watching” work. Erasing
          here removes them from this browser and, if you are signed in, from your account.
        </p>
      </section>

      <section className="panel panel--flat" id="about">
        <div className="panel__head">
          <h3>About this build</h3>
        </div>
        <p className="hint">
          Priva v{APP_VERSION}. React 19 + Vite, no UI kit, ~{SOURCES.length} embed providers, {DOWNLOAD_SOURCES.length} download
          providers, and all metadata from TMDB. There is no Priva server: the bundle is static, and your account is a few
          Firestore documents.
        </p>
      </section>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Erase everything Priva remembers?"
        subtitle="My List, watch history, ratings and every collection."
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setConfirmWipe(false)}>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                resetEverything()
                setConfirmWipe(false)
                toast.push('Wiped. Your list is empty.', { kind: 'ok' })
              }}
            >
              Erase
            </button>
          </>
        }
      >
        <p className="prose">
          {user ? 'This clears the Firestore documents for your account too. ' : ''}
          Your TMDB key and theme settings are left alone.
        </p>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete your Priva account?"
        subtitle="Firebase will ask for a recent sign-in before it allows this."
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setConfirmDelete(false)}>
              Keep account
            </button>
            <button
              className="btn btn--danger"
              onClick={async () => {
                try {
                  await removeAccount()
                  setConfirmDelete(false)
                  toast.push('Account deleted', { kind: 'ok' })
                } catch (err) {
                  toast.push(authMessage(err), { kind: 'bad', timeout: 7000 })
                }
              }}
            >
              Delete for good
            </button>
          </>
        }
      >
        <p className="prose">Data is removed immediately and cannot be restored from the browser.</p>
      </Modal>
    </div>
  )
}

function Row({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="switch">
      <span className="switch__label">
        <b>{label}</b>
        <span>{note}</span>
      </span>
      {children}
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="switch__control"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="visually-hidden">{on ? 'on' : 'off'}</span>
    </button>
  )
}
