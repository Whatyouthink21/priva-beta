import { useMemo, useState } from 'react'
import type { CastMember, CrewMember } from '../lib/types'
import { img } from '../lib/utils'
import { SmartLink } from './SmartLink'
import { personHref } from '../lib/card'
import { IcSearch } from './icons'

export interface PersonLike {
  id: number
  name: string
  profile_path?: string | null
  character?: string
  job?: string
  department?: string
}

export function PersonCard({ person, sub }: { person: PersonLike; sub?: string }) {
  const caption = sub ?? person.character ?? person.job ?? person.department ?? ''
  return (
    <SmartLink to={personHref(person.id, person.name)} className="person-card" aria-label={person.name}>
      <span className="person-card__face">
        {person.profile_path ? (
          <img
            src={img(person.profile_path, 'w185')}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span className="noart" style={{ position: 'static', width: 'auto', height: 'auto' }}>
            <span>{person.name.slice(0, 2).toUpperCase()}</span>
          </span>
        )}
      </span>
      <span className="person-card__name clamp-2">{person.name}</span>
      <span className="person-card__role truncate">{caption || '—'}</span>
    </SmartLink>
  )
}

/** The compact strip that sits on a title page. "See everything" opens the
 *  full credits page with the small jobs nobody lists. */
export function CastStrip({ cast, seeAllTo }: { cast: CastMember[]; seeAllTo?: string }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h3>Cast</h3>
        <span className="hint">{cast.length} billed</span>
        <div className="grow" />
        {seeAllTo ? (
          <SmartLink className="pill pill--link" to={seeAllTo}>
            Full cast &amp; crew
          </SmartLink>
        ) : null}
      </div>
      <div className="grid-people">
        {cast.slice(0, 12).map((c) => (
          <PersonCard key={c.credit_id ?? c.id} person={c} />
        ))}
      </div>
    </section>
  )
}

const DEPT_LABEL: Record<string, string> = {
  Directing: 'Directing',
  Writing: 'Writing',
  Production: 'Producing',
  Camera: 'Camera & photography',
  'Costume & Make-Up': 'Costume & make-up',
  Crew: 'Other crew',
  Editing: 'Editing',
  Art: 'Art direction',
  Sound: 'Sound',
  'Visual Effects': 'Visual effects',
  Lighting: 'Lighting',
  VFX: 'VFX & digital',
  Costume: 'Costume design',
  'Make-Up': 'Make-up',
  'Health & Make-Up': 'Health & make-up',
  'Special Effects': 'Special effects',
  ARRI: 'Camera (ARRI unit)',
  'Production Management': 'Production management',
  'Second Unit Or Visual Effects': 'Second unit',
  'Additional Crew': 'Additional crew',
}

export function CreditsTable({ cast, crew }: { cast: CastMember[]; crew: CrewMember[] }) {
  const [filter, setFilter] = useState('')

  const grouped = useMemo(() => {
    const rows: CrewMember[] = [
      ...crew,
      ...cast.map((c) => ({
        id: c.id,
        name: c.name,
        original_name: c.original_name,
        job: 'Actor',
        department: 'Actors',
        profile_path: c.profile_path,
        character: c.character,
        credit_id: c.credit_id,
      })),
    ]
    const needle = filter.trim().toLowerCase()
    const byDept = new Map<string, CrewMember[]>()
    for (const row of rows) {
      if (needle && !(`${row.name} ${row.job} ${row.department} ${row.character ?? ''}`.toLowerCase().includes(needle))) continue
      const list = byDept.get(row.department)
      if (list) list.push(row)
      else byDept.set(row.department, [row])
    }
    const order = Object.keys(DEPT_LABEL)
    return [...byDept.entries()].sort((a, b) => {
      const ai = order.indexOf(a[0])
      const bi = order.indexOf(b[0])
      if (ai === bi) return a[0].localeCompare(b[0])
      if (ai < 0) return 1
      if (bi < 0) return -1
      return ai - bi
    })
  }, [cast, crew, filter])

  return (
    <div>
      <label className="credit-filter">
        <IcSearch size={15} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter 600+ credits by name, job or character…"
          aria-label="Filter credits"
        />
        {filter ? (
          <button type="button" className="btn btn--link" style={{ fontSize: 12 }} onClick={() => setFilter('')}>
            clear
          </button>
        ) : null}
      </label>

      <div className="credit-groups">
        {grouped.map(([dept, rows]) => (
          <section key={dept} className="credit-group">
            <h4>
              {DEPT_LABEL[dept] ?? dept} <span className="num">{rows.length}</span>
            </h4>
            <ul>
              {rows.map((r, i) => (
                <li key={`${r.credit_id ?? 'x'}-${r.id}-${i}`}>
                  <SmartLink to={personHref(r.id, r.name)}>{r.name}</SmartLink>
                  <span className="hint">—</span>
                  <span className="credit-job">{r.job}</span>
                  {r.character ? <span className="credit-role">{r.character}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!grouped.length ? <p className="hint">Nothing matches “{filter}”.</p> : null}
      </div>
    </div>
  )
}
