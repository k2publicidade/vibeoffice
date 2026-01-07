'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export interface OnlineUser {
  userId: string
  onlineAt: string
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('online-users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state).flatMap(key =>
          state[key].map((presence: any) => presence.user_id)
        )
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  return { onlineUsers }
}
