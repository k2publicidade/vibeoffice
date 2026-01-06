'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  Ticket,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertTriangle,
  Clock,
  ArrowRight,
  BarChart3,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { mockUsers, mockTasks, mockTickets, mockCalendarEvents } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

interface AdminDashboardProps {
  userName: string
}

export function AdminDashboard({ userName }: AdminDashboardProps) {
  const stats = useMemo(() => {
    // Contagem de usuários por setor
    const usersBySector = mockUsers.reduce((acc, user) => {
      acc[user.sector] = (acc[user.sector] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Contagem de usuários por role
    const usersByRole = mockUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Tasks
    const totalTasks = mockTasks.length
    const completedTasks = mockTasks.filter(t => t.status === 'done').length
    const overdueTasks = mockTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false
      return new Date(t.dueDate) < new Date()
    }).length

    // Tickets
    const totalTickets = mockTickets.length
    const openTickets = mockTickets.filter(t => t.status === 'open').length
    const highPriorityTickets = mockTickets.filter(t => t.priority === 'high' && t.status !== 'completed').length

    // Eventos
    const upcomingEvents = mockCalendarEvents.filter(e => new Date(e.startTime) > new Date()).length

    return {
      totalUsers: mockUsers.length,
      usersBySector,
      usersByRole,
      totalTasks,
      completedTasks,
      overdueTasks,
      taskCompletionRate: Math.round((completedTasks / totalTasks) * 100),
      totalTickets,
      openTickets,
      highPriorityTickets,
      upcomingEvents,
    }
  }, [])

  // Top 5 setores com mais tarefas pendentes
  const sectorPerformance = useMemo(() => {
    const sectorStats = mockUsers.reduce((acc, user) => {
      if (!acc[user.sector]) {
        acc[user.sector] = { users: 0, tasks: 0, completed: 0 }
      }
      acc[user.sector].users++
      return acc
    }, {} as Record<string, { users: number; tasks: number; completed: number }>)

    mockTasks.forEach(task => {
      const user = mockUsers.find(u => u.id === task.assignedTo)
      if (user && sectorStats[user.sector]) {
        sectorStats[user.sector].tasks++
        if (task.status === 'done') {
          sectorStats[user.sector].completed++
        }
      }
    })

    return Object.entries(sectorStats)
      .map(([sector, data]) => ({
        sector,
        ...data,
        rate: data.tasks > 0 ? Math.round((data.completed / data.tasks) * 100) : 0,
      }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 5)
  }, [])

  // Tickets recentes de alta prioridade
  const urgentTickets = useMemo(() => {
    return mockTickets
      .filter(t => t.priority === 'high' && t.status !== 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
  }, [])

  // Novos usuários (últimos 30 dias)
  const recentUsers = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return mockUsers
      .filter(u => new Date(u.createdAt) > thirtyDaysAgo)
      .slice(0, 5)
  }, [])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-[90%] mx-auto py-6 md:py-8 space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Painel Administrativo
          </h1>
          <p className="text-gray-400">
            Bem-vindo, {userName}. Visão geral de toda a empresa.
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white border-0 px-4 py-1">
          <Building2 className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400">Total Usuários</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.usersByRole['Gerente'] || 0} gerentes
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400">Taxa de Conclusão</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.taskCompletionRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">+5% vs mês anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400">Tickets Abertos</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.openTickets}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.highPriorityTickets} alta prioridade
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Ticket className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-400">Tarefas Atrasadas</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.overdueTasks}</p>
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">Requer atenção</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Desempenho por Setor */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-[#0a0a0a] border-[#262626]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-[#fc7a67]" />
                Desempenho por Setor
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks" className="text-gray-400 hover:text-white">
                  Ver tarefas <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorPerformance.map((sector, index) => (
                  <div key={sector.sector} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{sector.sector}</span>
                        <Badge variant="outline" className="text-xs border-[#262626] text-gray-400">
                          {sector.users} membros
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">
                          {sector.completed}/{sector.tasks} tarefas
                        </span>
                        <span className={cn(
                          "text-sm font-medium",
                          sector.rate >= 70 ? "text-green-500" :
                          sector.rate >= 40 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {sector.rate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sector.rate}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className={cn(
                          "h-full rounded-full",
                          sector.rate >= 70 ? "bg-green-500" :
                          sector.rate >= 40 ? "bg-yellow-500" : "bg-red-500"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tickets Urgentes */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Tickets Urgentes
              </CardTitle>
              <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                {urgentTickets.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[240px]">
                <div className="space-y-3">
                  {urgentTickets.length > 0 ? (
                    urgentTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 rounded-lg bg-[#1a1a1a] border border-red-500/20 hover:border-red-500/40 transition-colors"
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {ticket.title}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">{ticket.category}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(ticket.createdAt), 'dd/MM', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhum ticket urgente</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <Button variant="outline" className="w-full mt-4 border-[#262626]" asChild>
                <Link href="/tickets">Ver todos os tickets</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usuários por Setor */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-[#fc7a67]" />
                Distribuição de Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(stats.usersBySector).map(([sector, count]) => (
                  <div
                    key={sector}
                    className="p-3 rounded-lg bg-[#1a1a1a] border border-[#262626]"
                  >
                    <p className="text-xs text-gray-500 truncate">{sector}</p>
                    <p className="text-xl font-bold text-white mt-1">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Novos Membros */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-[#fc7a67]" />
                Novos Membros
                <Badge variant="outline" className="ml-auto border-[#262626] text-gray-400">
                  Últimos 30 dias
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentUsers.length > 0 ? (
                  recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-[#fc7a67] text-black">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.sector}</p>
                      </div>
                      <Badge variant="outline" className="border-[#262626] text-gray-400 text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum novo membro
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
