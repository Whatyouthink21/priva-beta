/** Which keys the app was built with. A value pasted on the Settings page
 *  (localStorage) wins, so the site is usable without rebuilding. */

const LS_KEY = 'priva.tmdb.key.v1'

export function tmdbCredential(): { mode: 'v3' | 'v4'; value: string } | null {
  const local = readLocal(LS_KEY)
  const v4 = local || import.meta.env.VITE_TMDB_TOKEN?.trim()
  if (v4 && v4.length > 40) return { mode: 'v4', value: v4 }
  const v3 = import.meta.env.VITE_TMDB_API_KEY?.trim()
  if (v3) return { mode: 'v3', value: v3 }
  if (local) return { mode: 'v3', value: local }
  return null
}

export function hasTmdbKey(): boolean {
  return tmdbCredential() !== null
}

function readLocal(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
