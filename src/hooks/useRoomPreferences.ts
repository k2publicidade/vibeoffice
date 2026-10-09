'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRoomPreferences(roomId?: string, userId?: string) {
  const client = useMemo(() => createClient(), [])
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let disposed = false
    setLoading(true); setMuted(false); setBlocked(false)
    if (!roomId || !userId) { setLoading(false); return }
    const refresh = async () => {
      const { data, error } = await client.from('user_chat_preferences').select('is_muted,is_blocked').eq('room_id', roomId).eq('user_id', userId).maybeSingle()
      if (disposed) return
      if (!error) { setMuted(!!data?.is_muted); setBlocked(!!data?.is_blocked) }
      setLoading(false)
    }
    void refresh()
    const channel = client.channel(`room-preferences:${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'user_chat_preferences', filter: `user_id=eq.${userId}` }, () => void refresh()).subscribe()
    return () => { disposed = true; void client.removeChannel(channel) }
  }, [roomId, userId, client])
  async function update(kind: 'is_muted' | 'is_blocked', value: boolean) {
    if (!roomId || !userId) throw new Error('Selecione uma conversa')
    setSaving(true)
    try {
      const { error } = await client.from('user_chat_preferences').upsert({ room_id: roomId, user_id: userId, [kind]: value }, { onConflict: 'user_id,room_id' })
      if (error) throw error
      if (kind === 'is_muted') setMuted(value); else setBlocked(value)
    } finally { setSaving(false) }
  }
  return { muted, blocked, loading, saving, update }
}
