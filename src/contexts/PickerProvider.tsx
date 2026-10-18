import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Modal } from '../components/Modal'
import { useStore } from '../hooks/useStore'
import { createCollection, toggleInCollection } from '../lib/store'
import { COLLECTION_ACCENTS } from '../lib/constants'
import { cn } from '../lib/utils'
import type { TitleMeta } from '../lib/types'
import { IcCheck, IcPlus } from '../components/icons'
import { useToast } from './ToastProvider'
import { useAuth } from './AuthProvider'
import { SmartLink } from '../components/SmartLink'

interface PickerApi {
  open: (meta: TitleMeta) => void
}

const Ctx = createContext<PickerApi>({ open: () => undefined })

export function usePicker(): PickerApi {
  return useContext(Ctx)
}

/** One "add to collection" dialog for the whole app, instead of one per card. */
export function PickerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<TitleMeta | null>(null)
  const [name, setName] = useState('')
  const { data } = useStore()
  const toast = useToast()
  const { user } = useAuth()

  const open = useCallback((meta: TitleMeta) => {
    setTarget(meta)
    setName('')
  }, [])
  const close = useCallback(() => {
    setTarget(null)
    setName('')
  }, [])

  const api = useMemo(() => ({ open }), [open])

  const create = () => {
    const cleanName = name.trim()
    if (!cleanName) return
    const col = createCollection(cleanName, '', COLLECTION_ACCENTS[data.collections.length % COLLECTION_ACCENTS.length])
    if (target) toggleInCollection(col.id, target)
    toast.push(target ? `Created “${col.name}” and added ${target.title}` : `Created “${col.name}”`, { kind: 'ok' })
    close()
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal
        open={!!target}
        onClose={close}
        title="Add to a collection"
        subtitle={target?.title}
      >
        <div className="link-list">
          {data.collections.map((c) => {
            const has = !!target && c.items.some((x) => x.id === target.id && x.type === target.type)
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (!target) return
                  const added = toggleInCollection(c.id, target)
                  toast.push(added ? `Added to ${c.name}` : `Removed from ${c.name}`, {
                    kind: 'ok',
                    action: { label: 'Undo', run: () => toggleInCollection(c.id, target) },
                  })
                  close()
                }}
                style={{ color: has ? 'var(--color-bone)' : undefined }}
              >
                <span className="tick" data-on={has ? 'true' : 'false'} aria-hidden="true">
                  {has ? <IcCheck size={12} /> : null}
                </span>
                <span className="truncate" style={{ fontWeight: has ? 600 : 500 }}>{c.name}</span>
                <small>{c.items.length}</small>
              </button>
            )
          })}
          {!data.collections.length ? (
            <p className="hint" style={{ padding: '4px 2px' }}>
              No collections yet. Make one — “Late night sci-fi”, “Things dad would like”, whatever.
            </p>
          ) : null}
        </div>

        <div className="new-collection">
          <input
            className="input"
            placeholder="New collection name"
            value={name}
            maxLength={48}
            data-autofocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button className="btn btn--primary btn--sm" onClick={create} disabled={!name.trim()}>
            <IcPlus size={15} /> Create
          </button>
        </div>

        <div className={cn('hint', 'picker-foot')}>
          {user ? (
            <>Your collections sync with your account.</>
          ) : (
            <>
              Saved on this device only. <SmartLink to="/sign-in" onClick={close}>Sign in</SmartLink> to carry them across devices.
            </>
          )}{' '}
          <SmartLink to="/collections" onClick={close} style={{ color: 'var(--color-flare)' }}>
            View collections
          </SmartLink>
        </div>
      </Modal>
    </Ctx.Provider>
  )
}
