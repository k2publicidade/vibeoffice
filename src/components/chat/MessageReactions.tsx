'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ReactionBar } from './ReactionBar'

export interface Reactions {
  [emoji: string]: string[] // emoji -> array of user IDs
}

interface MessageReactionsProps {
  messageId: string
  reactions: Reactions
  currentUserId: string
  users: Array<{ id: string; name: string }> // For tooltip names
  onReactionToggle: (messageId: string, emoji: string) => void
}

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  users,
  onReactionToggle,
}: MessageReactionsProps) {
  const [showReactionBar, setShowReactionBar] = useState(false)

  // Check if reactions is empty
  const hasReactions = Object.keys(reactions).length > 0

  const handleEmojiClick = (emoji: string) => {
    onReactionToggle(messageId, emoji)
    setShowReactionBar(false)
  }

  const handleReactionClick = (emoji: string) => {
    onReactionToggle(messageId, emoji)
  }

  const getUserNames = (userIds: string[]): string => {
    return userIds
      .map((id) => users.find((u) => u.id === id)?.name || 'Desconhecido')
      .join(', ')
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Existing reactions */}
      {hasReactions && (
        <>
          {Object.entries(reactions).map(([emoji, userIds]) => {
            const hasReacted = userIds.includes(currentUserId)
            const count = userIds.length

            return (
              <TooltipProvider key={emoji} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactionClick(emoji)}
                      className={`h-6 px-2 py-0 text-xs rounded-full transition-colors ${
                        hasReacted
                          ? 'bg-[#fc7a67]/20 border border-[#fc7a67]/40 text-[#fc7a67] hover:bg-[#fc7a67]/30'
                          : 'bg-[#1a1a1a] border border-[#ff0300]/20 text-gray-300 hover:bg-[#ff0300]/10'
                      }`}
                    >
                      <span className="mr-1">{emoji}</span>
                      <span className="font-medium">{count}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-[#1a1a1a] border-[#ff0300]/20 text-white"
                  >
                    <p className="text-xs">{getUserNames(userIds)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </>
      )}

      {/* Add reaction button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReactionBar(!showReactionBar)}
          className="h-6 w-6 p-0 rounded-full bg-[#1a1a1a] border border-[#ff0300]/20 text-gray-400 hover:bg-[#ff0300]/10 hover:text-[#fc7a67] hover:border-[#fc7a67]/40 transition-colors"
          title="Adicionar reação"
        >
          <Plus className="h-3 w-3" />
        </Button>

        {/* Reaction bar (popover style) */}
        {showReactionBar && (
          <ReactionBar
            onEmojiSelect={handleEmojiClick}
            onClose={() => setShowReactionBar(false)}
          />
        )}
      </div>
    </div>
  )
}
