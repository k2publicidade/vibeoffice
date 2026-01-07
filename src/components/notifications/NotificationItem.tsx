'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNotifications, type Notification } from '@/hooks/useNotifications'

interface NotificationItemProps {
  notification: Notification
}

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  normal: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

const priorityLabels = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter()
  const { markAsRead, archiveNotification } = useNotifications()

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id)
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    archiveNotification(notification.id)
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer',
        !notification.read && 'bg-accent/30'
      )}
      onClick={handleClick}
    >
      {/* Indicador de prioridade */}
      <div
        className={cn(
          'w-1 h-full rounded-full flex-shrink-0',
          priorityColors[notification.priority]
        )}
      />

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            'text-sm font-medium line-clamp-1',
            !notification.read && 'font-semibold'
          )}>
            {notification.title}
          </h4>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0',
              priorityColors[notification.priority]
            )}
          >
            {priorityLabels[notification.priority]}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {timeAgo}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onClick={handleArchive}
            title="Arquivar notificação"
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Indicador de não lida */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
      )}
    </div>
  )
}
