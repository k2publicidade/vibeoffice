'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'

export function NotificationList() {
  const { notifications, loading, markAllAsRead } = useNotifications()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header Sticky */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Notificações</h3>
        {notifications.some(n => !n.read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-8 text-xs"
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Lista de notificações */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Você está em dia com tudo!
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
