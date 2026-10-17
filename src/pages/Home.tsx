import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Rail } from '../components/Rail'
import { RailEmpty } from '../components/Rail'
import { HeroTrailer } from '../components/HeroTrailer'
import { WideCard } from '../components/WideCard'
import { SmartLink } from '../components/SmartLink'
import { ErrorNote } from '../components/Bits'
import { useAsync } from '../hooks/useAsync'
import { useStore } from '../hooks/useStore'
import { usePageVisible } from '../hooks/useMedia'
import * as api from '../lib/tmdb'
import { cardHref } from '../lib/card'
import { continueWatching, recentSeeds } from '../lib/derive'
import { REGIONS, genreName } from '../lib/constants'
import { cn } from '../lib/utils'
import type { CSSProperties } from 'react'
import { toggleMyList, inMyList } from '../lib/store'
import { useToast } from '../contexts/ToastProvider'
import { useWatchLink } from '../hooks/useMedia'
import { IcBookmark, IcBookmarkFilled, IcChevronLeft, IcChevronRight, IcInfo, IcLayers, IcPlay, IcPlus } from '../components/icons'
import { usePicker } from '../contexts/PickerProvider'
import type { TitleMeta, TmdbPoster, ResultsPage } from '../lib/types'

const DWELL = 12000

