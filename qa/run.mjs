/* Mount every route in jsdom and report what rendered.
 *
 * This is not a test suite — it is the ten-second check that says "no white
 * screens" before a push. It catches what a type checker cannot: a page that
 * throws the moment it is touched. It runs the whole app twice:
 *
 *   offline     fetch() rejects — every page has to degrade with a retry note
 *   with data   fetch() answers from qa/fixtures.mjs and localStorage holds a
 *               list, a half-watched film and a collection, so the rails,
 *               cards, continue-watching and collection grids actually render
 *
 * The app is built into a single classic script (qa/vite.qa.config.ts) because
 * jsdom will not execute ES modules. `npm run qa` does both.
 */
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import { localData, localPrefs, reply } from './fixtures.mjs'

const code = fs.readFileSync(new URL('./out/app.js', import.meta.url), 'utf8')

/** sel/text are checked in both modes, warm* only when the fixtures are on */
const CASES = [
  { path: '/', sel: '.site-head', warmSel: '.hero__title', warmText: 'Continue' },
  { path: '/movies', sel: '.browse-bar', warmSel: '.card' },
  { path: '/series', sel: '.genre-chips', warmSel: '.card' },
  { path: '/search?q=die', sel: '.search-hero', warmSel: '.card' },
  { path: '/movie/155', sel: '.site-foot', warmText: ['Netflix', 'Budget', 'Leonardo DiCaprio', 'More like', 'Resume'] },
  { path: '/movie/155/credits', sel: '.site-foot', warmText: ['Second Assistant Director', 'Grip'] },
  { path: '/tv/1399', sel: '.site-foot', warmText: ['Season 1', 'Bryan Cranston', 'Vince Gilligan'] },
  { path: '/tv/1399/credits', sel: '.site-foot', warmText: ['Director'] },
  { path: '/person/287', sel: '.site-foot', warmSel: '.credit-row', warmText: ['Fight Club', 'Crew · 3'] },
  { path: '/collections', sel: '.make-collection', warmSel: '.collection-card' },
  { path: '/collections/night', sel: '.site-foot', warmText: ['Inception', 'rainy night'] },
  { path: '/my', sel: '.stats-row', warmSel: '.mine-item' },
  { path: '/my?tab=continue', sel: '.stats-row', warmSel: '.wide-card', warmText: ['63', '55 min left'] },
  { path: '/my?tab=history', sel: '.stats-row', warmSel: '.wide-card' },
  // board mode keeps its note even when TMDB is down, so '.board-note' is the
  // invariant and the ranked grid is what the fixtures have to produce
  { path: '/movies?view=top10', sel: '.board-note', warmSel: '.top-board' },
  { path: '/movies?view=alltime', sel: '.board-note', warmSel: '.rank' },
  { path: '/series?provider=8&genre=18&sort=vote_average.desc', sel: '.filters-open, .browse-bar' },
  { path: '/search?q=brad&in=person', sel: '.search-hero', warmSel: '.person-card' },
  { path: '/my?tab=rated', sel: '.stats-row' },
  { path: '/settings', sel: '.source-cards', warmText: ['Default source'] },
  { path: '/sign-in', sel: '.auth-card' },
  { path: '/sign-up', sel: '.auth-card' },
  { path: '/watch/movie/155', sel: 'iframe[src*="vidstuck.cc/embed/movie/155"]', min: 120, warmText: ['Inception'] },
  { path: '/watch/tv/1399/2/4', sel: 'iframe[src*="vidstuck.cc/embed/tv/1399/2/4"]', min: 120, text: 'Next', warmText: ['Next'] },
  { path: '/definitely-not-here', sel: '.nf' },
]

const MODES = [
  { name: 'offline', seeded: false },
  { name: 'with data', seeded: true },
]

let bad = 0
for (const mode of MODES) {
  console.log(`\n— ${mode.name} —`)
  for (const { path, sel, text, warmSel, warmText, min = 300 } of CASES) {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost:5173' + path,
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    })
    const w = dom.window
    const noise = []

    w.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
    w.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    w.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    w.scrollTo = () => {}
    w.Element.prototype.scrollIntoView = () => {}
    w.HTMLMediaElement.prototype.play = () => Promise.resolve()
    w.HTMLMediaElement.prototype.pause = () => {}
    w.HTMLElement.prototype.requestFullscreen = () => Promise.resolve()
    w.console.error = (...a) => noise.push(String(a[0]).slice(0, 220))
    w.addEventListener('error', (e) => noise.push('window: ' + String(e.error?.message ?? e.message).slice(0, 220)))
    w.addEventListener('unhandledrejection', (e) => noise.push('reject: ' + String(e.reason?.message ?? e.reason).slice(0, 160)))

    if (mode.seeded) {
      w.localStorage.setItem('priva.local.v2', JSON.stringify(localData))
      w.localStorage.setItem('priva.prefs.v1', JSON.stringify(localPrefs))
      w.fetch = (input) => {
        const url = typeof input === 'string' ? input : input.url
        try {
          return Promise.resolve(new Response(JSON.stringify(reply(url)), { status: 200, headers: { 'content-type': 'application/json' } }))
        } catch (err) {
          return Promise.reject(err)
        }
      }
    } else {
      w.fetch = () => Promise.reject(new Error('qa: no network'))
    }

    let threw = null
    try {
      w.eval(code)
      await new Promise((r) => setTimeout(r, mode.seeded ? 700 : 350))
    } catch (err) {
      threw = err.message.split('\n')[0]
    }

    const root = w.document.getElementById('root')
    const body = root ? root.textContent.replace(/\s+/g, ' ').trim() : ''
    const want = (v) => (Array.isArray(v) ? v : v ? [v] : [])
    const missing = []
    if (threw) missing.push('threw: ' + threw)
    if (body.length < min) missing.push(`thin render (${body.length} chars)`)
    if (sel && !root?.querySelector(sel)) missing.push('no ' + sel)
    for (const t of want(text)) if (!body.includes(t)) missing.push(`no “${t}”`)
    if (mode.seeded) {
      if (warmSel && !root?.querySelector(warmSel)) missing.push('no ' + warmSel)
      for (const t of want(warmText)) if (!body.includes(t)) missing.push(`no “${t}”`)
    }

    const flags = noise.filter((n) => !/not wrapped in act|useLayoutEffect|ReactDOMServer|react\.dev\/errors/.test(n))
    if (missing.length) bad++
    const label = missing.length ? 'FAIL' : flags.length ? 'warn' : 'ok  '
    console.log(
      `${label} ${path.padEnd(28)} ${String(body.length).padStart(5)} chars${missing.length ? '  · ' + missing.join(', ') : ''}${!missing.length && flags.length ? '  · ' + flags.slice(0, 2).join(' || ') : ''}`,
    )
    w.close()
  }
}

console.log(bad ? `\n${bad} route run(s) need attention` : `\n${CASES.length} routes × ${MODES.length} modes mounted clean`)
process.exit(bad ? 1 : 0)
