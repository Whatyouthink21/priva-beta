/** A pretend TMDB, just complete enough to exercise the data paths.
 *
 *  The smoke test runs twice: once with the network dead (every page must
 *  degrade politely) and once against these fixtures with a signed-out user who
 *  already has a list, a half-watched film and a collection in localStorage.
 *  Shapes follow src/lib/types.ts, trimmed to the fields the UI reads.
 */

const poster = (n) => `/p${n}.jpg`

const title = (id, name, type, extra = {}) => ({
  id,
  title: type === 'movie' ? name : undefined,
  name: type === 'tv' ? name : undefined,
  original_title: type === 'movie' ? name : undefined,
  original_name: type === 'tv' ? name : undefined,
  media_type: type,
  poster_path: poster(id),
  backdrop_path: poster(id + 1),
  vote_average: 7.8,
  vote_count: 4200,
  release_date: type === 'movie' ? '2010-07-16' : undefined,
  first_air_date: type === 'tv' ? '2008-01-20' : undefined,
  original_language: 'en',
  adult: false,
  genre_ids: [28, 18],
  overview: 'A synopsis long enough that the clamp and the read-more button both have something to do.',
  ...extra,
})

const cast = (n, name, character, order) => ({ id: 900 + n, name, original_name: name, character, order, profile_path: poster(900 + n), known_for_department: 'Acting' })
const crew = (n, name, job, department) => ({ id: 800 + n, name, original_name: name, job, department, profile_path: poster(800 + n) })

const page = (results, total = 500) => ({ page: 1, results, total_pages: 25, total_results: total })

const videos = {
  results: [
    { id: 'v1', key: 'gHKzE1b0BN8', name: 'Official Trailer', site: 'YouTube', size: 1080, type: 'Trailer', official: true, published_at: '2010-06-01T00:00:00.000Z' },
    { id: 'v2', key: 'teaser1', name: 'Teaser', site: 'YouTube', size: 720, type: 'Teaser', official: true, published_at: '2010-01-01T00:00:00.000Z' },
  ],
}

const providers = {
  results: {
    US: {
      link: 'https://www.themoviedb.org/movie/155/watch',
      flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: poster(8), display_priority: 0 }],
      rent: [{ provider_id: 3, provider_name: 'Apple TV', logo_path: poster(3), display_priority: 1 }],
      buy: [{ provider_id: 2, provider_name: 'Amazon Store', logo_path: poster(2), display_priority: 2 }],
    },
    IN: {
      flatrate: [{ provider_id: 234, provider_name: 'JioCinema', logo_path: poster(234), display_priority: 0 }],
    },
  },
}

const movieDetail = {
  ...title(155, 'Inception', 'movie'),
  tagline: 'Your mind is the scene of the crime.',
  runtime: 148,
  status: 'Released',
  budget: 160000000,
  revenue: 839000000,
  imdb_id: 'tt1375666',
  homepage: 'https://inception.movie',
  genres: [
    { id: 28, name: 'Action' },
    { id: 18, name: 'Drama' },
    { id: 878, name: 'Science Fiction' },
  ],
  production_companies: [{ id: 923, name: 'Legendary Pictures', logo_path: null }],
  production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
  spoken_languages: [{ iso_639_1: 'en', name: 'English', english_name: 'English' }],
  credits: {
    cast: [
      cast(1, 'Leonardo DiCaprio', 'Cobb', 0),
      cast(2, 'Joseph Gordon-Levitt', 'Arthur', 1),
      cast(3, 'Elliot Page', 'Ariadne', 2),
      cast(4, 'Tom Hardy', 'Eames', 3),
      cast(5, 'Ken Watanabe', 'Saito', 4),
    ],
    crew: [
      crew(1, 'Christopher Nolan', 'Director', 'Directing'),
      crew(2, 'Emma Thomas', 'Producer', 'Production'),
      crew(3, 'Hoyt Yeatman', 'Director of Photography', 'Camera'),
      crew(4, 'Guy Hendrix Dyas', 'Production Design', 'Art'),
      crew(5, 'Lee Smith', 'Editor', 'Editing'),
      crew(6, 'Karen Manera', 'Second Assistant Director', 'Directing'),
      crew(7, 'Jefferson Sean Kirk', 'Set Driver', 'Camera'),
      crew(8, 'Uncredited Grip', 'Grip', 'Crew'),
    ],
  },
  videos,
  images: { backdrops: [{ file_path: poster(77), iso_639_1: 'en' }], posters: [{ file_path: poster(78), iso_639_1: 'en' }] },
  'watch/providers': providers,
  release_dates: {
    results: [
      {
        iso_3166_1: 'US',
        release_dates: [{ type: '3', certification: 'PG-13', release_date: '2010-07-16', note: '' }],
      },
    ],
  },
  keywords: { results: [{ id: 1, name: 'dream' }, { id: 2, name: 'heist' }] },
  alternative_titles: { results: [{ title: 'Origem', type: 'alternative', iso_3166_1: 'BR' }] },
  external_ids: { imdb_id: 'tt1375666', tvdb_id: null, wikidata_id: null },
  reviews: {
    results: [
      { id: 'r1', author: 'cinephile', author_details: { name: 'Cinephile' }, content: 'Still holds up on the fourth watch.', created_at: '2024-02-01T00:00:00.000Z', url: 'https://themoviedb.org/review/r1' },
    ],
  },
  similar: page([title(157372, 'Interstellar', 'movie'), title(134, 'The Prestige', 'movie')]),
  recommendations: page([title(27205, 'Dunkirk', 'movie'), title(140, 'Oppenheimer', 'movie')]),
}

