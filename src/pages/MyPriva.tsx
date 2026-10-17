import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { clearAllProgress, removeFromMyList, toggleMyList } from '../lib/store'
import { continueWatching, myListItems, statsFor } from '../lib/derive'
import { ago, cn, plural } from '../lib/utils'
import { MediaCard } from '../components/MediaCard'
import { WideCard } from '../components/WideCard'
import { PageHead } from '../components/Bits'
import { Modal } from '../components/Modal'
import { useToast } from '../contexts/ToastProvider'
import { useAuth } from '../contexts/AuthProvider'
import { usePicker } from '../contexts/PickerProvider'
import { cardHref } from '../lib/card'
import { IcBookmark, IcClock, IcDatabase, IcGrid, IcLayers, IcPlay, IcSearch, IcShuffle, IcStar, IcTrash } from '../components/icons'
import { SmartLink } from '../components/SmartLink'

const TABS = [
  { id: 'list', label: 'My list' },
  { id: 'continue', label: 'Continue watching' },
  { id: 'rated', label: 'Rated' },
  { id: 'history', label: 'History' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function MyPriva() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabId) || 'list'
  const { data } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const picker = usePicker()
  const [sort, setSort] = useState<'added' | 'year' | 'rating' | 'title'>('added')
  const [confirmClear, setConfirmClear] = useState(false)

  const stats = useMemo(() => statsFor(data.progress), [data.progress])
  const saved = useMemo(() => {
    const items = myListItems(data.myList, data.myListMeta)
    const list = [...items]
    if (sort === 'year') list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    if (sort === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [data.myList, data.myListMeta, sort])

  const watching = useMemo(() => continueWatching(data.progress), [data.progress])
  const history = useMemo(() => Object.values(data.progress).sort((a, b) => b.updatedAt - a.updatedAt), [data.progress])
  const rated = useMemo(() => Object.entries(data.rated).map(([key, value]) => ({ key, ...value, meta: data.myListMeta[key] })), [data.rated, data.myListMeta])

  const setTab = (id: TabId) => {
    const next = new URLSearchParams(params)
    if (id === 'list') next.delete('tab')
    else next.set('tab', id)
    setParams(next, { replace: true })
  }

  return (
    <div className="wrap page">
      <PageHead
        kicker={user ? `Your shelf · signed in as ${user.email}` : 'Your shelf · this device'}
        title="My Priva"
        lead={
          user
            ? 'List, place, ratings and collections, mirrored to your account so a second device picks up the same sentence.'
            : 'Everything here is kept in this browser. Sign in and it moves to your account — nothing else changes.'
        }
      >
        {user ? (
          <span className="pill">
            <IcDatabase size={13} /> synced
          </span>
        ) : (
          <Link className="btn btn--sm btn--primary" to="/sign-in">
            Sign in to keep it everywhere
          </Link>
        )}
      </PageHead>

      <div className="stats-row">
        <Stat label="Saved" value={data.myList.length} note={data.myList.length ? 'in the order you added them' : 'nothing yet'} icon={<IcBookmark size={15} />} />
        <Stat label="In progress" value={watching.length} note={watching.length ? 'pick them up below' : 'nothing unfinished'} icon={<IcPlay size={15} />} />
        <Stat
          label="Watched"
          value={stats.hours || stats.minutesSaved}
          unit={stats.hours ? 'h' : 'm'}
          note={stats.titles + stats.series ? `${plural(stats.titles, 'film')} · ${plural(stats.series, 'episode')}` : 'nothing counted yet'}
          icon={<IcClock size={15} />}
        />
        <Stat label="Collections" value={data.collections.length} note={data.collections.length ? 'yours' : 'make one'} icon={<IcLayers size={15} />} />
        <Stat label="Streak" value={stats.streakDays} unit="d" note={stats.streakDays > 1 ? 'on a roll' : 'one day at a time'} icon={<IcShuffle size={15} />} />
      </div>

      <div className="mine-tabs">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {tab === 'list' && saved.length ? (
            <select className="select" style={{ height: 32, width: 'auto', fontSize: 12.5 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort my list">
              <option value="added">Recently added</option>
              <option value="year">Year</option>
              <option value="rating">TMDB score</option>
              <option value="title">A → Z</option>
            </select>
          ) : null}
          {tab === 'continue' && watching.length ? (
            <button className="btn btn--sm btn--outline" onClick={() => setConfirmClear(true)}>
              <IcTrash size={14} /> Clear history
            </button>
          ) : null}
          <Link className="btn btn--sm btn--outline" to="/search">
            <IcSearch size={14} /> Find more
          </Link>
        </div>
      </div>

      {tab === 'list' ? (
        saved.length ? (
          <div className="grid-posters">
            {saved.map((m, i) => (
              <div className="mine-item" key={`${m.type}-${m.id}`}>
                <MediaCard item={m} index={i} progress={false} />
                <div className="mine-item__act">
                  <button
                    className="icon-btn icon-btn--quiet"
                    style={{ width: 26, height: 26 }}
                    aria-label={`Remove ${m.title} from My List`}
                    onClick={() => {
                      removeFromMyList(m.id)
                      toast.push(`Removed ${m.title}`, {
                        kind: 'ok',
                        action: { label: 'Undo', run: () => toggleMyList(m) },
                      })
                    }}
                  >
                    <IcTrash size={13} />
                  </button>
                  <button className="icon-btn icon-btn--quiet" style={{ width: 26, height: 26 }} aria-label="Add to a collection" onClick={() => picker.open(m)}>
                    <IcGrid size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Your list is empty"
            body="The bookmark button on any poster puts it here. It is the one thing Priva remembers about you without an account."
            to="/movies"
          />
        )
      ) : null}

      {tab === 'continue' ? (
        watching.length ? (
          <div className="wide-grid">
            {watching.map((entry) => (
              <WideCard key={`${entry.type}-${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`} entry={entry} />
            ))}
          </div>
        ) : (
          <Empty
            title="Nothing halfway through"
            body="Watch anything for a couple of minutes and Priva starts keeping your place — the players post their time back to us."
            to="/series"
          />
        )
      ) : null}

      {tab === 'rated' ? (
        rated.length ? (
          <ul className="credit-list">
            {rated.map((r) => (
              <li key={r.key}>
                <div className="credit-row">
                  <span className="credit-row__year num">{r.score}/10</span>
                  <span className="credit-row__body">
                    {r.meta ? (
                      <SmartLink className="credit-row__title" to={cardHref(r.meta.type, r.meta.id, r.meta.title)}>
                        {r.meta.title}
                      </SmartLink>
                    ) : (
                      <span className="credit-row__title">{r.key}</span>
                    )}
                    <span className="hint">
                      {r.type === 'tv' ? 'series' : 'film'} · rated {ago(r.at)}
                    </span>
                  </span>
                  <span className="stars" style={{ pointerEvents: 'none' }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <button key={i} data-on={r.score >= (i + 1) * 2} tabIndex={-1}>
                        <IcStar size={13} />
                      </button>
                    ))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No ratings yet" body="Rate a title from its page — ten little stars, no review required. It feeds your Because-you-watched rail." to="/movies" />
        )
      ) : null}

      {tab === 'history' ? (
        history.length ? (
          <div className="wide-grid">
            {history.map((entry) => (
              <WideCard key={`${entry.type}-${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`} entry={entry} />
            ))}
          </div>
        ) : (
          <Empty title="No history" body="Once you have watched something, it lands here with the exact minute you stopped." to="/movies" />
        )
      ) : null}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear watch history?"
        subtitle={`${watching.length} title${watching.length === 1 ? '' : 's'} and their resume points will be forgotten, here and in your account.`}
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setConfirmClear(false)}>
              Keep it
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                clearAllProgress()
                setConfirmClear(false)
                toast.push('Watch history cleared', { kind: 'ok' })
              }}
            >
              <IcTrash size={15} /> Clear everything
            </button>
          </>
        }
      >
        <p className="prose">My List and collections are untouched. This only forgets where you stopped.</p>
      </Modal>
    </div>
  )
}

function Stat({ label, value, unit, note, icon }: { label: string; value: number; unit?: string; note: string; icon: ReactNode }) {
  return (
    <div className={cn('stat')}>
      <span className="stat__icon">{icon}</span>
      <span className="stat__label">{label}</span>
      <span className="stat__value num">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      <span className="hint">{note}</span>
    </div>
  )
}

function Empty({ title, body, to }: { title: string; body: string; to: string }) {
  return (
    <div className="empty" style={{ marginTop: 8 }}>
      <div className="empty__art">
        <IcBookmark />
      </div>
      <h3>{title}</h3>
      <p style={{ maxWidth: '48ch' }}>{body}</p>
      <Link className="btn btn--sm btn--primary" to={to}>
        Browse
      </Link>
    </div>
  )
}

