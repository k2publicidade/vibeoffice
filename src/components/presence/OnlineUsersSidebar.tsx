'use client'

import { usePresence } from '@/hooks/usePresence'
import { useUsers } from '@/hooks/useUsers'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Circle } from 'lucide-react'

export function OnlineUsersSidebar() {
  const { onlineUsers } = usePresence()
  const { users } = useUsers()

  const onlineUsersList = users?.filter(u => onlineUsers.includes(u.id)) || []

  return (
    <div className="p-4 border-t border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-semibold text-zinc-400">
          Online agora ({onlineUsersList.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {onlineUsersList.length > 0 ? (
          onlineUsersList.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user.sector}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-500 text-center py-4">
            Nenhum usuário online
          </p>
        )}
      </div>
    </div>
  )
}
