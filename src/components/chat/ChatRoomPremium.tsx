'use client'

import { useState, useEffect } from 'react'
import { ChatRoom as ChatRoomType, Message } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Phone, Video, Search, MoreVertical, Hash, Users, ArrowLeft, Archive, ArchiveRestore } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MessageListPremium } from './MessageListPremium'
import { MessageInputPremium } from './MessageInputPremium'
import { MessageSearchDialog } from './MessageSearchDialog'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useArchiveChat } from '@/hooks/useArchiveChat'
import { toast } from 'sonner'

interface ChatUser {
  id: string
  name: string
  email: string
  avatar?: string
  sector: string
  role: string
}

interface ChatRoomPremiumProps {
  room: ChatRoomType | null
  messages: Message[]
  onSendMessage: (message: string) => void
  typingUsers?: string[]
  isLoading?: boolean
  onBack?: () => void
  getDMUserInfo?: (room: ChatRoomType) => Promise<ChatUser | null>
}

export function ChatRoomPremium({
  room,
  messages,
  onSendMessage,
  typingUsers = [],
  isLoading,
  onBack,
  getDMUserInfo,
}: ChatRoomPremiumProps) {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const { users } = useUsers()
  const { user } = useAuth()
  const { isRoomArchived, toggleArchive } = useArchiveChat(user?.id)

  // Keyboard shortcut: Ctrl+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchDialogOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMessageClick = (messageId: string) => {
    // TODO: Scroll to message in list
    console.log('Scroll to message:', messageId)
  }

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Hash className="h-16 w-16 text-gray-800 mx-auto" />
          <div>
            <h3 className="text-xl font-bold text-gray-200">Selecione uma conversa</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Escolha uma sala ou mensagem direta no menu ao lado para começar a conversar
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentChatName = room.name
  const isOnline = room.type === 'dm'
  const isArchived = isRoomArchived(room.id)
  // TODO: Implementar cache de usuários DM para evitar Promise no render
  // const dmUser = room.type === 'dm' ? await getDMUserInfo?.(room) : null

  const handleToggleArchive = async () => {
    try {
      await toggleArchive(room.id)
      toast.success(isArchived ? 'Sala desarquivada' : 'Sala arquivada')

      // If archiving, call onBack to return to room list
      if (!isArchived && onBack) {
        onBack()
      }
    } catch (error) {
      toast.error('Erro ao arquivar sala')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 border-b border-[#ff0300]/20 flex items-center justify-between px-4 lg:px-6 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          {/* Botão Voltar - Apenas Mobile */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden text-[#fc7a67] hover:bg-[#ff0300]/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          {room.type === 'dm' ? (
            <Avatar className="w-10 h-10 border-2 border-[#fc7a67]">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-[#fc7a67] text-black font-bold">
                {currentChatName[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#fc7a67] flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-black" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-white truncate">{currentChatName}</h2>
            <p className="text-xs text-gray-400">
              {room.type === 'dm'
                ? isOnline ? "Online" : "Offline"
                : `${room.participants.length} participantes`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#fc7a67] hover:bg-[#ff0300]/20 hidden md:flex"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#fc7a67] hover:bg-[#ff0300]/20 hidden md:flex"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchDialogOpen(true)}
            className="text-[#fc7a67] hover:bg-[#ff0300]/20"
            title="Buscar mensagens (Ctrl+F)"
          >
            <Search className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#fc7a67] hover:bg-[#ff0300]/20"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1a1a] border-[#ff0300]/20 text-white">
              <DropdownMenuItem className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
                Silenciar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#ff0300]/20" />
              <DropdownMenuItem
                className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20"
                onClick={handleToggleArchive}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Desarquivar
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#ff0300]/20" />
              <DropdownMenuItem className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20 text-[#ff0300]">
                Bloquear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <MessageListPremium
        messages={messages}
        typingUsers={typingUsers}
        isLoading={isLoading}
      />

      {/* Input */}
      <MessageInputPremium onSendMessage={onSendMessage} />

      {/* Search Dialog */}
      <MessageSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        messages={messages}
        users={users || []}
        onMessageClick={handleMessageClick}
      />
    </div>
  )
}
