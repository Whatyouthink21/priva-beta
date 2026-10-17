import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { createCollection, deleteCollection, moveCollectionItem, removeFromCollection, toggleInCollection, updateCollection } from '../lib/store'
import { COLLECTION_ACCENTS } from '../lib/constants'
import { ago, cn, img, year } from '../lib/utils'
import { MediaCard } from '../components/MediaCard'
import { Modal } from '../components/Modal'
import { ErrorNote, PageHead } from '../components/Bits'
import { SmartLink } from '../components/SmartLink'
import { searchMulti } from '../lib/tmdb'
import { IcClose, IcGrid, IcPencil, IcPlus, IcSearch, IcTrash, IcChevronDown, IcChevronUp } from '../components/icons'
import { useToast } from '../contexts/ToastProvider'
import { useAuth } from '../contexts/AuthProvider'
import { useAsync } from '../hooks/useAsync'
import type { Collection, TitleMeta, TmdbPoster } from '../lib/types'

export default function CollectionsPage() {
  const { id } = useParams()
  const { data } = useStore()
  const collection = id ? data.collections.find((c) => c.id === id) : undefined
  if (id) return collection ? <One collection={collection} /> : <Missing id={id} />
  return <All />
}

function Missing({ id }: { id: string }) {
  return (
    <div className="wrap page">
      <PageHead kicker="Collections" title="That list is not here" />
      <ErrorNote message={`No collection with the id ${id} on this device. If you signed in on another machine, the one you want is waiting there.`} />
      <p style={{ marginTop: 14 }}>
        <Link to="/collections" className="btn btn--sm btn--outline">
          All collections
        </Link>
      </p>
    </div>
  )
}

