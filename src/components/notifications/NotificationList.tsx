'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, Bell } from 'lucide-react'
import Link from 'next/link'

export function NotificationList() {
  const {
    notifications,
    loading,
    markAllAsRead,
  } = useNotifications()

  return (
    <div className="w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Notificações</h3>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs h-7"
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Lista */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação ainda
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.slice(0, 20).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t text-center">
          <Link
            href="/settings/notifications"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Configurar notificações
          </Link>
        </div>
      )}
    </div>
  )
}
