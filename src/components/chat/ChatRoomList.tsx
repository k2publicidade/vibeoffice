'use client'

import { ChatRoom } from '@/types/chat'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, Users } from 'lucide-react'

interface ChatRoomListProps {
  rooms: ChatRoom[]
  selectedRoom: ChatRoom | null
  onSelectRoom: (room: ChatRoom) => void
}

const typeIcons = {
  sector: MessageSquare,
  dm: Users,
}

const typeLabels = {
  sector: 'Setor',
  dm: 'DM',
}

export function ChatRoomList({ rooms, selectedRoom, onSelectRoom }: ChatRoomListProps) {
  // Agrupar por tipo
  const sectorRooms = rooms.filter(r => r.type === 'sector')
  const dmRooms = rooms.filter(r => r.type === 'dm')

  return (
    <div className="w-full h-full flex flex-col bg-muted/30 border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Mensagens</h2>
        <p className="text-xs text-muted-foreground">
          {rooms.length} salas
        </p>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {/* Sector Rooms */}
        {sectorRooms.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Setores
            </h3>
            {sectorRooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isSelected={selectedRoom?.id === room.id}
                onSelect={() => onSelectRoom(room)}
              />
            ))}
          </div>
        )}

        {/* DM Rooms */}
        {dmRooms.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Mensagens Diretas
            </h3>
            {dmRooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isSelected={selectedRoom?.id === room.id}
                onSelect={() => onSelectRoom(room)}
              />
            ))}
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma sala disponível
          </div>
        )}
      </div>
    </div>
  )
}

interface RoomItemProps {
  room: ChatRoom
  isSelected: boolean
  onSelect: () => void
}

function RoomItem({ room, isSelected, onSelect }: RoomItemProps) {
  const Icon = typeIcons[room.type]
  const label = typeLabels[room.type]

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
        isSelected
          ? 'bg-primary text-white'
          : 'hover:bg-muted text-foreground'
      }`}
    >
      <Avatar className={`h-8 w-8 ${isSelected ? 'bg-white/20' : 'bg-muted'}`}>
        <AvatarFallback className={`text-xs ${isSelected ? 'text-white' : 'text-foreground'}`}>
          {room.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate">{room.name}</p>
        <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
          {room.participants.length} participantes
        </p>
      </div>

      <Badge
        variant={isSelected ? 'secondary' : 'outline'}
        className="flex-shrink-0 text-xs gap-1"
      >
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    </button>
  )
}
