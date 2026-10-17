/* ------------------------------------------------------------------ *
 * Every line of this app that touches the Firebase SDK lives here, and
 * nothing imports this file statically — lib/firebase.ts pulls it in as a
 * lazy chunk. Keeping it that way is what lets a first-time visitor skip
 * ~200 kB of gzipped JavaScript they do not need yet.
 * ------------------------------------------------------------------ */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import { firebaseBrokenReason, firebaseConfig } from './firebase'
import type { Bucket, CloudData } from './firestore'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let started = false

function boot(): void {
  if (started) return
  started = true
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
    app = null
    auth = null
    db = null
    firebaseBrokenReason(err)
  }
}

export function getDb(): Firestore | null {
  boot()
  return db
}

/* ------------------------------- auth -------------------------------- */

function withAuth<T>(run: (auth: Auth) => Promise<T>): Promise<T> {
  boot()
  if (!auth) return Promise.reject(new Error('offline'))
  const a = auth
  return run(a)
}

export const actions = {
  signIn: (email: string, password: string) => withAuth((a) => signInWithEmailAndPassword(a, email, password)),
  signUp: (email: string, password: string) => withAuth((a) => createUserWithEmailAndPassword(a, email, password)),
  google: () =>
    withAuth(async (a) => {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      return signInWithPopup(a, provider)
    }),
  signOut: () => withAuth((a) => signOut(a)),
  reset: (email: string) => withAuth((a) => sendPasswordResetEmail(a, email)),
  rename: (name: string) => withAuth((a) => (a.currentUser ? updateProfile(a.currentUser, { displayName: name }) : Promise.resolve())),
  remove: () => withAuth((a) => (a.currentUser ? deleteUser(a.currentUser) : Promise.resolve())),
  currentUser: (): User | null => (boot(), auth?.currentUser ?? null),
}

export type AuthUser = User

/** Auth state, plus a callback for "there is nothing to restore" so the UI
 *  can stop showing a spinner instead of waiting forever. */
export function watchAuth(onUser: (user: User | null) => void, onSettled: () => void): () => void {
  boot()
  if (!auth) {
    onSettled()
    return () => undefined
  }
  const a = auth
  return onAuthStateChanged(
    a,
    (user) => {
      onUser(user)
      onSettled()
    },
    () => onSettled(),
  )
}

export async function startAnalytics(): Promise<void> {
  if (typeof window === 'undefined') return
  boot()
  if (!app) return
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (!(await isSupported())) return
    getAnalytics(app)
  } catch {
    /* measurement id blocked or offline — nobody should notice */
  }
}

/* ----------------------------- Firestore ------------------------------ *
 * One document per "bucket" under the user, so a single toggle writes a few
 * hundred bytes instead of the whole account:
 *
 *   users/{uid}/data/prefs | mylist | progress | collections | rated | searches
 *   users/{uid}/devices/{deviceId}
 * --------------------------------------------------------------------- */

export async function readCloud(uid: string): Promise<CloudData & { found: boolean }> {
  const d = getDb()
  if (!d) return { found: false }
  try {
    const snap = await getDocs(collection(d, 'users', uid, 'data'))
    const out: CloudData & { found: boolean } = { found: snap.size > 0 }
    for (const docSnap of snap.docs) {
      ;(out as unknown as Record<string, unknown>)[docSnap.id] = docSnap.data()
    }
    return out
  } catch (err) {
    console.warn('[priva] could not read from Firestore', err)
    return { found: false }
  }
}

export async function writeBucket(uid: string, bucket: Bucket, payload: unknown): Promise<boolean> {
  const d = getDb()
  if (!d) return false
  try {
    await setDoc(doc(d, 'users', uid, 'data', bucket), { ...(payload as object), updatedAt: Date.now() })
    return true
  } catch (err) {
    console.warn('[priva] cloud write failed (offline?)', err)
    return false
  }
}

export async function patchPrefs(uid: string, value: Record<string, unknown>): Promise<boolean> {
  const d = getDb()
  if (!d) return false
  try {
    await setDoc(doc(d, 'users', uid, 'data', 'prefs'), { value, updatedAt: Date.now() }, { merge: true })
    return true
  } catch (err) {
    console.warn('[priva] prefs write failed', err)
    return false
  }
}

export async function writeProfile(
  uid: string,
  profile: { displayName?: string | null; email?: string | null; photoURL?: string | null; bio?: string },
): Promise<void> {
  const d = getDb()
  if (!d) return
  try {
    await setDoc(doc(d, 'users', uid), { ...profile, lastSeenAt: serverTimestamp() }, { merge: true })
  } catch (err) {
    console.warn('[priva] profile write failed', err)
  }
}

export async function touchDevice(uid: string, deviceId: string, label?: string): Promise<void> {
  const d = getDb()
  if (!d) return
  try {
    await setDoc(
      doc(d, 'users', uid, 'devices', deviceId),
      { name: label ?? deviceName(), seenAt: Date.now(), at: serverTimestamp() },
      { merge: true },
    )
  } catch {
    /* not important enough to bother the user */
  }
}

export async function listDevices(uid: string): Promise<{ id: string; name: string; seenAt: number }[]> {
  const d = getDb()
  if (!d) return []
  try {
    const snap = await getDocs(query(collection(d, 'users', uid, 'devices'), limit(12)))
    return snap.docs.map((x) => ({ id: x.id, name: String(x.data().name ?? 'device'), seenAt: Number(x.data().seenAt ?? 0) }))
  } catch {
    return []
  }
}

export async function wipeCloud(uid: string): Promise<void> {
  const d = getDb()
  if (!d) return
  const buckets: Bucket[] = ['prefs', 'mylist', 'progress', 'collections', 'rated', 'searches']
  await Promise.all(buckets.map((b) => deleteDoc(doc(d, 'users', uid, 'data', b)).catch(() => undefined)))
}

function deviceName(): string {
  const ua = navigator.userAgent
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Mac OS X/i.test(ua)
        ? 'macOS'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  return `${browser} · ${os}`
}
