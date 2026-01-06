'use client'

import { ChatRoom as ChatRoomType, Message } from '@/types/chat'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { Users, Hash } from 'lucide-react'

interface ChatRoomProps {
  room: ChatRoomType | null
  messages: Message[]
  onSendMessage: (message: string) => void
  typingUsers?: string[]
  isLoading?: boolean
}

export function ChatRoom({
  room,
  messages,
  onSendMessage,
  typingUsers = [],
  isLoading,
}: ChatRoomProps) {
  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <Hash className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">Selecione uma sala</h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma sala ou mensagem direta para começar a conversar
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full rounded-none border-0 bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            {room.type === 'sector' ? (
              <Hash className="h-5 w-5 text-primary" />
            ) : (
              <Users className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{room.name}</h2>
            <p className="text-xs text-muted-foreground">
              {room.participants.length} participantes
            </p>
          </div>
        </div>

        {/* Room Type Badge */}
        <Badge variant="secondary" className="text-xs">
          {room.type === 'sector' ? '# Setor' : '👥 DM'}
        </Badge>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        typingUsers={typingUsers}
        isLoading={isLoading}
      />

      {/* Input */}
      <MessageInput onSendMessage={onSendMessage} />
    </Card>
  )
}
