import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/tmdb'
import { useAsync } from '../hooks/useAsync'
import { cn, groupBy, img, year } from '../lib/utils'
import { cardHref } from '../lib/card'
import { SmartLink } from '../components/SmartLink'
import { ErrorNote } from '../components/Bits'
import { IcExternal, IcFilm, IcTv, IcUsers } from '../components/icons'
import type { PersonCredit } from '../lib/types'

export default function PersonPage() {
  const { id } = useParams()
  const personId = Number(id)
  const { data, loading, error, reload } = useAsync(
    () => (Number.isFinite(personId) ? api.person(personId) : Promise.reject(new Error('That is not a person id'))),
    [personId],
  )
  const [tab, setTab] = useState<'cast' | 'crew'>('cast')

  const credits = data?.combined_credits
  const cast = useMemo(() => (credits?.cast ?? []).slice().sort(byYear), [credits])
  const crew = useMemo(() => (credits?.crew ?? []).slice().sort(byYear), [credits])
  const knownFor = useMemo(() => (credits?.cast ?? []).slice().sort(byPopularity).slice(0, 6), [credits])
  const groups = useMemo(() => (tab === 'crew' ? [...groupBy(crew, (c) => c.department ?? 'Other')] : []), [tab, crew])

  if (loading && !data) {
    return (
      <div className="wrap page">
        <div className="skel skel--text" style={{ width: 200, height: 30 }} />
        <div className="skel skel--text" style={{ width: '60%', height: 13, marginTop: 14 }} />
      </div>
    )
  }
  if (error || !data) return <ErrorNote message={error ?? 'TMDB has nobody with that id.'} onRetry={reload} />

  const born = data.birthday ? year(data.birthday) : null
  const died = data.deathday ? year(data.deathday) : null
  const age = data.birthday && !data.deathday ? ageFrom(data.birthday) : null

  return (
    <div className="wrap page">
      <header className="person-head">
        <div className="person-head__face">
          {data.profile_path ? (
            <img src={img(data.profile_path, 'w185')} alt="" width={185} height={278} fetchPriority="high" decoding="async" />
          ) : (
            <span className="noart" style={{ position: 'absolute', inset: 0 }}>
              <IcUsers />
            </span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="kicker kicker--flare">Cast &amp; crew</div>
          <h1 style={{ fontSize: 'clamp(1.9rem,4.6vw,3rem)', margin: '6px 0 4px' }}>{data.name}</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {data.known_for_department}
            {born ? ` · born ${born}` : ''}
            {died ? `–${died}` : age ? ` (age ${age})` : ''}
            {data.place_of_birth ? ` · ${data.place_of_birth}` : ''}
          </p>
          {data.biography ? <BioParagraph text={data.biography} /> : <p className="hint">TMDB has no biography on file for this one.</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {data.imdb_id ? (
              <a className="pill pill--link" href={`https://www.imdb.com/name/${data.imdb_id}/`} target="_blank" rel="noreferrer noopener">
                IMDb <IcExternal size={12} />
              </a>
            ) : null}
            <a className="pill pill--link" href={`https://www.themoviedb.org/person/${data.id}`} target="_blank" rel="noreferrer noopener">
              TMDB page <IcExternal size={12} />
            </a>
            {data.homepage ? (
              <a className="pill pill--link" href={data.homepage} target="_blank" rel="noreferrer noopener">
                Website <IcExternal size={12} />
              </a>
            ) : null}
            <span className="pill">
              {cast.length} credited roles · {crew.length} behind the camera
            </span>
          </div>
        </div>
      </header>

      {knownFor.length ? (
        <section className="rail" style={{ marginTop: 10 }}>
          <header className="rail__head">
            <h2>Known for</h2>
          </header>
          <div className="rail__track no-bar">
            {knownFor.map((c, i) => (
              <KnownForCard key={c.credit_id} credit={c} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel__head" style={{ flexWrap: 'wrap' }}>
          <h3>Credits</h3>
          <div className="grow" />
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'cast'} onClick={() => setTab('cast')}>
              Acting · {cast.length}
            </button>
            <button role="tab" aria-selected={tab === 'crew'} onClick={() => setTab('crew')}>
              Crew · {crew.length}
            </button>
          </div>
        </div>

        {tab === 'cast' ? (
          <ul className="credit-list">
            {cast.map((c) => (
              <CreditRow key={c.credit_id} credit={c} sub={c.character ?? ''} />
            ))}
            {!cast.length ? <li className="hint">Nothing credited as acting.</li> : null}
          </ul>
        ) : (
          <div className="credit-groups" style={{ marginTop: 4 }}>
            {groups.map(([dept, rows]) => (
              <section key={dept}>
                <h4>
                  {dept} <span className="num">{rows.length}</span>
                </h4>
                <ul className="credit-list">
                  {rows.map((c) => (
                    <CreditRow key={c.credit_id} credit={c} sub={c.jobs?.join(', ') ?? ''} />
                  ))}
                </ul>
              </section>
            ))}
            {!crew.length ? <p className="hint">No crew credits filed.</p> : null}
          </div>
        )}
      </div>

      <p style={{ marginTop: 18 }}>
        <Link to="/search?in=person" className="btn btn--sm btn--outline">
          Find somebody else
        </Link>
      </p>
    </div>
  )
}

function KnownForCard({ credit, index }: { credit: PersonCredit; index: number }) {
  const meta = api.personCreditToMeta(credit)
  return (
    <SmartLink to={cardHref(meta.type, meta.id, meta.title)} style={{ display: 'block' }} aria-label={meta.title}>
      <article className="card">
        <div className="card__media">
          {img(credit.poster_path, 'w342') ? (
            <img src={img(credit.poster_path, 'w342')} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" data-loaded="true" />
          ) : (
            <span className="noart" style={{ position: 'absolute', inset: 0 }}>
              {credit.title ?? credit.name}
            </span>
          )}
          <div className="card__veil">
            <div className="card__title">{credit.title ?? credit.name}</div>
            <div className="card__sub">{credit.character ?? credit.jobs?.[0] ?? ''}</div>
          </div>
        </div>
        <div className="card__body">
          <div className="card__name truncate">{credit.title ?? credit.name}</div>
          <div className="card__meta">
            <span>{year(credit.release_date ?? credit.first_air_date ?? '') ?? '—'}</span>
            {credit.vote_average ? <span>★ {credit.vote_average.toFixed(1)}</span> : null}
          </div>
        </div>
      </article>
    </SmartLink>
  )
}

function CreditRow({ credit, sub }: { credit: PersonCredit; sub: string }) {
  const type = credit.media_type
  return (
    <li>
      <SmartLink to={cardHref(type, credit.id, credit.title ?? credit.name)} className="credit-row">
        <span className="credit-row__year num">{year(credit.release_date ?? credit.first_air_date ?? '') ?? '—'}</span>
        <span className="credit-row__poster">
          {credit.poster_path ? (
            <img src={img(credit.poster_path, 'w154')} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="noart" style={{ position: 'absolute', inset: 0 }}>
              {type === 'tv' ? <IcTv size={15} /> : <IcFilm size={15} />}
            </span>
          )}
        </span>
        <span className="credit-row__body">
          <span className="credit-row__title truncate">{credit.title ?? credit.name}</span>
          <span className="hint truncate">
            {sub || '—'}
            {type === 'tv' && credit.episode_count ? ` · ${credit.episode_count} episode${credit.episode_count === 1 ? '' : 's'}` : ''}
          </span>
        </span>
        <span className="badge">{type === 'tv' ? 'series' : 'film'}</span>
      </SmartLink>
    </li>
  )
}

function BioParagraph({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const isLong = text.length > 420
  return (
    <p className="prose" style={{ marginTop: 12, maxWidth: '68ch' }}>
      {open || !isLong ? text : `${text.slice(0, 420).trimEnd()}…`}
      {isLong ? (
        <button className={cn('btn--link')} style={{ marginLeft: 8, fontSize: 13 }} onClick={() => setOpen((v) => !v)}>
          {open ? 'less' : 'read more'}
        </button>
      ) : null}
    </p>
  )
}

const byYear = (a: PersonCredit, b: PersonCredit) =>
  (year(b.release_date ?? b.first_air_date ?? '') ?? 0) - (year(a.release_date ?? a.first_air_date ?? '') ?? 0)

const byPopularity = (a: PersonCredit, b: PersonCredit) => (b.vote_count ?? 0) - (a.vote_count ?? 0)

function ageFrom(iso: string): number | null {
  const born = Date.parse(iso)
  if (!born) return null
  return Math.floor((Date.now() - born) / (365.25 * 24 * 3600 * 1000))
}
