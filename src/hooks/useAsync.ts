import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | undefined
  error: string | null
  loading: boolean
}

/** Fetch helper for the TMDB calls: aborts on unmount / param change, keeps
 *  the previous data on screen while revalidating (stale-while-revalidate),
 *  and never flickers a spinner when the answer came from the local cache. */
export function useAsync<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
): AsyncState<T> & { reload: () => void } {
  const enabled = options.enabled !== false
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: null, loading: enabled })
  const [nonce, setNonce] = useState(0)
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  useEffect(() => {
    if (!enabled) {
      setState({ data: undefined, error: null, loading: false })
      return
    }
    const ac = new AbortController()
    let alive = true
    setState((prev) => ({ data: prev.data, error: null, loading: true }))
    factoryRef
      .current(ac.signal)
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false })
      })
      .catch((err: Error) => {
        if (!alive || err?.name === 'AbortError') return
        setState({ data: undefined, error: err?.message || 'Something went wrong', loading: false })
      })
    return () => {
      alive = false
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}

/** Append-only paging for the Movies / Series / search grids. */
export function usePaged<T extends { id: number }>(
  load: (page: number, signal: AbortSignal) => Promise<{ results: T[]; total_pages?: number } | undefined>,
  deps: unknown[],
) {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const { data, loading, error, reload } = useAsync((signal) => load(page, signal), [...deps, page])
  const seen = useRef(new Set<number>())
  const depsKey = JSON.stringify(deps)

  // any filter change jumps back to page one and starts the list over
  useEffect(() => {
    setPage(1)
    setItems([])
    setHasMore(true)
    seen.current = new Set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey])

  useEffect(() => {
    if (!data) return
    if (page === 1) seen.current = new Set()
    const fresh: T[] = []
    for (const item of data.results) {
      if (seen.current.has(item.id)) continue
      seen.current.add(item.id)
      fresh.push(item)
    }
    setItems((prev) => (page === 1 ? fresh : [...prev, ...fresh]))
    setHasMore(page < (data.total_pages ?? 1) && data.results.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page])

  const reset = useCallback(() => {
    seen.current = new Set()
    setItems([])
    setHasMore(true)
    setPage(1)
  }, [])

  const next = useCallback(() => {
    setPage((p) => p + 1)
  }, [])

  return { items, loading, error, hasMore, next, reset, reload, page }
}
