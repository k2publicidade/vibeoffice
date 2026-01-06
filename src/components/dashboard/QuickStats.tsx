'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { mockTasks, mockTickets, mockChatRooms, mockUsers } from '@/lib/mock-data'

interface StatCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

function StatCard({ title, value, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${
                trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
              }`}>
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickStats() {
  // Calcular estatísticas (memoizado para evitar recalcular a cada render)
  const stats = useMemo(() => {
    const completedTasks = mockTasks.filter(t => t.status === 'done').length
    const taskCompletionRate = Math.round((completedTasks / mockTasks.length) * 100)
    const openTickets = mockTickets.filter(t => t.status === 'open').length
    const totalMessages = mockChatRooms.reduce((sum, room) => sum + (room.messageCount || 0), 0)
    const activeUsers = mockUsers.length

    // Tendências fixas para consistência
    const taskTrend = 12
    const ticketTrend = 8

    return { completedTasks, taskCompletionRate, openTickets, totalMessages, activeUsers, taskTrend, ticketTrend }
  }, [])

  const { taskCompletionRate, openTickets, totalMessages, activeUsers, taskTrend, ticketTrend } = stats

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Taxa de Conclusão"
        value={`${taskCompletionRate}%`}
        trend={{ value: taskTrend, direction: 'up' }}
      />
      <StatCard
        title="Tickets Abertos"
        value={openTickets}
        trend={{ value: ticketTrend, direction: 'down' }}
      />
      <StatCard
        title="Mensagens"
        value={totalMessages}
      />
      <StatCard
        title="Usuários Ativos"
        value={activeUsers}
      />
    </div>
  )
}
