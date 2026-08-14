import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { PersonComputed } from '../server/lib/types'
import { api } from './api'

interface Store {
  people: PersonComputed[]
  tags: string[]
  loaded: boolean
  refresh: () => Promise<void>
}

const StoreContext = createContext<Store>({ people: [], tags: [], loaded: false, refresh: async () => {} })

export function StoreProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<PersonComputed[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const [p, t] = await Promise.all([api.listPeople(), api.tags()])
    setPeople(p)
    setTags(t)
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh().catch((e) => console.error('Failed to load people', e))
  }, [refresh])

  return <StoreContext.Provider value={{ people, tags, loaded, refresh }}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  return useContext(StoreContext)
}

/* ---------- toasts ---------- */

let toastId = 0
export interface Toast {
  id: number
  text: string
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string) => {
    const id = ++toastId
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return { toasts, push }
}

export const ToastContext = createContext<{ push: (text: string) => void }>({ push: () => {} })
export const useToast = () => useContext(ToastContext)
