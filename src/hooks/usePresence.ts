'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createSharedResource, useSharedStore } from '@/lib/shared-resource'
import { useAuth } from './useAuth'

export interface OnlineUser {
  userId: string
  onlineAt: string
}

const EMPTY: string[] = []

/**
 * Presença compartilhada: o popover e a sidebar de usuários online usam o mesmo
 * canal. Antes cada um entrava no mesmo tópico e, ao desmontar um deles, o canal
 * era removido para ambos (o usuário "sumia" da lista de online).
 */
const presenceResource = createSharedResource<string[], { userId: string; supabase: ReturnType<typeof createClient> }>(
  EMPTY,
  ({ userId, supabase }, store, isCurrent) => {
    const channel = supabase.channel('office-presence', { config: { private: true, presence: { key: userId } } })

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!isCurrent()) return
        const state = channel.presenceState()
        const users = Object.keys(state).flatMap(key =>
          state[key].map((presence: any) => presence.user_id)
        )
        store.set(Array.from(new Set(users)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    return {
      cleanup: () => { void supabase.removeChannel(channel) },
      refresh: async () => {},
    }
  }
)

export function usePresence() {
  const { user } = useAuth()
  const shared = useSharedStore(presenceResource.store)
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    return presenceResource.acquire(userId, { userId, supabase })
  }, [userId, supabase])

  return { onlineUsers: user ? shared : EMPTY }
}
