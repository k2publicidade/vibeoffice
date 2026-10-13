'use client'
import { useEffect, useMemo } from 'react'
import { ChatPreferenceContextChangedError, useChatPreferences } from './useChatPreferences'

export function useRoomPreferences(roomId?: string, userId?: string) {
  const preferences = useChatPreferences(roomId ? userId : undefined, roomId)
  const scope = useMemo(() => ({ active: true }), [roomId, userId])
  useEffect(() => { scope.active = true; return () => { scope.active = false } }, [scope])
  const row = preferences.rows.find(item => item.room_id === roomId)
  async function update(kind: 'is_muted' | 'is_blocked', value: boolean) {
    if (!scope.active) throw new ChatPreferenceContextChangedError()
    if (!roomId) throw new Error('Selecione uma conversa.')
    await preferences.update(roomId, { [kind]: value })
    if (!scope.active) throw new ChatPreferenceContextChangedError()
  }
  return { muted: Boolean(row?.is_muted), blocked: Boolean(row?.is_blocked), loading: preferences.loading, saving: preferences.saving, error: preferences.error, refresh: preferences.refresh, update }
}
