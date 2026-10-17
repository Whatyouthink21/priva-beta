import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth } from '../lib/firebase'
import { touchDevice, wipeCloud, writeProfile } from '../lib/firestore'
import { bindCloud, unbindCloud } from '../lib/store'

interface AuthApi {
  user: User | null
  ready: boolean
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (name: string, email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOutNow: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  changeDisplayName: (name: string) => Promise<void>
  removeAccount: () => Promise<void>
}

const Ctx = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      setReady(true)
      return
    }
    const off = onAuthStateChanged(
      auth,
      async (next) => {
        setUser(next)
        setReady(true)
        if (next) {
          await bindCloud({ kind: 'user', uid: next.uid, email: next.email })
          void touchDevice(next.uid, navigator.userAgent.slice(0, 40))
          void writeProfile(next.uid, { displayName: next.displayName, email: next.email, photoURL: next.photoURL })
        } else {
          unbindCloud()
        }
      },
      () => setReady(true),
    )
    return off
  }, [])

  const signInEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error(FIREBASE_OFFLINE)
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signUpEmail = useCallback(async (name: string, email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error(FIREBASE_OFFLINE)
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    const display = name.trim() || (email.split('@')[0] ?? 'watcher')
    try {
      await updateProfile(cred.user, { displayName: display })
    } catch {
      /* cosmetic only */
    }
    await writeProfile(cred.user.uid, { displayName: display, email: cred.user.email })
  }, [])

  const signInGoogle = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error(FIREBASE_OFFLINE)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(auth, provider)
  }, [])

  const signOutNow = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) return
    await signOut(auth)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error(FIREBASE_OFFLINE)
    await sendPasswordResetEmail(auth, email.trim())
  }, [])

  const changeDisplayName = useCallback(async (name: string) => {
    const auth = getFirebaseAuth()
    if (!auth?.currentUser) return
    await updateProfile(auth.currentUser, { displayName: name.trim() })
    await writeProfile(auth.currentUser.uid, { displayName: name.trim() })
    setUser({ ...auth.currentUser })
  }, [])

  const removeAccount = useCallback(async () => {
    const auth = getFirebaseAuth()
    const current = auth?.currentUser
    if (!auth || !current) return
    await wipeCloud(current.uid)
    await deleteUser(current)
  }, [])

  const value = useMemo<AuthApi>(
    () => ({ user, ready, signInEmail, signUpEmail, signInGoogle, signOutNow, resetPassword, changeDisplayName, removeAccount }),
    [user, ready, signInEmail, signUpEmail, signInGoogle, signOutNow, resetPassword, changeDisplayName, removeAccount],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

const FIREBASE_OFFLINE =
  'Firebase is not configured in this build, so accounts are disabled. Priva still keeps your list on this device.'

/** Turns Firebase's machine codes into something a person can act on. */
export function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That does not look like an email address.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email and password do not match an account.'
    case 'auth/email-already-in-use':
      return 'That email already has a Priva account. Try signing in instead.'
    case 'auth/weak-password':
      return 'Pick something longer than six characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts from here. Wait a minute and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google window was closed before finishing.'
    case 'auth/operation-not-allowed':
      return 'That sign-in method is switched off in the Firebase console.'
    case 'auth/requires-recent-login':
      return 'For safety, sign in again before deleting the account.'
    case 'auth/network-request-failed':
      return 'No network. Priva will keep working with what is cached.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the pop-up — allow pop-ups for this site.'
    default:
      return (err as Error)?.message?.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/.*\)$/, '') || 'Something went wrong.'
  }
}