export default function Home() {
  const { prefs, data } = useStore()
  const region = prefs.region

  return (
    <>
      <HomeHero />

      <div className="wrap" style={{ position: 'relative', zIndex: 2, marginTop: 26 }}>
        <ContinueRail />
        <TopTen kind="movie" />
        <QueryRail
          title="On everybody’s mind"
          note="trend of the day"
          seeAllTo="/movies?sort=popularity.desc"
          load={() => api.trending('movie')}
          railKey={`trending-${region}`}
        />
        <BecauseYouWatched />
        <NewAndLanding />
        <TopTen kind="tv" />
        <QueryRail
          title="Series worth a whole weekend"
          note="most watched shows right now"
          seeAllTo="/series"
          load={() => api.popular('tv')}
          railKey={`tv-popular-${region}`}
        />
        <CollectionsStrip />
        <QueryRail
          title="Critically adored"
          note="7.5+ from at least a thousand people"
          seeAllTo="/movies?sort=vote_average.desc"
          load={() => api.discover('movie', { sort: 'vote_average.desc', minVotes: 1000, yearFrom: 1990 })}
          railKey="adored"
        />
        <QueryRail
          title="Sleep with the lights on"
          note="horror, 2018 onwards"
          seeAllTo="/movies?genre=27"
          load={() => api.discover('movie', { genre: 27, yearFrom: 2018, sort: 'popularity.desc' })}
          railKey="horror"
        />
        <QueryRail
          title="Documentaries that argue with you"
          seeAllTo="/movies?genre=99"
          load={() => api.discover('movie', { genre: 99, sort: 'vote_average.desc', minVotes: 250 })}
          railKey="docs"
        />
        <QueryRail
          title="Animation, not only for small people"
          seeAllTo="/movies?genre=16"
          load={() => api.discover('movie', { genre: 16, sort: 'popularity.desc' })}
          railKey="animation"
        />
        <RegionNote region={region} count={data.myList.length} />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * hero
 * ------------------------------------------------------------------ */

interface Slide {
  meta: TitleMeta
  tagline: string | null
  overview: string
  trailer: api.Trailer | null
  genres: string[]
  backdrop: string | null
}

function HomeHero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const visible = usePageVisible()
  const hostRef = useRef<HTMLDivElement>(null)

  const { data: pool, error, loading } = useAsync(async () => {
    const [movies, shows] = await Promise.all([api.trending('movie'), api.trending('tv')])
    const picked = dedupe([...(movies.results ?? []), ...(shows.results ?? [])])
      .filter((r) => r.backdrop_path && (r.media_type === 'movie' || r.media_type === 'tv'))
      .slice(0, 5)
    const details = await Promise.all(
      picked.map(async (item): Promise<Slide | null> => {
        const type = item.media_type === 'tv' ? 'tv' : 'movie'
        try {
          const videos = await api.videosOnly(type, item.id)
          return {
            meta: api.toMeta(item),
            tagline: null,
            overview: item.overview ?? '',
            trailer: api.pickTrailer(videos),
            genres: (item.genre_ids ?? []).map((g) => genreName(type, g)).filter(Boolean),
            backdrop: item.backdrop_path ?? null,
          }
        } catch {
          return null
        }
      }),
    )
    const slides = details.filter((s): s is Slide => !!s)
    return slides.length ? slides : null
  }, [])

  const slides = pool ?? []
  const slide = slides[index]

  useEffect(() => {
    if (slides.length < 2 || paused || !visible) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), DWELL)
    return () => clearTimeout(t)
  }, [index, paused, visible, slides.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input,textarea')) return
      if (e.key === 'ArrowRight' && slides.length) setIndex((i) => (i + 1) % slides.length)
      if (e.key === 'ArrowLeft' && slides.length) setIndex((i) => (i - 1 + slides.length) % slides.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  if (loading && !slides.length) return <HeroSkeleton />
  if (!slide) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        <ErrorNote
          message={
            error ??
            'No trending list at the moment. Priva reads TMDB for everything, so a rate-limit or a bad key shows up right here.'
          }
        />
      </div>
    )
  }

  return (
    <section
      className="hero"
      ref={hostRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured on Priva"
    >
      <HeroTrailer backdrop={slide.backdrop} poster={slide.meta.poster} trailer={slide.trailer} title={slide.meta.title} key={slide.meta.id} />
      <div className="wrap">
        <div className="hero__body">
          <div className="kicker">
            <span className="kicker--flare">Tonight on Priva</span> · {index + 1} of {slides.length} ·{' '}
            {slide.meta.type === 'tv' ? 'series' : 'film'}
          </div>
          <h1 className="hero__title">{slide.meta.title}</h1>
          {slide.overview ? <p className="hero__synopsis clamp-3">{slide.overview}</p> : null}
          <div className="hero__row">
            {slide.meta.rating ? (
              <span className="rating">
                <i>★</i> {slide.meta.rating.toFixed(1)}
              </span>
            ) : null}
            <span className="num muted" style={{ fontSize: 13 }}>
              {slide.meta.year ?? '—'}
            </span>
            {slide.genres.slice(0, 3).map((g) => (
              <span className="pill" key={g}>
                {g}
              </span>
            ))}
          </div>
          <HeroActions slide={slide} />
        </div>
      </div>

      <div className="wrap" style={{ position: 'absolute', bottom: 34, right: 28, zIndex: 3 }}>
        <div className="hero__dots" style={{ position: 'static' }}>
          {slides.map((s, i) => (
            <button
              key={s.meta.id}
              className={cn(i === index && 'is-on')}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.meta.title}`}
              aria-current={i === index}
              style={{ '--hero-dwell': `${DWELL}ms` } as CSSProperties}
            >
              {i === index && !paused ? <i /> : null}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            <button className="icon-btn icon-btn--quiet" onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)} aria-label="Previous slide">
              <IcChevronLeft size={15} />
            </button>
            <button className="icon-btn icon-btn--quiet" onClick={() => setIndex((i) => (i + 1) % slides.length)} aria-label="Next slide">
              <IcChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroActions({ slide }: { slide: Slide }) {
  const toast = useToast()
  const picker = usePicker()
  const watch = useWatchLink(slide.meta)
  const saved = inMyList(slide.meta.id)
  return (
    <div className="hero__actions">
      <SmartLink className="btn btn--primary btn--play" to={watch.href}>
        <IcPlay /> {watch.startAt ? `Resume at ${Math.floor(watch.startAt / 60)} min` : 'Play now'}
      </SmartLink>
      <SmartLink className="btn btn--glass btn--play" to={cardHref(slide.meta.type, slide.meta.id, slide.meta.title)}>
        <IcInfo /> More info
      </SmartLink>
      <button
        className="btn btn--outline"
        onClick={() => {
          const added = toggleMyList(slide.meta)
          toast.push(added ? `Saved ${slide.meta.title}` : `Removed ${slide.meta.title}`, {
            kind: 'ok',
            action: { label: 'Undo', run: () => toggleMyList(slide.meta) },
          })
        }}
      >
        {saved ? <IcBookmarkFilled size={16} /> : <IcBookmark size={16} />} {saved ? 'In My List' : 'My List'}
      </button>
      <button className="btn btn--outline" onClick={() => picker.open(slide.meta)}>
        <IcLayers size={16} /> Collection
      </button>
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="hero" style={{ minHeight: 'min(70vh, 620px)' }}>
      <div className="hero__media" style={{ background: 'linear-gradient(160deg, var(--color-panel), var(--color-ink2))' }} />
      <div className="wrap hero__body" style={{ paddingBottom: 40 }}>
        <div className="skel skel--text" style={{ width: 150 }} />
        <div className="skel skel--text" style={{ width: 'min(560px,80%)', height: 44, marginTop: 8 }} />
        <div className="skel skel--text" style={{ width: 'min(420px,70%)', height: 14, marginTop: 14 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <div className="skel" style={{ width: 150, height: 46, borderRadius: 99 }} />
          <div className="skel" style={{ width: 130, height: 46, borderRadius: 99 }} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * rails
 * ------------------------------------------------------------------ */

function QueryRail({
  title,
  note,
  seeAllTo,
  load,
  railKey,
  ranked,
  count,
}: {
  title: string
  note?: string
  seeAllTo?: string
  load: () => Promise<ResultsPage>
  railKey: string
  ranked?: boolean
  count?: number
}) {
  const { data, loading, error, reload } = useAsync(async () => load(), [railKey])
  const items = useMemo(() => (data?.results ?? []).slice(0, count ?? 20), [data, count])
  if (!loading && !items.length && !error) return null
  return (
    <Rail
      title={title}
      note={note}
      seeAllTo={seeAllTo}
      seeAllLabel={seeAllTo ? 'See all' : undefined}
      items={items}
      loading={loading}
      error={error}
      ranked={ranked}
      count={count}
      onRetry={reload}
    />
  )
}

function ContinueRail() {
  const { data } = useStore()
  const list = continueWatching(data.progress)
  if (!list.length) return null
  return (
    <section className="rail">
      <header className="rail__head">
        <h2>Keep your place</h2>
        <span className="rail__note">
          {list.length} unfinished · progress is read straight from the player
        </span>
        <div className="grow" />
        <Link className="pill pill--link" to="/my?tab=continue">
          All of it
        </Link>
      </header>
      <div className="rail__track no-bar" style={{ gridAutoColumns: 'min(78vw, 340px)' }}>
        {list.slice(0, 10).map((entry) => (
          <WideCard key={`${entry.type}-${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function TopTen({ kind }: { kind: 'movie' | 'tv' }) {
  const { prefs } = useStore()
  const { data, loading, error, reload } = useAsync(() => api.popular(kind, 1), [kind, prefs.region])
  const items = (data?.results ?? []).slice(0, 10)
  const label = REGIONS.find((r) => r.code === prefs.region)?.name ?? prefs.region
  return (
    <Rail
      title={
        <>
          Top 10 {kind === 'movie' ? 'films' : 'shows'} in {label.split(' ').slice(0, 1)} today
        </>
      }
      note={`popularity in ${label}, refreshed hourly`}
      seeAllTo={kind === 'movie' ? '/movies?view=top10' : '/series?view=top10'}
      seeAllLabel="The whole list"
      items={items}
      loading={loading}
      error={error}
      ranked
      count={10}
      onRetry={reload}
      cardWidth={196}
    />
  )
}

function NewAndLanding() {
  const { prefs } = useStore()
  const { data, loading, error, reload } = useAsync(() => api.upcoming(prefs.region), [prefs.region])
  const items = data?.results ?? []
  return (
    <Rail
      title="New and about to land"
      note="cinema and streaming dates near you"
      seeAllTo="/movies?sort=primary_release_date.desc"
      seeAllLabel="See all"
      items={items}
      loading={loading}
      error={error}
      onRetry={reload}
    />
  )
}

function BecauseYouWatched() {
  const { data } = useStore()
  const seeds = useMemo(() => recentSeeds(data.progress, data.myList, data.myListMeta), [data])
  const seed = seeds[0]
  const other = seeds[1]

  const primary = useAsync(() => (seed ? api.recommendations(seed.type, seed.id) : Promise.resolve(undefined)), [seed?.id, seed?.type])
  const backup = useAsync(
    () => (other ? api.recommendations(other.type, other.id) : Promise.resolve(undefined)),
    [other?.id, other?.type],
  )

  const items = useMemo(() => {
    const a = primary.data?.results ?? []
    const b = backup.data?.results ?? []
    const seen = new Set<number>()
    return [...a, ...b].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
  }, [primary.data, backup.data])

  if (!seed) {
    return (
      <section className="rail">
        <header className="rail__head">
          <h2>Because you watched…</h2>
          <span className="rail__note">nothing yet — this rail wakes up after your first watch</span>
        </header>
        <RailEmpty>
          <p style={{ maxWidth: '46ch' }}>
            Play anything for more than a minute and Priva starts guessing from it. No accounts, no cookies — the maths happens
            against TMDB’s recommendation graph.
          </p>
          <Link className="btn btn--sm btn--primary" to="/movies">
            <IcPlus size={15} /> Find something
          </Link>
        </RailEmpty>
      </section>
    )
  }

  return (
    <Rail
      title={
        <>
          Because you watched <em style={{ fontStyle: 'normal', color: 'var(--color-flare)' }}>{seed.title}</em>
        </>
      }
      note={other ? `also from ${other.title}` : 'one title is enough to start'}
      seeAllTo={cardHref(seed.type, seed.id, seed.title)}
      seeAllLabel="About that one"
      items={items.slice(0, 16)}
      loading={primary.loading}
      error={primary.error}
      onRetry={primary.reload}
      count={16}
    />
  )
}

function CollectionsStrip() {
  const { data } = useStore()
  const collections = data.collections
  if (!collections.length) return null
  return (
    <section className="rail">
      <header className="rail__head">
        <h2>Your collections</h2>
        <span className="rail__note">made by you, not by an algorithm</span>
        <div className="grow" />
        <Link className="pill pill--link" to="/collections">
          Manage
        </Link>
      </header>
      <div className="rail__track no-bar" style={{ gridAutoColumns: 'min(72vw, 260px)' }}>
        {collections.map((c) => {
          const first = c.items.slice(0, 3)
          return (
            <SmartLink key={c.id} to={`/collections/${c.id}`} className="mini-collection">
              <div className="mini-collection__art">
                {first.length ? (
                  first.map((m) => (
                    <img key={m.id} src={api.posterUrl(m.poster, 'w185')} alt="" loading="lazy" decoding="async" />
                  ))
                ) : (
                  <span className="mini-collection__empty" style={{ background: c.accent }} />
                )}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div className="card__name truncate">{c.name}</div>
                <div className="hint num">
                  {c.items.length} item{c.items.length === 1 ? '' : 's'}
                </div>
              </div>
            </SmartLink>
          )
        })}
      </div>
    </section>
  )
}

function RegionNote({ region, count }: { region: string; count: number }) {
  return (
    <aside className="home-note">
      <div>
        <h3>Priva, configured</h3>
        <p>
          Region <b>{region}</b> for what is legal to stream and when things are released, {count ? `${count} titles in your list` : 'nothing saved yet'}
          , and your default player comes from the Settings page. Everything here is one switch away.
        </p>
      </div>
      <Link className="btn btn--outline" to="/settings">
        Tune Priva
      </Link>
    </aside>
  )
}

function dedupe(items: TmdbPoster[]): TmdbPoster[] {
  const out: TmdbPoster[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const type = item.media_type === 'tv' ? 'tv' : 'movie'
    const key = `${type}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
