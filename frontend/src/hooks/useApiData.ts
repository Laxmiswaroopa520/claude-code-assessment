import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

export interface ApiData<T> {
  data: T | undefined
  loading: boolean
  error: ApiError | undefined
  reload: () => void
}

interface Settled<T> {
  token: string
  data: T | undefined
  error: ApiError | undefined
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  return new ApiError(0, 'Something went wrong while loading data.', undefined, {})
}

/**
 * Loads data with `load` whenever `key` changes, and exposes loading/error state plus `reload`.
 * `key` must change whenever the inputs of `load` change (for example a serialised query).
 * Loading is derived (the latest request has not settled yet), so no state is set synchronously in the effect.
 */
export function useApiData<T>(load: () => Promise<T>, key: string): ApiData<T> {
  const [version, setVersion] = useState<number>(0)
  const [settled, setSettled] = useState<Settled<T> | undefined>(undefined)
  const token = `${key}#${version}`

  // Callers pass inline closures, so the request is keyed by `key` instead of by function identity.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    loadRef.current()
      .then((data) => {
        if (active) {
          setSettled({ token, data, error: undefined })
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setSettled({ token, data: undefined, error: toApiError(caught) })
        }
      })

    return () => {
      active = false
    }
  }, [token])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const current = settled?.token === token ? settled : undefined
  return { data: current?.data, loading: current === undefined, error: current?.error, reload }
}
