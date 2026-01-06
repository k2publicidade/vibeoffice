'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { useUsers } from '@/hooks/useUsers'

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
  const { tasks } = useTasks()
  const { tickets } = useTickets()
  const { users } = useUsers()

  // Calcular estatísticas (memoizado para evitar recalcular a cada render)
  const stats = useMemo(() => {
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
    const taskCompletionRate = tasks && tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0
    const openTickets = tickets?.filter(t => t.status === 'open').length || 0
    const totalMessages = 0 // TODO: quando chat tiver contadores reais
    const activeUsers = users?.length || 0

    // Tendências fixas para consistência
    const taskTrend = 12
    const ticketTrend = 8

    return { completedTasks, taskCompletionRate, openTickets, totalMessages, activeUsers, taskTrend, ticketTrend }
  }, [tasks, tickets, users])

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
