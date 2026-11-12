'use client'

import { useSyncExternalStore } from 'react'

/**
 * Store compartilhada entre todas as instâncias de um hook.
 *
 * Antes, cada componente que chamava useUsers/useTasks/etc. fazia sua própria
 * busca completa no Supabase e abria seu próprio canal realtime (ex.: um
 * useUsers por card de tarefa). Com a store, a busca e o canal acontecem uma
 * única vez por recurso, e todas as instâncias leem o mesmo estado.
 */
export interface SharedStore<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (listener: () => void) => () => void
  reset: () => void
}

export function createSharedStore<T>(initial: T): SharedStore<T> {
  let state = initial
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())
  return {
    get: () => state,
    set: (next) => {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      if (Object.is(value, state)) return
      state = value
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    reset: () => {
      if (Object.is(state, initial)) return
      state = initial
      emit()
    },
  }
}

export function useSharedStore<T>(store: SharedStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/**
 * Recurso com contagem de referências: `start` roda quando a primeira
 * instância monta (para a chave atual) e o cleanup roda quando a última
 * desmonta. Ao trocar de chave (ex.: outro usuário logado) o recurso reinicia.
 */
export interface SharedResource<T, Ctx> {
  store: SharedStore<T>
  acquire: (key: string, ctx: Ctx) => () => void
  refresh: () => Promise<void>
}

export function createSharedResource<T, Ctx>(
  initial: T,
  start: (ctx: Ctx, store: SharedStore<T>, isCurrent: () => boolean) => { cleanup?: () => void; refresh: () => Promise<void> }
): SharedResource<T, Ctx> {
  const store = createSharedStore(initial)
  let activeKey: string | null = null
  let generation = 0
  let refs = 0
  let current: { cleanup?: () => void; refresh: () => Promise<void> } | null = null

  const stop = () => {
    generation++
    current?.cleanup?.()
    current = null
    activeKey = null
    store.reset()
  }

  return {
    store,
    acquire: (key, ctx) => {
      if (activeKey !== key) {
        stop()
        activeKey = key
        const myGeneration = generation
        current = start(ctx, store, () => generation === myGeneration)
      }
      refs++
      let released = false
      return () => {
        if (released) return
        released = true
        refs--
        if (refs <= 0) {
          refs = 0
          stop()
        }
      }
    },
    refresh: () => current?.refresh() ?? Promise.resolve(),
  }
}
