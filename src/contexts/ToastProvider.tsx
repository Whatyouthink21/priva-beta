import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { IcCheck, IcClose, IcInfo, IcAlert } from '../components/icons'

type ToastKind = 'ok' | 'bad' | 'info'

interface Toast {
  id: number
  text: string
  kind: ToastKind
  action?: { label: string; run: () => void }
}

interface ToastApi {
  push: (text: string, opts?: { kind?: ToastKind; action?: Toast['action']; timeout?: number }) => number
  dismiss: (id: number) => void
}

const Ctx = createContext<ToastApi>({ push: () => 0, dismiss: () => undefined })

export function useToast(): ToastApi {
  return useContext(Ctx)
}

/** Tiny toast queue with an optional action ("Undo"). Used for the little
 *  confirmations that make an app feel answered instead of silent. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback<ToastApi['push']>(
    (text, opts = {}) => {
      const id = ++seq.current
      setToasts((list) => [...list.slice(-2), { id, text, kind: opts.kind ?? 'info', action: opts.action }])
      timers.current.set(id, setTimeout(() => dismiss(id), opts.timeout ?? (opts.action ? 6000 : 3600)))
      return id
    },
    [dismiss],
  )

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" data-kind={t.kind} key={t.id}>
            {t.kind === 'ok' ? <IcCheck size={16} /> : t.kind === 'bad' ? <IcAlert size={16} /> : <IcInfo size={16} />}
            <span>{t.text}</span>
            {t.action ? (
              <button
                className="toast__act"
                onClick={() => {
                  t.action?.run()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            <button className="icon-btn icon-btn--quiet" aria-label="Dismiss" onClick={() => dismiss(t.id)} style={{ width: 24, height: 24 }}>
              <IcClose size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
