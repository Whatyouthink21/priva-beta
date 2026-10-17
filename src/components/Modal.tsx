import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IcClose } from './icons'
import { cn } from '../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Small, accessible modal: escape closes, focus is trapped-ish, background
 *  scroll is frozen, and it renders on a sheet on phones. */
export function Modal({ open, onClose, title, subtitle, children, footer, wide }: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && boxRef.current) {
        const focusables = boxRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = requestAnimationFrame(() => {
      boxRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      cancelAnimationFrame(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={cn('modal', wide && 'modal--wide')} role="dialog" aria-modal="true" ref={boxRef}>
        <div className="modal__head">
          <div style={{ minWidth: 0 }}>
            <h2 className="truncate">{title}</h2>
            {subtitle ? <div className="hint" style={{ marginTop: 3 }}>{subtitle}</div> : null}
          </div>
          <button className="icon-btn icon-btn--quiet" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close">
            <IcClose />
          </button>
        </div>
        {children}
        {footer ? <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