const tvDetail = {
  ...title(1399, 'Breaking Bad', 'tv'),
  tagline: 'One minute, you run your life. The next, your life runs you.',
  episode_run_time: [47, 49],
  number_of_seasons: 5,
  number_of_episodes: 62,
  status: 'Ended',
  type: 'Scripted',
  homepage: null,
  in_production: false,
  languages: ['en'],
  origin_country: ['US'],
  networks: [{ id: 1107, name: 'AMC', logo_path: null }],
  created_by: [{ id: 666, name: 'Vince Gilligan', profile_path: poster(666) }],
  last_air_date: '2013-09-29',
  genres: [{ id: 18, name: 'Drama' }],
  credits: {
    cast: [cast(1, 'Bryan Cranston', 'Walter White', 0), cast(2, 'Aaron Paul', 'Jesse Pinkman', 1)],
    crew: [crew(1, 'Vince Gilligan', 'Creator', 'Writing'), crew(2, 'Michelle MacLaren', 'Director', 'Directing')],
  },
  videos,
  seasons: [
    { id: 3572, season_number: 1, name: 'Season 1', episode_count: 7, poster_path: poster(3572), air_date: '2008-01-20' },
    { id: 3573, season_number: 2, name: 'Season 2', episode_count: 13, poster_path: poster(3573), air_date: '2009-03-08' },
  ],
  content_ratings: { results: [{ iso_3166_1: 'US', rating: 'TV-MA' }] },
  'watch/providers': providers,
  keywords: { results: [{ id: 9, name: 'meth' }] },
  external_ids: { imdb_id: 'tt0903747', tvdb_id: '81189', wikidata_id: null },
  similar: page([title(1403, 'The Wire', 'tv')]),
  recommendations: page([title(66732, 'Better Call Saul', 'tv')]),
}

const season1 = {
  id: 3572,
  _id: '3572',
  name: 'Season 1',
  season_number: 1,
  poster_path: poster(3572),
  air_date: '2008-01-20',
  overview: 'Seven episodes.',
  episodes: [
    { id: 61984, air_date: '2008-01-20', episode_number: 1, name: 'Pilot', overview: 'A diagnosis changes everything.', production_code: '', runtime: 58, season_number: 1, still_path: poster(61984), vote_average: 8.1, vote_count: 400 },
    { id: 61985, air_date: '2008-01-27', episode_number: 2, name: "Cat's in the Bag...", overview: 'It goes badly.', production_code: '', runtime: 48, season_number: 1, still_path: null, vote_average: 8.0, vote_count: 300 },
  ],
}

const personDetail = {
  id: 287,
  name: 'Brad Pitt',
  also_known_as: ['William Bradley Pitt'],
  biography:
    'Born in Shawnee, Oklahoma, raised in Springfield, Missouri. Started with a chip shop promo, ended up producing the films he wanted to be offered.',
  birthday: '1963-12-18',
  deathday: null,
  place_of_birth: 'Shawnee, Oklahoma, USA',
  profile_path: poster(287),
  gender: 2,
  homepage: null,
  images: { profiles: [{ file_path: poster(288) }] },
  external_ids: { imdb_id: 'nm0000093', wikidata_id: 'Q35388', facebook_id: null },
  combined_credits: {
    cast: [
      { id: 155, media_type: 'movie', title: 'Inception', character: 'Cobb', poster_path: poster(155), release_date: '2010-07-16', credit_id: 'c1', order: 4 },
      { id: 1396, media_type: 'movie', title: 'Fight Club', character: 'Tyler Durden', poster_path: poster(1396), release_date: '1999-10-15', credit_id: 'c2', order: 2 },
      { id: 539, media_type: 'movie', title: 'Thelma & Louise', character: 'J.D.', poster_path: poster(539), release_date: '1991-05-24', credit_id: 'c3', order: 5 },
    ],
    crew: [
      { id: 155, media_type: 'movie', title: 'Inception', job: 'Executive Producer', department: 'Production', poster_path: poster(155), release_date: '2010-07-16', credit_id: 'k1' },
      { id: 200, media_type: 'movie', title: 'The Assumption', jobs: ['Producer', 'Executive Producer'], department: 'Production', poster_path: poster(200), release_date: '2025-09-12', credit_id: 'k2' },
      { id: 201, media_type: 'movie', title: 'Minor Credit', job: 'Thanks', department: 'Crew', poster_path: null, release_date: '2019-02-01', credit_id: 'k3' },
    ],
  },
}

