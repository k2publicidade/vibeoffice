import { useState } from 'react'
import { Search, Building2, FolderKanban, MessageCircle, ChevronDown, Plus, MessageSquarePlus, Archive, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChatRoom } from '@/types/chat'
import { isProjectGroup, isSectorRoom, isDM, canManageGroup } from '@/types/chat'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { useArchiveChat } from '@/hooks/useArchiveChat'
import { CreateProjectGroupModal } from './CreateProjectGroupModal'
import type { CreateProjectGroupData } from '@/types/chat'

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
  createProjectGroup: (data: CreateProjectGroupData) => Promise<ChatRoom | null>
}

export function ChatListPremium({
  rooms,
  selectedRoom,
  onSelectRoom,
  onNewConversation,
  unreadCounts = {},
  lastMessages = {},
  getDMUserInfo,
  createProjectGroup,
}: ChatListPremiumProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSectorRooms, setShowSectorRooms] = useState(true)
  const [showProjectRooms, setShowProjectRooms] = useState(true)
  const [showDMs, setShowDMs] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)

  const { user } = useAuth()
  const { isRoomArchived, archivedRoomIds } = useArchiveChat(user?.id)

  const sectorRooms = rooms.filter(isSectorRoom)
  const projectRooms = rooms.filter(isProjectGroup)
  const dmRooms = rooms.filter(isDM)

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
  const filteredProjects = projectRooms.filter(filterFn)
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

  // Componente auxiliar para itens de sala
  const RoomItem = ({ room, icon }: { room: ChatRoom; icon: React.ReactNode }) => {
    const isSelected = selectedRoom?.id === room.id
    const unreadCount = unreadCounts[room.id] || 0
    const isCreator = user?.id && canManageGroup(room, user.id)

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
          <div className={cn("", isSelected ? "text-black" : "text-[#fc7a67]")}>
            {icon}
          </div>
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("font-medium truncate", isSelected ? "text-white" : "text-gray-200")}>
                {room.name}
              </span>
              {isCreator && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#fc7a67]/20 text-[#fc7a67] shrink-0">
                  Criador
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <span className="bg-[#ff0300] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">
            {room.type === 'sector' && 'Canal de equipe'}
            {room.type === 'project' && room.description}
            {room.type === 'dm' && 'Conversa direta'}
          </p>
        </div>
      </button>
    )
  }

  // Componente auxiliar para seções colapsáveis
  const CollapsibleSection = ({
    title,
    icon,
    count,
    isOpen,
    onToggle,
    children,
    action
  }: {
    title: string
    icon: React.ReactNode
    count: number
    isOpen: boolean
    onToggle: () => void
    children: React.ReactNode
    action?: React.ReactNode
  }) => (
    <div className="p-2">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 p-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold"
        >
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <span className="text-xs">({count})</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform ml-auto", isOpen ? "rotate-180" : "")}
          />
        </button>
        {action}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

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
        {/* Seção 1: Salas de Setor */}
        <CollapsibleSection
          title="Salas de Setor"
          icon={<Building2 className="h-4 w-4" />}
          count={filteredSectors.length}
          isOpen={showSectorRooms}
          onToggle={() => setShowSectorRooms(!showSectorRooms)}
        >
          {filteredSectors.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              icon={<Users className="h-5 w-5" />}
            />
          ))}
        </CollapsibleSection>

        {/* Seção 2: Grupos de Projeto */}
        <CollapsibleSection
          title="Grupos de Projeto"
          icon={<FolderKanban className="h-4 w-4" />}
          count={filteredProjects.length}
          isOpen={showProjectRooms}
          onToggle={() => setShowProjectRooms(!showProjectRooms)}
          action={
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowCreateProjectModal(true)}
              className="h-6 w-6 text-[#fc7a67] hover:text-[#ff0300] hover:bg-[#fc7a67]/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          }
        >
          {filteredProjects.length > 0 ? (
            filteredProjects.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                icon={<FolderKanban className="h-5 w-5" />}
              />
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Nenhum grupo de projeto</p>
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="mt-2 text-sm text-[#fc7a67] hover:text-[#ff0300] transition-colors"
              >
                Criar primeiro grupo
              </button>
            </div>
          )}
        </CollapsibleSection>

        {/* Seção 3: Conversas Diretas */}
        <CollapsibleSection
          title="Conversas Diretas"
          icon={<MessageCircle className="h-4 w-4" />}
          count={filteredDMs.length}
          isOpen={showDMs}
          onToggle={() => setShowDMs(!showDMs)}
        >
          {filteredDMs.length > 0 ? (
            filteredDMs.map((room) => {
              const isSelected = selectedRoom?.id === room.id
              const unreadCount = unreadCounts[room.id] || 0
              const lastMessage = lastMessages[room.id]

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
        </CollapsibleSection>
      </ScrollArea>

      {/* Modal de Criar Grupo de Projeto */}
      <CreateProjectGroupModal
        open={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onCreateGroup={async (data) => {
          await createProjectGroup(data)
        }}
      />
    </div>
  )
}
