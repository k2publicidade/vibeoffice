'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useNotifications, type Notification } from '@/hooks/useNotifications'
import { Bell, CheckSquare, Ticket, MessageSquare, RefreshCw, Plus, AtSign, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const notificationIcons = {
  task_assigned: CheckSquare,
  task_status_changed: RefreshCw,
  task_comment_added: MessageSquare,
  task_due_soon: Bell,
  ticket_created: Plus,
  ticket_assigned: Ticket,
  ticket_status_changed: RefreshCw,
  ticket_comment_added: MessageSquare,
  message_received: MessageSquare,
  mentioned_in_chat: AtSign,
  announcement: Bell,
} as const

const priorityColors = {
  low: 'text-blue-500',
  medium: 'text-orange-500',
  high: 'text-red-500',
} as const

function getNotificationLink(notification: Notification): string | null {
  switch (notification.entity_type) {
    case 'task':
      return notification.entity_id ? `/tasks?open=${notification.entity_id}` : null
    case 'ticket':
      return notification.entity_id ? `/tickets?open=${notification.entity_id}` : null
    case 'message':
      // metadata é Json (pode ser null, object, array, etc)
      const metadata = notification.metadata as Record<string, any> | null
      return metadata?.roomId ? `/chat?room=${metadata.roomId}` : null
    default:
      return null
  }
}

export function NotificationToast() {
  const { notifications } = useNotifications()
  const router = useRouter()
  const displayedNotificationsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Procurar notificações não lidas que ainda não foram exibidas
    const unreadNotifications = notifications
      .filter(n => !n.read && !displayedNotificationsRef.current.has(n.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Exibir apenas a mais recente por vez
    if (unreadNotifications.length > 0) {
      const latestUnread = unreadNotifications[0]

      // Marcar como exibida
      displayedNotificationsRef.current.add(latestUnread.id)

      const Icon = notificationIcons[latestUnread.type as keyof typeof notificationIcons] || Bell
      const iconColor = priorityColors[latestUnread.priority as keyof typeof priorityColors] || 'text-gray-500'

      // Exibir toast premium
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t)
              const link = getNotificationLink(latestUnread)
              if (link) {
                router.push(link)
              }
            }}
            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 backdrop-blur-lg border border-purple-500/20 rounded-xl p-4 shadow-2xl cursor-pointer hover:scale-105 transition-all duration-200 max-w-md"
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-1", iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground mb-1">
                  {latestUnread.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {latestUnread.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast.dismiss(t)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
        }
      )
    }
  }, [notifications, router])

  return null // Este componente não renderiza nada
}
