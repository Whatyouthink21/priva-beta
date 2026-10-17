/* Shared shapes. Anything ending in "Meta" is a small slice of a TMDB record
 * that we persist alongside user data, so My Priva / collections / continue
 * watching render without another API round trip. */

export type MediaType = 'movie' | 'tv'

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbPoster {
  overview?: string
  title?: string
  name?: string
  id: number
  /** search/multi also hands back 'person' */
  media_type?: MediaType | 'person'
  poster_path: string | null
  backdrop_path: string | null
  vote_average?: number
  vote_count?: number
  release_date?: string
  first_air_date?: string
  original_language?: string
  adult?: boolean
  genre_ids?: number[]
  origin_country?: string[]
  character?: string
  job?: string
  department?: string
  profile_path?: string | null
  still_path?: string | null
}

export interface TmdbVideo {
  id: string
  key: string
  name: string
  site: string
  size: number
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes' | string
  official: boolean
  published_at: string
}

export interface TmdbImages {
  backdrops?: { file_path: string; iso_639_1: string | null }[]
  posters?: { file_path: string; iso_639_1: string | null }[]
  profiles?: { file_path: string }[]
}

export interface CastMember {
  id: number
  name: string
  original_name: string
  character: string
  credit_id?: string
  order: number
  profile_path: string | null
  known_for_department?: string
}

export interface CrewMember {
  id: number
  name: string
  original_name: string
  job: string
  department: string
  credit_id?: string
  profile_path: string | null
  character?: string
}

export interface ReleaseDateEntry {
  type: string
  note?: string
  certification: string
  release_date: string
}

export interface MovieDetail extends TmdbPoster {
  title: string
  original_title: string
  overview: string
  tagline: string | null
  runtime: number | null
  status: string
  budget: number
  revenue: number
  imdb_id: string | null
  homepage: string | null
  genres: TmdbGenre[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  production_countries: { iso_3166_1: string; name: string }[]
  spoken_languages: { iso_639_1: string; name: string; english_name?: string }[]
  credits?: { cast: CastMember[]; crew: CrewMember[] }
  videos?: { results: TmdbVideo[] }
  images?: TmdbImages
  release_dates?: { results: { iso_3166_1: string; release_dates: ReleaseDateEntry[] }[] }
  keywords?: { results: { id: number; name: string }[] }
  external_ids?: { imdb_id: string | null; tvdb_id: string | null; wikidata_id: string | null }
  alternative_titles?: { results: { title: string; type: string; iso_3166_1: string }[] }
  reviews?: { results: { id: string; author: string; author_details?: { name?: string }; content: string; created_at: string; url?: string }[] }
  recommendations?: ResultsPage
  similar?: ResultsPage
  'watch/providers'?: ProvidersPayload
}

export interface TvEpisode {
  air_date: string
  episode_number: number
  id: number
  name: string
  overview: string
  production_code?: string
  runtime: number | null
  season_number: number
  still_path: string | null
  vote_average: number
  vote_count: number
  crew?: CrewMember[]
  guest_stars?: CastMember[]
}

export interface TvSeason {
  air_date: string
  episode_count: number
  id: number
  name: string
  overview: string
  poster_path: string | null
  season_number: number
  episodes?: TvEpisode[]
}

export interface TvDetail extends TmdbPoster {
  name: string
  original_name: string
  overview: string
  tagline: string | null
  status: string
  type: 'Scripted' | 'Reality' | 'Documentary' | string
  number_of_seasons: number
  keywords?: { results: { id: number; name: string }[] }
  number_of_episodes: number
  episode_run_time: number[]
  first_air_date: string
  last_air_date: string
  in_production: boolean
  imdb_id: string | null
  homepage: string | null
  genres: TmdbGenre[]
  created_by: { id: number; name: string; credit_id: string; job: string }[]
  networks: { id: number; name: string; logo_path: string | null }[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  origin_country: string[]
  languages: string[]
  seasons: TvSeason[]
  credits?: { cast: CastMember[]; crew: CrewMember[] }
  aggregate_credits?: { cast: CastMember[]; crew: CrewMember[] }
  videos?: { results: TmdbVideo[] }
  images?: TmdbImages
  external_ids?: { imdb_id: string | null; tvdb_id: string | null }
  recommendations?: ResultsPage
  similar?: ResultsPage
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] }
  'watch/providers'?: ProvidersPayload
}

