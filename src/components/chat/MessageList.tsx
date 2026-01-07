'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface MessageListProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
  onReactionToggle?: (messageId: string, emoji: string) => void
}

export function MessageList({ messages, typingUsers = [], isLoading, onReactionToggle }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  // Auto scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Nenhuma mensagem ainda. Comece a conversa!
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8">
          Seja o primeiro a enviar uma mensagem
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === user?.id}
            currentUserId={user?.id || ''}
            onReactionToggle={onReactionToggle}
          />
        ))
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex gap-2 py-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-2">
            Alguém está digitando...
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}
