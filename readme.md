# priva

A movie and TV site I built for myself and kept because it is nicer than the
ones that are actually popular. Metadata comes from TMDB, playback comes from
two free embed hosts, your list lives in Firebase (or only on your phone, if
you never sign in). No ads, no tracking scripts, no account wall, no
recommendation algorithm pretending to know you.

It is a static Vite + React + TypeScript bundle. There is no server of mine
anywhere in the loop: your browser talks to TMDB, to the embed hosts and to
Firebase directly. That is the whole architecture, and it is why the site is
cheap to run.

```
npm install
cp .env.example .env    # paste a TMDB v3 key
npm run dev             # http://localhost:5173
npm run build           # dist/ — host it anywhere static
```

## What is in it

- **Home** — a hero that rotates through five trending titles with the trailer
  actually playing behind it (muted, autoplaying, and skipped entirely on
  metered or slow connections), Continue Watching, Because You Watched, rails
  per genre, and a Top 5 board for tonight.
- **Movies / Series** — the same browse engine twice: provider filter (Netflix,
  Prime, JioCinema, MUBI…), genre chips, year/decade, language, minimum votes,
  sort, plus two boards: *Top 10 today* and *Top 10 all time* by region. Every
  filter lives in the URL, so a filtered page is shareable and the back button
  behaves.
- **Title pages** — trailer hero, facts (budget, revenue, runtime, country,
  languages, status, certification), IMDb row, cast, the *whole* crew grouped
  by department including the grip and costume people nobody lists, More Like
  This, Because You Watched, official providers per country with a region
  switcher, seasons/episodes for TV, reviews where TMDB has them, and download
  options for both hosts.
- **Person pages** (`/person/287`) — bio, known-for, every filmography credit
  with the character or job, filter-as-you-type, IMDb and TMDB links.
- **Collections** — make your own shelves, name them, pick an accent, add
  titles from search, reorder, remove. These are yours, they are not shared.
- **My Priva** — My List, Continue Watching, your ratings, recently watched
  history, and five numbers about your habits.
- **Search** (`/search`) — one page, four scopes (Everything / Movies / Series /
  People), debounced, writes to the URL, remembers the last eight queries.
- **Watch** (`/watch/movie/155`) — the player, fullscreen, a progress bar fed by
  `postMessage`, resume, next-episode, source switch, download modal. No header
  or tab bar: it takes the whole screen.
- **Sign in / Sign up** (`/sign-in`, `/sign-up`) — split page: the argument for
  an account on the left, the form on the right.
- **Settings** — default source, embed server, branding, subtitle language,
  resume, autoplay, hero-trailer policy, region, accent, theme, poster density,
  cache size, export, and a "wipe everything" drawer.

Keyboard: `/` focuses search, `g h/m/t/l` jump to Home/Movies/Series/My,
`b` for Collections, `?` for the full list. On a phone there is a tab bar with
safe-area padding, 44px targets and no hover-only affordances.

## The players

`src/lib/players.ts` builds the embed URLs; `src/lib/constants.ts` describes
the sources for the UI. Two are wired:

| id | host | what it is |
|----|------|------------|
| `vidstuck` | `vidstuck.cc` | default. `color`, `branding`, `subtitle`, `server`, `progress`, `nextEpisode`, `episodeSelector`, `autoplayNextEpisode`, `overlay`. Reports progress as `postMessage` **strings**. |
| `tgvid` | `tgvid.lovable.app` | `color`, `back`, `lang`, `server`, `loading`, `t`, `episodeSelector`. Speaks `TGFLIX_EVENT` / `TGFLIX_CMD` objects. |

The two message shapes are different, so `/watch` listens once and normalises
both into `{ pct, time, dur }` before anything is saved. Resume works on both.

Downloads come from `dl.vidsrc.party` and `vidvault.to`. The first one has a
JSON endpoint, which `src/components/Downloads.tsx` tries first and falls back
to a plain link when CORS says no (it usually does — that is a link, not a bug).

Everything about both players is *their* service: availability, quality and
legality are theirs, not something Priva can promise you.

## Firebase

`priva-movies` is the project baked into `src/lib/firebase.ts`. Public client
keys; the rules below are what actually gate writes.

