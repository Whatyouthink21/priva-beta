import { useMemo, useState } from 'react'
import * as api from '../lib/tmdb'
import { hasTmdbKey } from '../lib/env'
import { MEDIA_BASE, PROVIDERS, REGIONS } from '../lib/constants'
import type { MediaType, ProviderCell, ProvidersPayload } from '../lib/types'
import { cn } from '../lib/utils'
import { useAsync } from '../hooks/useAsync'
import { IcExternal, IcGlobe } from './icons'
import { SmartLink } from './SmartLink'

/* ------------------------------------------------------------------ *
 * "Where is it legal to watch?" — TMDB's watch/providers payload, split
 * into the four things people actually care about.
 * ------------------------------------------------------------------ */

const GROUPS = [
  { key: 'flatrate', label: 'Stream' },
  { key: 'ads', label: 'Free with ads' },
  { key: 'rent', label: 'Rent' },
  { key: 'buy', label: 'Buy' },
] as const

export function StreamingProviders({
  payload,
  region,
  onRegion,
}: {
  payload?: ProvidersPayload
  region: string
  onRegion?: (region: string) => void
}) {
  const cell = payload?.results?.[region] ?? payload?.results?.US ?? null
  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: (cell?.[g.key] ?? []).slice().sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99)),
      })).filter((g) => g.items.length),
    [cell],
  )

  return (
    <section className="panel" id="providers">
      <div className="panel__head">
        <h3>Official streaming</h3>
        {onRegion ? (
          <label className="region-pick grow" style={{ marginLeft: 'auto' }}>
            <IcGlobe size={14} />
            <span className="visually-hidden">Region</span>
            <select className="region-select" value={region} onChange={(e) => onRegion(e.target.value)} aria-label="Provider region">
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {payload?.link ? (
          <a className="pill pill--link" href={payload.link} target="_blank" rel="noreferrer noopener">
            JustWatch <IcExternal size={13} />
          </a>
        ) : null}
      </div>

      {!groups.length ? (
        <p className="hint">
          Nothing listed for {region} — TMDB only knows about big legal catalogues, so a title being absent here says more about
          the catalogue than about the film.
        </p>
      ) : (
        <div className="prov-groups">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="kicker" style={{ marginBottom: 8 }}>
                {g.label}
              </div>
              <div className="prov-list">
                {g.items.map((p) => (
                  <ProviderBadge key={p.provider_id} cell={p} large={g.key === 'flatrate'} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ProviderLogo({
  path,
  name,
  size,
  className,
}: {
  path?: string | null
  name: string
  size: string
  className: string
}) {
  const [failed, setFailed] = useState(false)
  if (!path || failed) return null
  const relativePath = path.startsWith('/') ? path : `/${path}`
  return (
    <img
      className={className}
      src={`${MEDIA_BASE}/${size}${relativePath}`}
      alt=""
      aria-hidden="true"
      title={`${name} logo`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function ProviderBadge({ cell, large }: { cell: ProviderCell; large?: boolean }) {
  return (
    <span className={cn('provider', large && 'provider--lg')} title={cell.provider_name}>
      <ProviderLogo
        path={cell.logo_path}
        name={cell.provider_name}
        size={large ? 'w92' : 'w45'}
        className={cn('provider__logo', large && 'provider__logo--lg')}
      />
      {cell.provider_name}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * The "By provider" row on Movies / Series.
 * Provider artwork comes from TMDB's region-specific provider directory.
 * ------------------------------------------------------------------ */

export function ProviderRow({
  value,
  region,
  kind,
  onChange,
}: {
  value: number | null
  region: string
  kind: MediaType
  onChange: (id: number | null) => void
}) {
  const hasKey = hasTmdbKey()
  const { data } = useAsync(
    (signal) => api.providerDirectory(kind, region, signal),
    [kind, region],
    { enabled: hasKey },
  )
  const logos = useMemo(() => new Map((data?.results ?? []).map((p) => [p.provider_id, p.logo_path])), [data])

  return (
    <div className="prov-filter">
      <span className="field-label" style={{ alignSelf: 'center' }}>
        By provider
      </span>
      <div className="prov-filter__list no-bar">
        <button className={cn('chip', !value && 'is-on')} onClick={() => onChange(null)}>
          Anywhere
        </button>
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            className={cn('chip', value === p.id && 'is-on')}
            onClick={() => onChange(value === p.id ? null : p.id)}
            title={`${p.name} · ${REGIONS.find((r) => r.code === region)?.name ?? region}`}
            aria-label={`Filter by ${p.name}`}
          >
            <ProviderLogo path={logos.get(p.id)} name={p.name} size="w45" className="prov-filter__logo" />
            {p.short}
          </button>
        ))}
        <SmartLink className="chip" to="/settings#providers">
          region: {region}
        </SmartLink>
      </div>
    </div>
  )
}
