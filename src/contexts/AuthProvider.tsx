import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { firebaseImpl, hadSession, rememberSession } from '../lib/firebase'
import { touchDevice, wipeCloud, writeProfile } from '../lib/firestore'
import { bindCloud, getSnapshot, unbindCloud } from '../lib/store'
import type { User } from 'firebase/auth'

/* Every action below goes through firebaseImpl(): the SDK is a lazy chunk, so
 * a click has to wait for it the first time and gets it from memory after. */
type Sdk = NonNullable<Awaited<ReturnType<typeof firebaseImpl>>>
const OFFLINE = 'Firebase is not configured in this build, so accounts are disabled. Priva still keeps your list on this device.'

async function sdk(): Promise<Sdk> {
  const impl = await firebaseImpl()
  if (!impl) throw new Error(OFFLINE)
  return impl
}

interface AuthApi {
  user: User | null
  ready: boolean
  /** Load the (heavy) Firebase SDK on demand and resolve with the signed-in
   *  user, or null. Used by the account button so an anonymous visitor never
   *  downloads the SDK just to look at a menu. */
  ensureAuth: () => Promise<User | null>
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
  const userRef = useRef<User | null>(null)
  const startRef = useRef<Promise<User | null> | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  /** Start the auth listener exactly once. Resolves with the first answer
   *  Firebase gives us — that is "signed in" or "signed out". */
  const start = useCallback((): Promise<User | null> => {
    if (startRef.current) return startRef.current
    startRef.current = (async () => {
      const impl = await firebaseImpl()
      if (!impl) {
        setReady(true)
        return null
      }
      return new Promise<User | null>((resolve) => {
        let settled = false
        const finish = (value: User | null) => {
          if (settled) return
          settled = true
          resolve(value)
        }
        const timer = setTimeout(() => finish(userRef.current), 4000)
        stopRef.current = impl.watchAuth(
          (next) => {
            clearTimeout(timer)
            userRef.current = next
            setUser(next)
            setReady(true)
            if (next) {
              rememberSession(true)
              void bindCloud({ kind: 'user', uid: next.uid, email: next.email })
              // one doc per browser, so Settings can list and name the devices
              void touchDevice(next.uid, getSnapshot().deviceId)
              void writeProfile(next.uid, { displayName: next.displayName, email: next.email, photoURL: next.photoURL })
            } else {
              rememberSession(false)
              unbindCloud()
            }
            finish(next)
          },
          () => {
            clearTimeout(timer)
            setReady(true)
            finish(null)
          },
        )
      })
    })()
    return startRef.current
  }, [])

  const ensureAuth = useCallback(async (): Promise<User | null> => {
    if (userRef.current) return userRef.current
    await start()
    return userRef.current
  }, [start])

  useEffect(() => {
    // a browser that has never signed in does not need the SDK at all
    if (!hadSession()) return
    // …and a returning one should not compete with the first paint for
    // bandwidth, so give the browser a moment to settle first
    const idle = (window as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
    const handle = idle ? idle(() => void start(), { timeout: 2000 }) : window.setTimeout(() => void start(), 800)
    return () => {
      // only the *scheduling* is undone: the auth listener itself is global
      // and stays alive, so StrictMode's double mount cannot leave us
      // watching a dead observer
      if (idle) {
        const cancel = (window as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback
        cancel?.(handle as number)
      } else {
        window.clearTimeout(handle as number)
      }
    }
  }, [start])

  const signInEmail = useCallback(async (email: string, password: string) => {
    const impl = await sdk()
    await start() // the listener has to be watching to see the sign-in
    await impl.actions.signIn(email.trim(), password)
  }, [start])

  const signUpEmail = useCallback(async (name: string, email: string, password: string) => {
    const impl = await sdk()
    await start()
    const cred = await impl.actions.signUp(email.trim(), password)
    const display = name.trim() || (email.split('@')[0] ?? 'watcher')
    try {
      await impl.actions.rename(display)
    } catch {
      /* cosmetic only */
    }
    await writeProfile(cred.user.uid, { displayName: display, email: cred.user.email })
  }, [start])

  const signInGoogle = useCallback(async () => {
    const impl = await sdk()
    await start()
    await impl.actions.google()
  }, [start])

  const signOutNow = useCallback(async () => {
    const impl = await firebaseImpl()
    if (!impl) return
    await impl.actions.signOut()
    rememberSession(false)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const impl = await sdk()
    await impl.actions.reset(email.trim())
  }, [])

  const changeDisplayName = useCallback(async (name: string) => {
    const impl = await firebaseImpl()
    const current = impl?.actions.currentUser()
    if (!impl || !current) return
    await impl.actions.rename(name.trim())
    await writeProfile(current.uid, { displayName: name.trim() })
    setUser({ ...current })
  }, [])

  const removeAccount = useCallback(async () => {
    const impl = await sdk()
    const current = impl.actions.currentUser()
    if (!current) return
    await wipeCloud(current.uid)
    await impl.actions.remove()
  }, [])

  const value = useMemo<AuthApi>(
    () => ({ user, ready, ensureAuth, signInEmail, signUpEmail, signInGoogle, signOutNow, resetPassword, changeDisplayName, removeAccount }),
    [user, ready, ensureAuth, signInEmail, signUpEmail, signInGoogle, signOutNow, resetPassword, changeDisplayName, removeAccount],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

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
