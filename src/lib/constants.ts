import type { MediaType, PlayerSource, PrivaPrefs } from './types'

export const APP_NAME = 'Priva'
export const APP_TAGLINE = 'Free, Forever.'
export const APP_VERSION = '0.9.0'

export const TMDB_BASE = 'https://api.themoviedb.org/3'
export const IMG_BASE = 'https://image.tmdb.org/t/p'
/** TMDB moved provider/ company logos to this host */
export const MEDIA_BASE = 'https://media.themoviedb.org/t/p'

export const NAV: { to: string; label: string; short: string; match: string[] }[] = [
  { to: '/', label: 'Home', short: 'Home', match: ['/'] },
  { to: '/movies', label: 'Movies', short: 'Movies', match: ['/movies', '/movie/'] },
  { to: '/series', label: 'Series', short: 'Series', match: ['/series', '/tv/'] },
  { to: '/collections', label: 'Collections', short: 'Lists', match: ['/collections'] },
  { to: '/my', label: 'My Priva', short: 'My Priva', match: ['/my'] },
]

export const GENRES: Record<MediaType, { id: number; name: string }[]> = {
  movie: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 10762, name: 'Kids' },
    { id: 9648, name: 'Mystery' },
    { id: 10763, name: 'News' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10767, name: 'Talk' },
    { id: 10768, name: 'War & Politics' },
    { id: 37, name: 'Western' },
  ],
}

export const genreName = (type: MediaType, id: number): string =>
  GENRES[type].find((g) => g.id === id)?.name ?? ''

export interface ProviderDef {
  id: number
  name: string
  short: string
}

/** Curated subset of TMDB's watch-provider ids — the ones people actually
 *  filter by. Everything else still shows up inside a title's own
 *  "Official streaming" block, which comes straight from TMDB. */
export const PROVIDERS: ProviderDef[] = [
  { id: 8, name: 'Netflix', short: 'Netflix' },
  { id: 119, name: 'Prime Video', short: 'Prime' },
  { id: 337, name: 'Disney+', short: 'Disney+' },
  { id: 1899, name: 'Max', short: 'Max' },
  { id: 15, name: 'Hulu', short: 'Hulu' },
  { id: 350, name: 'Apple TV+', short: 'Apple TV+' },
  { id: 531, name: 'Paramount+', short: 'Paramount+' },
  { id: 386, name: 'Peacock', short: 'Peacock' },
  { id: 234, name: 'Disney+ Hotstar', short: 'Hotstar' },
  { id: 235, name: 'ZEE5', short: 'ZEE5' },
  { id: 237, name: 'Sony LIV', short: 'LIV' },
  { id: 283, name: 'Crunchyroll', short: 'Crunchy' },
  { id: 330, name: 'MUBI', short: 'MUBI' },
  { id: 421, name: 'AMC+', short: 'AMC+' },
]

export interface SourceDef {
  id: PlayerSource
  name: string
  blurb: string
  quality: string
  subs: string
}

export const SOURCES: SourceDef[] = [
  {
    id: 'vidstuck',
    name: 'Server 1',
    blurb: 'The primary stream, with a wide server pool and in-player episode controls.',
    quality: 'up to 4K',
    subs: 'multiple subtitle languages',
  },
  {
    id: 'tgvid',
    name: 'Server 2',
    blurb: 'An alternate stream with intro skipping and per-episode resume.',
    quality: '1080p',
    subs: 'subtitles included with the stream',
  },
]

export const DOWNLOAD_SOURCES = [
  {
    id: 'vidsrc' as const,
    name: 'vidSRC Download',
    host: 'dl.vidsrc.party',
    blurb: 'Every quality the source has, MP4 or MKV, subs built in or as SRT.',
  },
  {
    id: 'vidvault' as const,
    name: 'VidVault',
    host: 'vidvault.to',
    blurb: 'Pre-converted 360p–1080p files. Usually the quicker of the two.',
  },
]

export const REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'IN', name: 'India' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'SG', name: 'Singapore' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'VN', name: 'Viet Nam' },
]

export const COUNTRY_NAME: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  ES: 'Spain',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  RU: 'Russia',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  NL: 'Netherlands',
  BE: 'Belgium',
  IE: 'Ireland',
  NZ: 'New Zealand',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  ES2: 'Spain',
  ZA: 'South Africa',
  TR: 'Türkiye',
  IL: 'Israel',
  PL: 'Poland',
  CZ: 'Czechia',
  AT: 'Austria',
  CH: 'Switzerland',
  LU: 'Luxembourg',
  PT: 'Portugal',
  FI: 'Finland',
  IS: 'Iceland',
  HU: 'Hungary',
  RO: 'Romania',
  GR: 'Greece',
  UA: 'Ukraine',
  NG: 'Nigeria',
  KE: 'Kenya',
  EG: 'Egypt',
  PH: 'Philippines',
  ID: 'Indonesia',
  TH: 'Thailand',
  MY: 'Malaysia',
  SG: 'Singapore',
  VN: 'Viet Nam',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  LB: 'Lebanon',
  MA: 'Morocco',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  VE: 'Venezuela',
  DK2: 'Denmark',
  SU: 'Soviet Union',
  YU: 'Yugoslavia',
  XX: 'Unknown',
}

export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ar', name: 'Arabic' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
]

export const DEFAULT_PREFS: PrivaPrefs = {
  defaultSource: 'vidstuck',
  region: 'US',
  accent: 'FF4F18',
  branding: 'priva',
  server: '',
  subtitle: 'english',
  tgvidLang: 'eng',
  autoPlayNext: true,
  resumePlayback: true,
  heroTrailers: 'wifi',
  theme: 'night',
  posterSize: 'regular',
  reduceMotion: false,
  debugLog: false,
}

/** Departments in the order a human would read a credit list. */
export const DEPARTMENT_ORDER = [
  'Directing',
  'Writing',
  'Production',
  'Camera',
  'Editing',
  'Art',
  'Costume & Make-Up',
  'Sound',
  'Visual Effects',
  'Crew',
  'Lighting',
  'Costume',
  'Make-Up',
  'Health & Make-Up',
  'Special Effects',
  'Visual Effects',
  'Marketing',
  'Legal',
  'Additional Crew',
]

export const COLLECTION_ACCENTS = [
  '#FF4F18',
  '#F0B840',
  '#43D69A',
  '#4EA8FF',
  '#B98CFF',
  '#FF5A76',
  '#9BD1C8',
  '#E8E4DA',
]

export const LS = {
  prefs: 'priva.prefs.v1',
  local: 'priva.local.v2',
  key: 'priva.tmdb.key.v1',
  device: 'priva.device.v1',
  dismissed: 'priva.dismissed.v1',
} as const
