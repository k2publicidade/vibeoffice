'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useMessageReactions() {
  const supabase = createClient()

  /**
   * Toggle reaction on a message
   * If user already reacted with this emoji, remove reaction
   * If user hasn't reacted yet, add reaction
   */
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string, userId: string) => {
      try {
        // First, fetch current reactions
        const { data: message, error: fetchError } = await supabase
          .from('messages')
          .select('reactions')
          .eq('id', messageId)
          .single()

        if (fetchError) throw fetchError

        const currentReactions = (message.reactions as { [emoji: string]: string[] }) || {}
        const userIds = currentReactions[emoji] || []
        const hasReacted = userIds.includes(userId)

        let newReactions: { [emoji: string]: string[] }

        if (hasReacted) {
          // Remove user's reaction
          const updatedUserIds = userIds.filter((id) => id !== userId)
          if (updatedUserIds.length === 0) {
            // Remove emoji entirely if no users left
            newReactions = { ...currentReactions }
            delete newReactions[emoji]
          } else {
            newReactions = {
              ...currentReactions,
              [emoji]: updatedUserIds,
            }
          }
        } else {
          // Add user's reaction
          newReactions = {
            ...currentReactions,
            [emoji]: [...userIds, userId],
          }
        }

        // Update in database
        const { error: updateError } = await supabase
          .from('messages')
          .update({ reactions: newReactions })
          .eq('id', messageId)

        if (updateError) throw updateError
      } catch (error) {
        console.error('Error toggling reaction:', error)
        toast.error('Erro ao reagir à mensagem')
      }
    },
    [supabase]
  )

  return {
    toggleReaction,
  }
}
