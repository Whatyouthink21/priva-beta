import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
  type User,
} from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'

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

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
export let firebaseBroken = false

/** true when every piece of the config actually made it into .env */
export const firebaseConfigured = Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.length > 4)

function boot() {
  if (app) return
  if (!firebaseConfigured) {
    firebaseBroken = true
    return
  }
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    // Offline cache first: Priva is usable on a train, and a reload while
    // signed out must not blank out My List.
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    } catch {
      db = getFirestore(app)
    }
    void setPersistence(auth, browserLocalPersistence).catch(() => undefined)
  } catch (err) {
    firebaseBroken = true
    console.warn('[priva] Firebase failed to start — running local-only.', err)
  }
}

export function getFirebaseAuth(): Auth | null {
  boot()
  return auth
}

export function getDb(): Firestore | null {
  boot()
  return db
}

export function isSignedIn(user: User | null): boolean {
  return !!user && !user.isAnonymous
}

/** Only loaded when the browser supports it, and never during SSR/tests. */
export async function startAnalytics(): Promise<void> {
  if (firebaseBroken || typeof window === 'undefined') return
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (!(await isSupported())) return
    boot()
    if (app) getAnalytics(app)
  } catch {
    /* measurement id blocked or offline — nobody should notice */
  }
}
