/* ------------------------------------------------------------------ *
 * Firebase, kept off the critical path.
 *
 * The SDK is the single heaviest thing this site ships (~200 kB after
 * gzip) and only three things need it: signing in, pushing your list to
 * the cloud and pulling it back. A first visit does none of those, so the
 * real SDK lives in ./firebaseImpl.ts and is fetched as its own chunk the
 * first time something asks for it — usually right after first paint.
 *
 * Nothing else in the app may import 'firebase/*' directly, or the split
 * is undone. Type-only imports are fine (they vanish at build time).
 * ------------------------------------------------------------------ */

/** Straight from the Firebase console for the `priva-movies` project. These
 *  are public client keys — the security rules in Firestore are what actually
 *  gate writes (see README). */
export const firebaseConfig = {
  apiKey: 'AIzaSyDg0D51XL2kYvVQCyVJu_zTlZyYHjs6EgA',
  authDomain: 'priva-movies.firebaseapp.com',
  projectId: 'priva-movies',
  storageBucket: 'priva-movies.firebasestorage.app',
  messagingSenderId: '771882692538',
  appId: '1:771882692538:web:ddb8f87ab08fd44e8bb783',
  measurementId: 'G-0T1DQQH4L1',
}

/** true when every piece of the config actually made it in */
export const firebaseConfigured = Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.length > 4)

/** Set when the chunk could not be fetched or the SDK refused to start. The
 *  UI reads it to explain why the sync dot is grey. */
let broken = false
export function isFirebaseBroken(): boolean {
  return broken
}
/** Called from the impl chunk when the SDK refuses to start. */
export function firebaseBrokenReason(err: unknown): void {
  broken = true
  console.warn('[priva] Firebase failed to start — running local-only.', err)
}

export type FirebaseImpl = typeof import('./sdk')

let pending: Promise<FirebaseImpl | null> | null = null

/** Load (once) the module that holds the SDK. Resolves to null when Firebase
 *  is not configured or the network refused the chunk — callers must treat
 *  that as "local only", not as an error. */
export function firebaseImpl(): Promise<FirebaseImpl | null> {
  if (!pending) {
    pending = import('./sdk').catch((err: unknown) => {
      broken = true
      console.warn('[priva] the Firebase chunk did not load — staying local-only.', err)
      return null
    })
  }
  return pending
}

/** Kick the SDK off without blocking anything: called once the app has
 *  painted, so a returning signed-in visitor is synced before they even open
 *  My Priva while a first-time visitor never waits for the download. */
export function warmFirebase(): void {
  if (!firebaseConfigured || typeof window === 'undefined') return
  void firebaseImpl().then((impl) => {
    if (impl) void impl.startAnalytics()
  })
}

