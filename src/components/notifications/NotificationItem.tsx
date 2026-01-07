'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { Notification } from '@/types/notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import {
  CheckSquare,
  Ticket,
  MessageSquare,
  RefreshCw,
  Plus,
  AtSign,
  Bell,
} from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
}

// Mapa de ícones por tipo de notificação
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

// Cores de ícones por prioridade
const priorityColors = {
  low: 'text-blue-500',
  medium: 'text-orange-500',
  high: 'text-red-500',
} as const

// Helper para obter link de redirecionamento baseado na notificação
function getNotificationLink(notif: Notification): string | null {
  switch (notif.entity_type) {
    case 'task':
      return notif.entity_id ? `/tasks?open=${notif.entity_id}` : null
    case 'ticket':
      return notif.entity_id ? `/tickets?open=${notif.entity_id}` : null
    case 'message':
      return notif.metadata?.roomId ? `/chat?room=${notif.metadata.roomId}` : null
    default:
      return null
  }
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead } = useNotifications()
  const router = useRouter()

  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Bell
  const iconColor = priorityColors[notification.priority as keyof typeof priorityColors] || 'text-gray-500'

  const handleClick = async () => {
    try {
      // Marcar como lida
      if (!notification.read) {
        await markAsRead(notification.id)
      }

      // Redirecionar para entidade
      const link = getNotificationLink(notification)
      if (link) {
        router.push(link)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Não redireciona se falhou
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3",
        !notification.read && "bg-muted/30"
      )}
    >
      {/* Ícone */}
      <div className={cn("flex-shrink-0 mt-1", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              notification.read && "opacity-60"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
          )}
        </div>

        <p
          className={cn(
            "text-xs text-muted-foreground line-clamp-2",
            notification.read && "opacity-60"
          )}
        >
          {notification.message}
        </p>

        <p className="text-xs text-muted-foreground opacity-50">
          {timeAgo}
        </p>
      </div>
    </button>
  )
}
