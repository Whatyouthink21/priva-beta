import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authMessage, useAuth } from '../contexts/AuthProvider'
import { useToast } from '../contexts/ToastProvider'
import * as api from '../lib/tmdb'
import { useAsync } from '../hooks/useAsync'
import { APP_NAME, APP_TAGLINE } from '../lib/constants'
import { cn } from '../lib/utils'
import { img } from '../lib/utils'
import { IcAlert, IcCheck, IcEye, IcGoogle, IcLock, IcMail, IcPlay, IcShield, IcSparkle } from '../components/icons'

type Mode = 'signin' | 'signup'

export default function AuthPage({ mode: initial = 'signin' }: { mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial)
  const { user, ready, signInEmail, signUpEmail, signInGoogle, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/my'

  const [name, setName] = useState('')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState<null | 'form' | 'google' | 'reset'>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (ready && user) navigate(next, { replace: true })
  }, [ready, user, navigate, next])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('That email is missing an @ or a domain.')
    if (password.length < 6) return setError(mode === 'signup' ? 'Six characters is the floor — use something you do not reuse.' : 'Six characters minimum.')
    setBusy('form')
    try {
      if (mode === 'signup') {
        await signUpEmail(name, email, password)
        toast.push('Account made. Your list is now portable.', { kind: 'ok' })
      } else {
        await signInEmail(email, password)
        toast.push('Welcome back', { kind: 'ok' })
      }
      navigate(next, { replace: true })
    } catch (err) {
      setError(authMessage(err))
      setBusy(null)
    }
  }

  const google = async () => {
    setError(null)
    setBusy('google')
    try {
      await signInGoogle()
      navigate(next, { replace: true })
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Put the email in the box first and Priva will send the link to it.')
      return
    }
    setError(null)
    setBusy('reset')
    try {
      await resetPassword(email)
      setResetSent(true)
      toast.push('Reset link sent', { kind: 'ok' })
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="auth-split">
      <AuthCopy />

      <div className="auth-form-pane">
        <div className="auth-card">
          <div className="auth-card__head">
            <h1 style={{ fontSize: 'clamp(1.7rem,3.4vw,2.15rem)' }}>{mode === 'signin' ? `Welcome back to ${APP_NAME}` : 'Make an account'}</h1>
            <p className="hint" style={{ marginTop: 6 }}>
              {mode === 'signin'
                ? 'Sign in and the list, the place you stopped and your collections come with you.'
                : 'An email and a password. That is the whole sign-up — no phone number, no preferences quiz.'}
            </p>
          </div>

          <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>
            <button role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(null) }}>
              Sign in
            </button>
            <button role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(null) }}>
              Create account
            </button>
          </div>

          <button className="btn btn--block btn--outline" onClick={google} disabled={busy !== null} style={{ marginBottom: 14 }}>
            <IcGoogle size={17} /> {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>

          <div className="divider-or">or</div>

          <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 14 }} noValidate>
            {mode === 'signup' ? (
              <label className="field">
                <span>Name</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should Priva call you?" autoComplete="nickname" maxLength={40} />
              </label>
            ) : null}

            <label className="field">
              <span>Email</span>
              <div style={{ position: 'relative' }}>
                <IcMail size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--color-dim)' }} />
                <input
                  className={cn('input', error && 'input--invalid')}
                  style={{ paddingLeft: 34 }}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  enterKeyHint="next"
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div style={{ position: 'relative' }}>
                <IcLock size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--color-dim)' }} />
                <input
                  className={cn('input', error && 'input--invalid')}
                  style={{ paddingLeft: 34, paddingRight: 44 }}
                  type={reveal ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  enterKeyHint="go"
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--quiet"
                  style={{ position: 'absolute', right: 4, top: 4, width: 32, height: 32 }}
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Hide the password' : 'Show the password'}
                >
                  <IcEye size={15} />
                </button>
              </div>
            </label>

            {error ? (
              <p className="hint hint--bad" role="alert" style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <IcAlert size={15} /> {error}
              </p>
            ) : null}
            {resetSent ? (
              <p className="hint" style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--color-jade)' }}>
                <IcCheck size={15} /> If that address has an account, the reset link is on its way.
              </p>
            ) : null}

            <button className="btn btn--primary btn--block" type="submit" disabled={busy !== null} style={{ height: 44 }}>
              {busy === 'form' ? (
                <>
                  <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> {mode === 'signin' ? 'Signing in…' : 'Making room…'}
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create my Priva'
              )}
            </button>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
              {mode === 'signin' ? (
                <button type="button" className="btn--link" onClick={forgot}>
                  Forgot the password?
                </button>
              ) : (
                <span className="hint">Password is stored by Firebase, never by Priva.</span>
              )}
              <Link to="/" className="btn--link" style={{ marginLeft: 'auto' }}>
                No thanks, keep me on this device
              </Link>
            </div>
          </form>

          <p className="hint" style={{ marginTop: 18, fontSize: 12 }}>
            {APP_NAME} is a static site: this form talks to Firebase directly, from your browser. There is no Priva server in the
            middle to trust.
          </p>
        </div>
      </div>
    </div>
  )
}

/** The left-hand argument for making an account. */
function AuthCopy() {
  const { data } = useAsync(() => api.trending('movie'), ['auth-collage'], { enabled: true })
  const posters = (data?.results ?? []).filter((r) => r.poster_path).slice(0, 6)

  const points = [
    {
      icon: <IcCheck size={16} />,
      title: 'Your Lists, saved',
      body: 'My List, collections and ratings live in your account instead of one browser profile. Clear cookies without losing the shelf.',
    },
    {
      icon: <IcPlay size={15} />,
      title: 'Keep your place everywhere',
      body: 'Stop at 41 minutes on the phone in bed, start the laptop at 41 minutes. The player reports the time, the account remembers it.',
    },
    {
      icon: <IcSparkle size={16} />,
      title: 'Suggestions that are yours',
      body: 'Because-you-watched rails and Top 10 boards read from what you actually finished, not a cookie trail.',
    },
    {
      icon: <IcShield size={16} />,
      title: 'Still nothing collected',
      body: 'No analytics beyond a Firebase counter, no ad SDK, no email you did not ask for. Delete the account and the rows go with it.',
    },
  ]

  return (
    <aside className="auth-copy">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Link to="/" className="brand" style={{ fontSize: 24 }}>
          priva<em>.</em>
          <span>{APP_TAGLINE}</span>
        </Link>
      </div>

      <div className="auth-points" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.3rem)', maxWidth: '20ch', lineHeight: 1.02 }}>
            A shelf that follows you around.
          </h2>
        </div>
        {points.map((p) => (
          <div key={p.title}>
            <i>{p.icon}</i>
            <div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="auth-collage" aria-hidden="true">
        {posters.length ? (
          posters.map((p, i) => (
            <img key={p.id} src={img(p.poster_path, 'w185')} alt="" loading="lazy" decoding="async" style={{ '--i': i } as CSSProperties} />
          ))
        ) : (
          <p className="hint" style={{ fontSize: 12 }}>
            Posters come from TMDB once you have a key — the page works fine without them.
          </p>
        )}
      </div>
    </aside>
  )
}