const searchHits = page([
  title(155, 'Inception', 'movie'),
  { ...title(1399, 'Breaking Bad', 'tv'), media_type: 'tv' },
  { id: 287, name: 'Brad Pitt', media_type: 'person', profile_path: poster(287), poster_path: null, backdrop_path: null, known_for_department: 'Acting', known_for: [], adult: false },
])

/* ------------------------------ the router ------------------------------ */

export function reply(url) {
  const path = new URL(url).pathname.replace(/^\/3/, '')

  if (/^\/trending\//.test(path)) return page([title(155, 'Inception', 'movie'), title(1399, 'Breaking Bad', 'tv'), title(27205, 'Dunkirk', 'movie')])
  if (/^\/movie\/155$/.test(path)) return movieDetail
  if (/^\/tv\/1399$/.test(path)) return tvDetail
  if (/^\/tv\/1399\/season\/\d+$/.test(path)) return season1
  if (/^\/person\/287$/.test(path)) return personDetail
  if (/^\/(movie|tv)\/\d+\/videos$/.test(path)) return { id: 155, results: videos.results }
  if (/^\/(movie|tv)\/\d+\/credits$/.test(path)) return { cast: movieDetail.credits.cast, crew: movieDetail.credits.crew, page: 1, total_pages: 1 }
  if (/^\/(movie|tv)\/\d+\/(similar|recommendations)$/.test(path)) return page([title(157372, 'Interstellar', 'movie')])
  if (/^\/discover\//.test(path)) return page([title(155, 'Inception', 'movie'), title(1399, 'Breaking Bad', 'tv'), title(27205, 'Dunkirk', 'movie')])
  if (/^\/search\/multi$/.test(path)) return searchHits
  if (/^\/search\/person$/.test(path)) return page([{ id: 287, name: 'Brad Pitt', profile_path: poster(287), media_type: 'person', known_for: [], adult: false }])
  if (/^\/search\//.test(path)) return page([title(155, 'Inception', 'movie'), title(27205, 'Dunkirk', 'movie')])
  if (/^\/(movie|tv)\/\d+\/(external_ids|watch\/providers|release_dates|images|keywords|reviews|alternative_titles|content_ratings)$/.test(path)) return { results: [] }
  if (/^\/(movie|tv)\/(now_playing|upcoming|popular|top_rated)$/.test(path) || /^\/tv\/on_the_air$/.test(path)) {
    return page([title(155, 'Inception', 'movie'), title(1399, 'Breaking Bad', 'tv'), title(27205, 'Dunkirk', 'movie'), title(140, 'Oppenheimer', 'movie')])
  }
  return page([])
}

/** A returning visitor: a list, a half-watched film, a rated show, a collection. */
export const localData = {
  myList: [155],
  myListMeta: {
    'movie:155': { id: 155, type: 'movie', title: 'Inception', poster: poster(155), backdrop: poster(156), year: 2010, rating: 8.4 },
  },
  progress: {
    'movie:155': {
      id: 155,
      type: 'movie',
      title: 'Inception',
      poster: poster(155),
      backdrop: poster(156),
      progress: 63,
      timestamp: 5601,
      duration: 8880,
      source: 'vidstuck',
      updatedAt: Date.now() - 3600_000,
    },
    'tv:1399:1:2': {
      id: 1399,
      type: 'tv',
      title: 'Breaking Bad',
      poster: poster(1399),
      backdrop: poster(1400),
      progress: 24,
      timestamp: 700,
      duration: 2900,
      season: 1,
      episode: 2,
      episodeName: "Cat's in the Bag...",
      source: 'tgvid',
      updatedAt: Date.now() - 7200_000,
    },
  },
  collections: [
    {
      id: 'night',
      name: 'Things to watch on a rainy night',
      description: 'Long ones. No subtitles if I can help it.',
      accent: 'FF4F18',
      items: [
        { id: 155, type: 'movie', title: 'Inception', poster: poster(155), backdrop: null, year: 2010, rating: 8.4 },
        { id: 1399, type: 'tv', title: 'Breaking Bad', poster: poster(1399), backdrop: null, year: 2008, rating: 8.9 },
      ],
      createdAt: Date.now() - 86400_000,
      updatedAt: Date.now() - 3600_000,
    },
  ],
  rated: { 'movie:155': { type: 'movie', score: 9, at: Date.now() - 86400_000 } },
  recentSearches: ['die hard', 'nolan', 'breaking bad'],
}

export const localPrefs = { defaultSource: 'vidstuck', accent: 'FF4F18', region: 'US', theme: 'night' }
