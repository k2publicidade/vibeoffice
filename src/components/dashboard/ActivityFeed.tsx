'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, MessageSquare, FileText, Users, Clock } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'

interface ActivityItem {
  id: string
  type: 'task' | 'ticket' | 'message' | 'user'
  title: string
  user: {
    name: string
    avatar?: string
  }
  timestamp: Date
}

export function ActivityFeed() {
  const { users } = useUsers()
  const { tasks } = useTasks()
  const { tickets } = useTickets()

  // Gerar atividades simuladas (memoizado para evitar recalcular a cada render)
  const activities: ActivityItem[] = useMemo(() => {
    if (!users || !tasks || !tickets) return []

    const now = Date.now()
    const mapUser = (u: typeof users[0]) => ({
      ...u,
      avatar: u.avatar ?? undefined,
    })
    return [
      ...(tasks || []).slice(0, 2).map((task, index) => ({
        id: task.id,
        type: 'task' as const,
        title: `Tarefa "${task.title}" foi concluída`,
        user: mapUser(users.find(u => u.id === task.assignedTo) || users[0]),
        timestamp: new Date(now - (index + 1) * 3600000), // 1h, 2h atrás
      })),
      ...(tickets || []).slice(0, 2).map((ticket, index) => ({
        id: ticket.id,
        type: 'ticket' as const,
        title: `Ticket "${ticket.title}" foi criado`,
        user: mapUser(users.find(u => u.id === ticket.createdBy) || users[0]),
        timestamp: new Date(now - (index + 3) * 3600000), // 3h, 4h atrás
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
  }, [users, tasks, tickets])

  const activityIcons = {
    task: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    ticket: <FileText className="h-4 w-4 text-blue-500" />,
    message: <MessageSquare className="h-4 w-4 text-orange-500" />,
    user: <Users className="h-4 w-4 text-orange-500" />,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>
          Últimas ações no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const initials = activity.user.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()

            const timeAgo = Math.floor(
              (Date.now() - activity.timestamp.getTime()) / 60000
            )
            const timeLabel = timeAgo < 60
              ? `${timeAgo}m atrás`
              : timeAgo < 1440
              ? `${Math.floor(timeAgo / 60)}h atrás`
              : `${Math.floor(timeAgo / 1440)}d atrás`

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user.name}</span>
                    {' '}
                    {activity.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activityIcons[activity.type]}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeLabel}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
