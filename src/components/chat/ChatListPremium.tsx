import { useState } from 'react'
import { Search, MoreVertical, Hash, Users, ChevronDown, MessageSquarePlus, Archive } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChatRoom } from '@/types/chat'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { useArchiveChat } from '@/hooks/useArchiveChat'

interface ChatUser {
  id: string
  name: string
  email: string
  avatar?: string
  sector: string
  role: string
}

interface ChatListPremiumProps {
  rooms: ChatRoom[]
  selectedRoom: ChatRoom | null
  onSelectRoom: (room: ChatRoom) => void
  onNewConversation?: () => void
  unreadCounts?: Record<string, number>
  lastMessages?: Record<string, { content: string; timestamp: Date }>
  getDMUserInfo?: (room: ChatRoom) => Promise<ChatUser | null>
}

export function ChatListPremium({
  rooms,
  selectedRoom,
  onSelectRoom,
  onNewConversation,
  unreadCounts = {},
  lastMessages = {},
  getDMUserInfo,
}: ChatListPremiumProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSectors, setShowSectors] = useState(true)
  const [showDMs, setShowDMs] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  const { user } = useAuth()
  const { isRoomArchived, archivedRoomIds } = useArchiveChat(user?.id)

  const sectorRooms = rooms.filter(room => room.type === 'sector')
  const dmRooms = rooms.filter(room => room.type === 'dm')

  const filterFn = (room: ChatRoom) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase())
    const isArchived = isRoomArchived(room.id)

    // If showArchived is false, exclude archived rooms
    // If showArchived is true, show ONLY archived rooms
    if (showArchived) {
      return matchesSearch && isArchived
    } else {
      return matchesSearch && !isArchived
    }
  }

  const filteredSectors = sectorRooms.filter(filterFn)
  const filteredDMs = dmRooms.filter(filterFn)

  const archivedCount = Array.from(archivedRoomIds).length

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const hours = diff / (1000 * 60 * 60)

    if (hours < 24) {
      return format(new Date(date), 'HH:mm')
    } else if (hours < 48) {
      return 'Ontem'
    } else {
      return format(new Date(date), 'dd/MM')
    }
  }

  return (
    <div className="w-full lg:w-80 bg-black border-r border-[#ff0300]/20 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#ff0300]/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#fc7a67]">CRM Chat</h1>
          {onNewConversation && (
            <Button
              onClick={onNewConversation}
              size="icon"
              className="h-8 w-8 bg-gradient-to-br from-[#fc7a67] to-[#ff0300] hover:from-[#ff0300] hover:to-[#fc7a67] text-white rounded-lg"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-[#ff0300]/20 text-white placeholder:text-gray-500 focus-visible:border-[#fc7a67] focus-visible:ring-[#fc7a67]"
          />
        </div>

        {/* Archive Filter */}
        <div className="flex items-center justify-between space-x-2 p-2 bg-[#1a1a1a] rounded-lg">
          <Label
            htmlFor="show-archived"
            className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer"
          >
            <Archive className="h-3.5 w-3.5" />
            Mostrar arquivadas {archivedCount > 0 && `(${archivedCount})`}
          </Label>
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
            className="data-[state=checked]:bg-[#fc7a67]"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {/* Sectors Toggle */}
        <div className="p-2">
          <button
            onClick={() => setShowSectors(!showSectors)}
            className="w-full flex items-center justify-between p-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold"
          >
            <span>Setores</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showSectors ? "rotate-180" : "")}
            />
          </button>
          <AnimatePresence>
            {showSectors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {filteredSectors.map((room) => {
                  const isSelected = selectedRoom?.id === room.id
                  const unreadCount = unreadCounts[room.id] || 0

                  return (
                    <button
                      key={room.id}
                      onClick={() => onSelectRoom(room)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-all group',
                        isSelected ? 'bg-[#ff0300]/20 border border-[#fc7a67]' : 'hover:bg-[#1a1a1a]'
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-[#ff0300]/20 transition-colors",
                        isSelected ? "bg-[#fc7a67]" : "bg-[#1a1a1a]"
                      )}>
                        <Users className={cn("h-5 w-5", isSelected ? "text-black" : "text-[#fc7a67]")} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn("font-medium truncate", isSelected ? "text-white" : "text-gray-200")}>
                            {room.name}
                          </span>
                          {unreadCount > 0 && (
                            <span className="bg-[#ff0300] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">Canal de equipe</p>
                      </div>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Direct Messages */}
        <div className="p-2 pt-0">
          <button
            onClick={() => setShowDMs(!showDMs)}
            className="w-full flex items-center justify-between p-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold"
          >
            <span>Mensagens Diretas {filteredDMs.length > 0 && `(${filteredDMs.length})`}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showDMs ? "rotate-180" : "")}
            />
          </button>
          <AnimatePresence>
            {showDMs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {filteredDMs.length > 0 ? (
                  filteredDMs.map((room) => {
                    const isSelected = selectedRoom?.id === room.id
                    const unreadCount = unreadCounts[room.id] || 0
                    const lastMessage = lastMessages[room.id]
                    // TODO: Implementar cache de usuários DM para evitar Promise no render
                    // const dmUser = await getDMUserInfo?.(room)

                    return (
                      <button
                        key={room.id}
                        onClick={() => onSelectRoom(room)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg transition-all group',
                          isSelected ? 'bg-[#ff0300]/20 border border-[#fc7a67]' : 'hover:bg-[#1a1a1a]'
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="w-10 h-10 border-2 border-[#ff0300]/20">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white font-bold">
                              {room.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={cn("font-medium truncate", isSelected ? "text-white" : "text-gray-200")}>
                              {room.name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {lastMessage ? formatTime(lastMessage.timestamp) : formatTime(room.updatedAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400 truncate">
                              {lastMessage?.content || 'Iniciar conversa...'}
                            </p>
                            {unreadCount > 0 && (
                              <span className="bg-[#ff0300] text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">Nenhuma conversa direta</p>
                    {onNewConversation && (
                      <button
                        onClick={onNewConversation}
                        className="mt-2 text-sm text-[#fc7a67] hover:text-[#ff0300] transition-colors"
                      >
                        Iniciar nova conversa
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  )
}
