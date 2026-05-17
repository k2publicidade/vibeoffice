'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Circle } from 'lucide-react'
import { usePresence } from '@/hooks/usePresence'
import { useUsers } from '@/hooks/useUsers'

/**
 * Popover que exibe contagem e lista de usuários online.
 * Substitui o uso do antigo OnlineUsersSidebar (acoplado ao Sidebar removido na rodada 1)
 * e é renderizado no TopNavigation.
 */
export function OnlineUsersPopover() {
  const { onlineUsers } = usePresence()
  const { users } = useUsers()

  const onlineUsersList = users?.filter((u) => onlineUsers.includes(u.id)) || []
  const count = onlineUsersList.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11"
          aria-label={`${count} usuários online`}
        >
          <Users className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold">Online agora ({count})</h3>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {onlineUsersList.length > 0 ? (
            <ul className="space-y-1">
              {onlineUsersList.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-800/50"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-xs text-white">
                        {u.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-emerald-500 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.sector}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhum usuário online
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