```
users/{uid}                          profile: displayName, email, photoURL, lastSeenAt
users/{uid}/data/prefs               the PrivaPrefs object
users/{uid}/data/mylist              { ids: number[], meta: {…} }
users/{uid}/data/progress            { items: { "movie:155": {…} } }   capped at 80 rows
users/{uid}/data/collections         { items: Collection[] }
users/{uid}/data/rated               { items: { "tv:1399": { score, at } } }
users/{uid}/data/searches           { items: string[] }
users/{uid}/devices/{deviceId}       name, seenAt
```

Rules to paste in Firestore → Roles / Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function mine() { return request.auth != null && request.auth.uid == request.resource.id.split('/')[2] }
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['displayName','email','photoURL','bio','lastSeenAt']);
      allow delete: if false;
      match /data/{bucket} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /devices/{device} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

Notes on how it is used, because they shaped the code:

- **localStorage is the source of truth for rendering.** Every mutation writes
  locally and is mirrored to Firestore behind a 900 ms debounce, so the UI
  never waits on a network round trip and the site is identical signed out.
- Firestore's offline cache is on (`persistentLocalCache`), so a signed-in
  visitor on a train still sees their list.
- The SDK is **not** in the initial bundle: `src/lib/firebase.ts` is a ~1 kB
  facade that dynamic-imports `src/lib/sdk.ts` after first paint. Keep every
  `firebase/*` import inside `sdk.ts` or that split is undone and the first
  paint gets ~200 kB heavier.
- Reading the account merges by timestamp instead of overwriting, so two
  devices signed into one account converge rather than clobber.
- Delete = `users/{uid}` and everything under it. The Settings drawer does it.

## Why it is fast

Nothing here is exotic; it is mostly refusing to do stupid things:

- one chunk per route, prefetched on link hover (`src/routes.ts` +
  `SmartLink`), so the pages you might visit next are already warm;
- TMDB responses cached in `sessionStorage` with a TTL (`src/lib/cache.ts`) and
  in-flight identical requests deduped, so back-and-forth navigation is free;
- `w342`/`w780` images instead of originals, `loading="lazy"`, `decoding="async"`,
  `aspect-ratio` on every media box so nothing shifts while you scroll;
- trailers gated on `effectiveType`/`saveData` and on the page being visible;
- no component library, no icon package, no animation library: `icons.tsx` is a
  ~45-line factory over inline SVG paths and the CSS is five hand-written files
  (~14 kB gzipped). Tailwind is only there for utilities.
- `tsc -b` in the build script, `oxlint` for the react-hooks rules.

Measured on a Moto G-class phone over 4G the first contentful paint lands under
about a second, which is the number I actually care about.

## Repo layout

```
src/
  lib/          tmdb.ts (all metadata), players.ts, store.ts (state+sync),
                firestore.ts → sdk.ts, derive.ts, cache.ts, constants.ts, utils.ts
  hooks/        useStore, useAsync/usePaged, useMedia
  contexts/     AuthProvider, ToastProvider, PickerProvider ("add to collection")
  components/   cards, rails, hero, browse shell, detail parts, downloads, providers
  pages/        one per route
  *.css         theme tokens, base, layout, ui, extra (all @layer'd)
```

Data flow, when it matters: `pages → hooks → store (localStorage) → firestore →
firebase (lazy) → cloud`.

## Known rough edges

- IMDb rating *numbers* need an OMDb key (`VITE_OMDB_KEY`); without one you get
  the TMDB score and a link to IMDb. I left the key out on purpose.
- The embed hosts occasionally go down or start blocking referrers. `/watch`
  says so instead of showing a black rectangle forever, and there is a
  "open the source directly" button for the stubborn days.
- Collections sync as whole documents; two people editing one collection from two
  devices at the same second will lose one edit. It is single-user software.
- Subtitle quality is whatever the source ships.

## License

Do what you like with the code. The TMDB credit is mandatory:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

Poster and backdrop artwork belongs to the studios. The players and download
hosts belong to whoever runs them; remove those two files
(`src/lib/players.ts`, `DOWNLOAD_SOURCES` in `src/lib/constants.ts`) if you want
a metadata-only build.
