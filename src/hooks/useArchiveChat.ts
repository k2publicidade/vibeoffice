'use client'
import { useCallback, useMemo } from 'react'
import { useChatPreferences } from './useChatPreferences'

export function useArchiveChat(userId?: string) {
  const preferences = useChatPreferences(userId)
  const archivedRoomIds = useMemo(() => new Set(preferences.rows.filter(row => row.is_archived).map(row => row.room_id)), [preferences.rows])
  const isRoomArchived = useCallback((roomId: string) => archivedRoomIds.has(roomId), [archivedRoomIds])
  const archiveRoom = useCallback(async (roomId: string) => { await preferences.update(roomId, { is_archived: true, archived_at: new Date().toISOString() }) }, [preferences.update])
  const unarchiveRoom = useCallback(async (roomId: string) => { await preferences.update(roomId, { is_archived: false, archived_at: null }) }, [preferences.update])
  const toggleArchive = useCallback(async (roomId: string) => {
    if (preferences.loading || preferences.error) throw new Error('Aguarde o carregamento das preferências ou tente novamente.')
    if (isRoomArchived(roomId)) await unarchiveRoom(roomId); else await archiveRoom(roomId)
  }, [preferences.loading, preferences.error, isRoomArchived, archiveRoom, unarchiveRoom])
  return { archivedRoomIds, ready: preferences.ready, isLoading: preferences.loading, saving: preferences.saving, error: preferences.error, refresh: preferences.refresh, isRoomArchived, archiveRoom, unarchiveRoom, toggleArchive }
}