function All() {
  const { data } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const navigate = useNavigate()

  const create = () => {
    const clean = name.trim()
    if (!clean) return
    const col = createCollection(clean, about, COLLECTION_ACCENTS[data.collections.length % COLLECTION_ACCENTS.length])
    toast.push(`Created “${col.name}”`, { kind: 'ok', action: { label: 'Open', run: () => navigate(`/collections/${col.id}`) } })
    setName('')
    setAbout('')
  }

  return (
    <div className="wrap page">
      <PageHead
        kicker="Yours, not ours"
        title="Collections"
        lead="Shelves with names you chose. A collection is just a list of titles — it lives on this device and, once signed in, in your Firestore account."
      >
        <Link className="btn btn--sm btn--outline" to="/search">
          <IcSearch size={14} /> Add from search
        </Link>
      </PageHead>

      <div className="panel make-collection">
        <div className="field">
          <label htmlFor="c-name">Name it</label>
          <input
            id="c-name"
            className="input"
            value={name}
            maxLength={48}
            placeholder="Rainy Sunday Animations"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </div>
        <div className="field">
          <label htmlFor="c-about">One line about it</label>
          <input
            id="c-about"
            className="input"
            value={about}
            maxLength={120}
            placeholder="optional"
            onChange={(e) => setAbout(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </div>
        <button className="btn btn--primary" style={{ alignSelf: 'end' }} onClick={create} disabled={!name.trim()}>
          <IcPlus size={16} /> Create
        </button>
      </div>

      {user ? null : (
        <p className="hint" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <IcGrid size={14} /> Not signed in — these collections stay on this device.
          <Link to="/sign-in" className="btn--link" style={{ fontSize: 12.5 }}>
            Sign in to sync them
          </Link>
        </p>
      )}

      {data.collections.length ? (
        <div className="collection-grid">
          {data.collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 20 }}>
          <div className="empty__art">
            <IcGrid />
          </div>
          <h3>No collections yet</h3>
          <p style={{ maxWidth: '48ch' }}>
            Make one for the thing you always mean to rewatch, one for the list you were sent in a group chat, one for the film
            you are arguing about. Any card on the site has a layers button.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn btn--sm btn--primary" to="/movies">
              Browse movies
            </Link>
            <Link className="btn btn--sm btn--outline" to="/series">
              Browse series
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function CollectionCard({ collection }: { collection: Collection }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const covers = collection.items.slice(0, 3)

  return (
    <>
      <article className="collection-card">
        <SmartLink to={`/collections/${collection.id}`} className="collection-card__cover">
          {covers.length ? (
            covers.map((m) =>
              m.poster ? <img key={m.id} src={img(m.poster, 'w185')} alt="" loading="lazy" decoding="async" /> : null,
            )
          ) : (
            <span className="collection-card__empty" style={{ background: `linear-gradient(150deg, ${collection.accent}, color-mix(in oklab, ${collection.accent} 25%, black))` }}>
              <IcGrid size={22} />
            </span>
          )}
          <span className="collection-card__bar" style={{ background: collection.accent }} />
        </SmartLink>
        <div className="collection-card__body">
          <div style={{ minWidth: 0 }}>
            <h3 className="truncate">{collection.name}</h3>
            <p className="hint clamp-2" style={{ minHeight: 32 }}>
              {collection.description || `${collection.items.length} title${collection.items.length === 1 ? '' : 's'}, touched ${ago(collection.updatedAt)}`}
            </p>
          </div>
          <div className="collection-card__foot">
            <span className="num hint">
              {collection.items.length} item{collection.items.length === 1 ? '' : 's'}
            </span>
            <button className="icon-btn icon-btn--quiet" style={{ width: 28, height: 28 }} aria-label={`Rename ${collection.name}`} onClick={() => navigate(`/collections/${collection.id}`)}>
              <IcPencil size={14} />
            </button>
            <button className="icon-btn icon-btn--quiet" style={{ width: 28, height: 28 }} aria-label={`Delete ${collection.name}`} onClick={() => setConfirm(true)}>
              <IcTrash size={14} />
            </button>
          </div>
        </div>
      </article>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Delete “${collection.name}”?`}
        subtitle={`${collection.items.length} titles will be unlinked. Nothing is deleted from TMDB or your My List.`}
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setConfirm(false)}>
              Keep it
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                deleteCollection(collection.id)
                setConfirm(false)
                toast.push(`Deleted ${collection.name}`, {
                  kind: 'ok',
                  action: { label: 'Undo', run: () => { const c = createCollection(collection.name, collection.description, collection.accent); collection.items.forEach((m) => toggleInCollection(c.id, m)) } },
                })
              }}
            >
              <IcTrash size={15} /> Delete
            </button>
          </>
        }
      >
        <p className="prose">This cannot be undone from the browser once the undo window closes.</p>
      </Modal>
    </>
  )
}

function One({ collection }: { collection: Collection }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: collection.name, description: collection.description, accent: collection.accent })
  const [picker, setPicker] = useState(false)
  const [term, setTerm] = useState('')

  const ordered = useMemo(() => collection.items, [collection.items])
  const inCollection = (id: number, type: string) => collection.items.some((m) => m.id === id && m.type === type)

  const results = useAsync<TmdbPoster[]>(async () => (term.trim().length > 1 ? apiSearch(term) : []), [term])

  return (
    <div className="wrap page">
      <div className="kicker" style={{ marginBottom: 8 }}>
        <Link to="/collections" className="btn--link" style={{ fontSize: 12 }}>
          Collections
        </Link>{' '}
        / {collection.name.toLowerCase().replace(/\s+/g, '-')}
      </div>

      {editing ? (
        <div className="panel" style={{ marginBottom: 18, display: 'grid', gap: 12 }}>
          <div className="field">
            <label>Name</label>
            <input className="input" value={draft.name} maxLength={48} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="field">
            <label>One line about it</label>
            <input className="input" value={draft.description} maxLength={140} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Accent</span>
            <div className="swatches">
              {COLLECTION_ACCENTS.map((c) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c, color: c }}
                  aria-pressed={draft.accent === c}
                  aria-label={`Accent ${c}`}
                  onClick={() => setDraft({ ...draft, accent: c })}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                updateCollection(collection.id, { name: draft.name.trim() || collection.name, description: draft.description, accent: draft.accent })
                setEditing(false)
                toast.push('Saved', { kind: 'ok' })
              }}
            >
              Save
            </button>
            <button className="btn btn--outline btn--sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <PageHead kicker={`${collection.items.length} titles · made ${ago(collection.createdAt)}`} title={collection.name} lead={collection.description || undefined}>
          <button className="btn btn--sm btn--outline" onClick={() => setEditing(true)}>
            <IcPencil size={14} /> Edit
          </button>
          <button className="btn btn--sm btn--primary" onClick={() => setPicker(true)}>
            <IcPlus size={14} /> Add titles
          </button>
        </PageHead>
      )}

      {ordered.length ? (
        <div className="grid-posters">
          {ordered.map((m, i) => (
            <div className="collection-item" key={`${m.type}-${m.id}`}>
              <MediaCard item={m} index={i} />
              <div className="collection-item__act">
                <button
                  className="icon-btn icon-btn--quiet"
                  style={{ width: 26, height: 26 }}
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => moveCollectionItem(collection.id, m, -1)}
                >
                  <IcChevronUp size={13} />
                </button>
                <button
                  className="icon-btn icon-btn--quiet"
                  style={{ width: 26, height: 26 }}
                  aria-label="Move down"
                  disabled={i === ordered.length - 1}
                  onClick={() => moveCollectionItem(collection.id, m, 1)}
                >
                  <IcChevronDown size={13} />
                </button>
                <button
                  className="icon-btn icon-btn--quiet"
                  style={{ width: 26, height: 26, color: 'var(--color-rose)' }}
                  aria-label={`Remove ${m.title}`}
                  onClick={() => {
                    removeFromCollection(collection.id, m)
                    toast.push(`Removed ${m.title}`, { kind: 'ok', action: { label: 'Undo', run: () => toggleInCollection(collection.id, m) } })
                  }}
                >
                  <IcClose size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty__art">
            <IcPlus />
          </div>
          <h3>Nothing in here yet</h3>
          <p style={{ maxWidth: '44ch' }}>Add from search, or hit the layers icon on any poster anywhere on the site.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm btn--primary" onClick={() => setPicker(true)}>
              <IcSearch size={14} /> Add a title
            </button>
            <Link className="btn btn--sm btn--outline" to="/movies">
              Browse
            </Link>
          </div>
        </div>
      )}

      <Modal open={picker} onClose={() => setPicker(false)} title={`Add to ${collection.name}`} subtitle="Search TMDB — films and series only." wide>
        <input
          className="input"
          autoFocus
          placeholder="Type at least two letters…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="picker-results">
          {results.loading ? <p className="hint">Searching…</p> : null}
          {!results.loading && term.trim().length < 2 ? <p className="hint">Keep typing.</p> : null}
          {!results.loading && !(results.data?.length ?? 0) && term.trim().length >= 2 ? <p className="hint">Nothing came back.</p> : null}
          {(results.data ?? []).map((hit) => {
            const meta = apiMeta(hit)
            const on = inCollection(meta.id, meta.type)
            return (
              <button
                key={`${meta.type}-${meta.id}`}
                className={cn('picker-row', on && 'is-on')}
                onClick={() => {
                    toggleInCollection(collection.id, meta)
                }}
              >
                {meta.poster ? <img src={img(meta.poster, 'w154')} alt="" loading="lazy" /> : <span className="noart" />}
                <span style={{ minWidth: 0 }}>
                  <b className="truncate">{meta.title}</b>
                  <span className="hint">
                    {meta.year ?? '—'} · {meta.type === 'tv' ? 'series' : 'film'} · {on ? 'in this collection' : 'not added'}
                  </span>
                </span>
                {on ? <IcClose size={14} /> : <IcPlus size={15} />}
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}

async function apiSearch(term: string) {
  const page = await searchMulti(term, 1)
  return (page.results ?? []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 12)
}

function apiMeta(hit: { id: number; media_type?: string; title?: string; name?: string; poster_path?: string | null; backdrop_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number }): TitleMeta {
  return {
    id: hit.id,
    type: hit.media_type === 'tv' ? 'tv' : 'movie',
    title: hit.title || hit.name || 'Untitled',
    poster: hit.poster_path ?? null,
    backdrop: hit.backdrop_path ?? null,
    year: year(hit.release_date ?? hit.first_air_date ?? ''),
    rating: hit.vote_average ? Math.round(hit.vote_average * 10) / 10 : null,
  }
}
