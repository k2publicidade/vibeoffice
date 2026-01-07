'use client'

import { memo } from 'react'
import { Message } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUsers } from '@/hooks/useUsers'
import { MessageReactions, Reactions } from './MessageReactions'

interface MessageBubbleProps {
  message: Message
  isCurrentUser: boolean
  currentUserId: string
  onReactionToggle?: (messageId: string, emoji: string) => void
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isCurrentUser,
  currentUserId,
  onReactionToggle
}: MessageBubbleProps) {
  const { users } = useUsers()
  const user = users?.find(u => u.id === message.userId)
  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  const timeString = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex gap-2 mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
          <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {!isCurrentUser && (
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {user?.name}
          </p>
        )}

        <div
          className={`max-w-xs px-3 py-2 rounded-lg ${
            isCurrentUser
              ? 'bg-primary text-white rounded-br-none'
              : 'bg-muted text-foreground rounded-bl-none'
          }`}
        >
          <p className="text-sm break-words">{message.content}</p>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {timeString}
        </p>

        {/* Message Reactions */}
        {onReactionToggle && (
          <MessageReactions
            messageId={message.id}
            reactions={(message.reactions || {}) as Reactions}
            currentUserId={currentUserId}
            users={users || []}
            onReactionToggle={onReactionToggle}
          />
        )}
      </div>

      {isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs">
            VD
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
})

MessageBubble.displayName = 'MessageBubble'