export interface PersonDetail {
  id: number
  name: string
  also_known_as?: string[]
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  gender: number
  homepage: string | null
  imdb_id?: string | null
  known_for_department?: string
  popularity?: number
  combined_credits?: PersonCredits
  movie_credits?: PersonCredits
  tv_credits?: PersonCredits
  images?: { profiles: { file_path: string }[] }
  external_ids?: { imdb_id?: string | null; wikidata_id?: string | null; facebook_id?: string | null }
}

export interface PersonCredits {
  cast: PersonCredit[]
  crew: PersonCredit[]
}

export interface PersonCredit {
  id: number
  credit_id: string
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  character?: string
  role?: string
  jobs?: string[]
  department?: string
  poster_path: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  vote_count?: number
  media_type: MediaType
  episode_count?: number
  order?: number
  genre_ids?: number[]
}

export interface ProviderCell {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority?: number
}

/** One country's rights situation, as TMDB returns it. */
export interface ProvidersByCountry {
  flatrate?: ProviderCell[]
  rent?: ProviderCell[]
  buy?: ProviderCell[]
  ads?: ProviderCell[]
}

export interface ProvidersPayload {
  link?: string
  /** keyed by ISO 3166-1 alpha-2 code — TMDB hands back every country it has data for */
  results: Record<string, ProvidersByCountry | undefined>
}

export interface ResultsPage {
  page: number
  results: TmdbPoster[]
  total_pages: number
  total_results: number
}

/* ---- Priva's own records ---- */

export interface TitleMeta {
  id: number
  type: MediaType
  title: string
  poster: string | null
  backdrop: string | null
  year: number | null
  rating: number | null
  tmdb_rating?: number | null
  imdb_id?: string | null
}

export interface WatchProgress {
  id: number
  type: MediaType
  title: string
  poster: string | null
  backdrop: string | null
  /** 0..100, as reported by the player */
  progress: number
  /** seconds in */
  timestamp: number
  /** seconds total */
  duration: number
  season?: number
  episode?: number
  episodeName?: string
  source: PlayerSource
  updatedAt: number
}

export type PlayerSource = 'vidstuck' | 'tgvid'

export interface Collection {
  id: string
  name: string
  description: string
  accent: string
  items: TitleMeta[]
  createdAt: number
  updatedAt: number
}

export interface PrivaPrefs {
  /** which embed powers the watch page */
  defaultSource: PlayerSource
  /** ISO alpha-2, used for watch providers + release dates */
  region: string
  /** player accent colour, hex without the # */
  accent: string
  /** loading-screen text for players that support branding */
  branding: string
  /** preferred Vidstuck server name, e.g. "valstrax". Blank = let it choose. */
  server: string
  /** preferred subtitle/audio language passed to the players */
  subtitle: string
  tgvidLang: string
  autoPlayNext: boolean
  resumePlayback: boolean
  heroTrailers: 'always' | 'wifi' | 'off'
  theme: 'night' | 'paper'
  posterSize: 'compact' | 'regular' | 'large'
  reduceMotion: boolean
  debugLog: boolean
}

export interface PrivaSettings {
  prefs: PrivaPrefs
  myList: number[]
  myListMeta: Record<string, TitleMeta>
  progress: Record<string, WatchProgress>
  collections: Collection[]
  rated: Record<string, { type: MediaType; score: number; at: number }>
  recentSearches: string[]
}
