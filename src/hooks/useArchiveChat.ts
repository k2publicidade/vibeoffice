'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChatPreference {
  id: string
  userId: string
  roomId: string
  isArchived: boolean
  archivedAt: string | null
  createdAt: Date
  updatedAt: Date
}

export function useArchiveChat(userId: string | undefined) {
  const supabase = createClient()
  const [archivedRoomIds, setArchivedRoomIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Fetch archived rooms for current user
   */
  const fetchArchivedRooms = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_chat_preferences')
        .select('room_id, is_archived')
        .eq('user_id', userId)
        .eq('is_archived', true)

      if (error) throw error

      const archivedIds = new Set(data?.map((pref) => pref.room_id) || [])
      setArchivedRoomIds(archivedIds)
    } catch (error) {
      console.error('Error fetching archived rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchArchivedRooms()
  }, [fetchArchivedRooms])

  /**
   * Check if a room is archived
   */
  const isRoomArchived = useCallback(
    (roomId: string): boolean => {
      return archivedRoomIds.has(roomId)
    },
    [archivedRoomIds]
  )

  /**
   * Archive a chat room
   */
  const archiveRoom = useCallback(
    async (roomId: string) => {
      if (!userId) return

      try {
        const { error } = await supabase.from('user_chat_preferences').upsert(
          {
            user_id: userId,
            room_id: roomId,
            is_archived: true,
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,room_id',
          }
        )

        if (error) throw error

        // Update local state
        setArchivedRoomIds((prev) => new Set([...prev, roomId]))
      } catch (error) {
        console.error('Error archiving room:', error)
        throw error
      }
    },
    [userId, supabase]
  )

  /**
   * Unarchive a chat room
   */
  const unarchiveRoom = useCallback(
    async (roomId: string) => {
      if (!userId) return

      try {
        const { error } = await supabase.from('user_chat_preferences').upsert(
          {
            user_id: userId,
            room_id: roomId,
            is_archived: false,
            archived_at: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,room_id',
          }
        )

        if (error) throw error

        // Update local state
        setArchivedRoomIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(roomId)
          return newSet
        })
      } catch (error) {
        console.error('Error unarchiving room:', error)
        throw error
      }
    },
    [userId, supabase]
  )

  /**
   * Toggle archive status
   */
  const toggleArchive = useCallback(
    async (roomId: string) => {
      const isArchived = isRoomArchived(roomId)
      if (isArchived) {
        await unarchiveRoom(roomId)
      } else {
        await archiveRoom(roomId)
      }
    },
    [isRoomArchived, archiveRoom, unarchiveRoom]
  )

  return {
    archivedRoomIds,
    isLoading,
    isRoomArchived,
    archiveRoom,
    unarchiveRoom,
    toggleArchive,
  }
}
