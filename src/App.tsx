import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { Outlet, RouterProvider, createBrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ToastProvider } from './contexts/ToastProvider'
import { PickerProvider } from './contexts/PickerProvider'
import { Header } from './components/Header'
import { Footer, TabBar } from './components/Footer'
import { RouteSkeleton } from './components/RouteSkeleton'
import { routes } from './routes'
import { useStore } from './hooks/useStore'

/* lazy per route: /watch never pays for the settings form, the settings page
 * never pays for the hero, and the first paint only ships what it needs. */
/* every page module is cast to ComponentType<any> so one helper covers pages
 * that take props (auth mode, detail mode) and ones that take none. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const page = (key: keyof typeof routes) => lazy(routes[key] as unknown as () => Promise<{ default: ComponentType<any> }>)

const Home = page('home')
const Movies = page('movies')
const Series = page('series')
const Search = page('search')
const MovieDetail = page('movie')
const TvDetail = page('tv')
const Person = page('person')
const Collections = page('collections')
const MyPriva = page('my')
const Settings = page('settings')
const Auth = page('auth')
const Watch = page('watch')
const NotFound = page('notFound')

function Shell() {
  const { pathname } = useLocation()
  useApplyPrefs()
  useStickyHeader()
  useGlobalKeys()

  // the watch page and the auth page are their own rooms: no header, no
  // footer, no tab bar stealing vertical space
  const bare = /^\/(watch|sign-in|sign-up)/.test(pathname)

  const content = (
    <Suspense fallback={<RouteSkeleton bare={bare} />}>
      <Outlet />
    </Suspense>
  )

  useEffect(() => {
    if (window.location.hash.length > 1) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  if (bare) return content

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        {content}
      </main>
      <Footer />
      <TabBar />
      <BackToTop />
    </>
  )
}

/** prefs → document attributes. One place, so the theme can never drift. */
function useApplyPrefs() {
  const { prefs } = useStore()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = prefs.theme
    root.dataset.motion = prefs.reduceMotion ? 'off' : 'on'
    root.style.setProperty('--player-color', `#${prefs.accent.replace('#', '')}`)
    root.style.setProperty('--card-gap', prefs.posterSize === 'compact' ? '10px' : prefs.posterSize === 'large' ? '20px' : '14px')
    root.style.setProperty('--grid-min', prefs.posterSize === 'compact' ? '124px' : prefs.posterSize === 'large' ? '208px' : '168px')
    const meta = document.querySelector('meta[name=theme-color]')
    meta?.setAttribute('content', prefs.theme === 'paper' ? '#f3f0e9' : '#08090c')
  }, [prefs.theme, prefs.reduceMotion, prefs.accent, prefs.posterSize])
}

function useStickyHeader() {
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const head = document.querySelector<HTMLElement>('.site-head')
        if (!head) return
        head.classList.toggle('is-stuck', window.scrollY > 12)
        document.documentElement.style.setProperty('--scrolled', String(Math.min(1, window.scrollY / 420)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

const KEYS: Record<string, string> = { s: '/search', h: '/', m: '/movies', t: '/series', l: '/my', c: '/my?tab=continue', b: '/collections' }

function useGlobalKeys() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const typing = !!target?.closest('input, textarea, select, [contenteditable="true"], iframe')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        const box = document.querySelector<HTMLInputElement>('#global-search')
        if (box) box.focus()
        else window.location.assign('/search')
        return
      }
      if (typing || location.pathname.startsWith('/watch')) return
      const to = KEYS[e.key.toLowerCase()]
      if (to && e.key.length === 1) {
        e.preventDefault()
        navigate(to)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [location.pathname, navigate])
}

function BackToTop() {
  useEffect(() => {
    let btn = document.querySelector<HTMLButtonElement>('#to-top')
    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'to-top'
      btn.className = 'to-top'
      btn.setAttribute('aria-label', 'Back to top')
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>'
      btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' })
      document.body.appendChild(btn)
    }
    const onScroll = () => btn!.classList.toggle('is-on', window.scrollY > 1200)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return null
}


const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Home />, handle: { title: 'Priva — movies and TV, quietly' } },
      { path: '/movies', element: <Movies /> },
      { path: '/series', element: <Series /> },
      { path: '/search', element: <Search /> },
      { path: '/movie/:id', element: <MovieDetail /> },
      { path: '/movie/:id/:slug', element: <MovieDetail /> },
      { path: '/movie/:id/credits', element: <MovieDetail mode="credits" /> },
      { path: '/tv/:id', element: <TvDetail /> },
      { path: '/tv/:id/:slug', element: <TvDetail /> },
      { path: '/tv/:id/credits', element: <TvDetail mode="credits" /> },
      { path: '/person/:id', element: <Person /> },
      { path: '/person/:id/:slug', element: <Person /> },
      { path: '/collections', element: <Collections /> },
      { path: '/collections/:id', element: <Collections /> },
      { path: '/my', element: <MyPriva /> },
      { path: '/settings', element: <Settings /> },
      { path: '/sign-in', element: <Auth /> },
      { path: '/sign-up', element: <Auth mode="signup" /> },
      { path: '/watch/movie/:id', element: <Watch /> },
      { path: '/watch/tv/:id/:season/:episode', element: <Watch /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PickerProvider>
          <RouterProvider router={router} />
        </PickerProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
