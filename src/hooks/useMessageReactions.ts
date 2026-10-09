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
        const { error } = await supabase.rpc('toggle_message_reaction' as never, { message_id: messageId, emoji } as never)
        if (error) throw error
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
