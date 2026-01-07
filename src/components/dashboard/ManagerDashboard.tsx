'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  Ticket,
  CheckSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  Calendar,
  Target,
  UserCheck,
  AlertCircle,
  BarChart2,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { useCalendar } from '@/hooks/useCalendar'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'

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

interface ManagerDashboardProps {
  userName: string
  userSector: string
}

export function ManagerDashboard({ userName, userSector }: ManagerDashboardProps) {
  const { users, isLoading: usersLoading } = useUsers()
  const { tasks, isLoading: tasksLoading } = useTasks()
  const { tickets, isLoading: ticketsLoading } = useTickets()
  const { events, isLoading: eventsLoading } = useCalendar()

  const isLoading = usersLoading || tasksLoading || ticketsLoading || eventsLoading

  // Membros do setor
  const teamMembers = useMemo(() => {
    return users?.filter(u => u.sector === userSector) || []
  }, [users, userSector])

  const teamMemberIds = useMemo(() => teamMembers.map(m => m.id), [teamMembers])

  // Estatísticas do setor
  const stats = useMemo(() => {
    if (!tasks || !tickets || !events) {
      return {
        totalMembers: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        taskCompletionRate: 0,
        openTickets: 0,
        upcomingEvents: 0,
      }
    }

    // Tarefas do setor
    const sectorTasks = tasks.filter(t => t.assignedTo && teamMemberIds.includes(t.assignedTo))
    const completedTasks = sectorTasks.filter(t => t.status === 'done').length
    const inProgressTasks = sectorTasks.filter(t => t.status === 'in_progress').length
    const overdueTasks = sectorTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false
      return new Date(t.dueDate) < new Date()
    }).length

    // Tickets do setor
    const sectorTickets = tickets.filter(t =>
      t.category === userSector || teamMemberIds.includes(t.requester)
    )
    const openTickets = sectorTickets.filter(t => t.status !== 'completed').length

    // Eventos do setor
    const now = new Date()
    const weekEnd = addDays(now, 7)
    const upcomingEventsCount = events.filter(e => {
      const eventDate = new Date(e.startTime)
      return eventDate >= now && eventDate <= weekEnd &&
        (e.type === 'sector' || e.attendees.some(a => teamMemberIds.includes(a)))
    }).length

    return {
      totalMembers: teamMembers.length,
      totalTasks: sectorTasks.length,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      taskCompletionRate: sectorTasks.length > 0
        ? Math.round((completedTasks / sectorTasks.length) * 100)
        : 0,
      openTickets,
      upcomingEvents: upcomingEventsCount,
    }
  }, [tasks, tickets, events, teamMemberIds, teamMembers.length, userSector])

  // Performance individual da equipe
  const teamPerformance = useMemo(() => {
    if (!tasks) return []

    return teamMembers.map(member => {
      const memberTasks = tasks.filter(t => t.assignedTo === member.id)
      const completed = memberTasks.filter(t => t.status === 'done').length
      const total = memberTasks.length
      const overdue = memberTasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false
        return new Date(t.dueDate) < new Date()
      }).length

      return {
        ...member,
        tasksCompleted: completed,
        tasksTotal: total,
        tasksOverdue: overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    }).sort((a, b) => b.completionRate - a.completionRate)
  }, [tasks, teamMembers])

  // Tarefas recentes do setor
  const recentTasks = useMemo(() => {
    if (!tasks) return []

    return tasks
      .filter(t => t.assignedTo && teamMemberIds.includes(t.assignedTo) && t.status !== 'done')
      .sort((a, b) => {
        // Priorizar por data de vencimento
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      .slice(0, 5)
  }, [tasks, teamMemberIds])

  // Próximos eventos do setor
  const upcomingEvents = useMemo(() => {
    if (!events) return []

    const now = new Date()
    return events
      .filter(e => {
        const eventDate = new Date(e.startTime)
        return eventDate >= now &&
          (e.type === 'sector' || e.attendees.some(a => teamMemberIds.includes(a)))
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 4)
  }, [events, teamMemberIds])

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje'
    if (isTomorrow(date)) return 'Amanhã'
    return format(date, "EEE, d MMM", { locale: ptBR })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#fc7a67]" />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Dashboard do Setor
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Olá, {userName}. Gerencie sua equipe de <span className="text-[#fc7a67]">{userSector}</span>.
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-4 py-1">
          <Briefcase className="h-3 w-3 mr-1" />
          Gerente
        </Badge>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#fc7a67]/10 to-[#ff0300]/5 border-[#fc7a67]/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#fc7a67]">Equipe</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalMembers}</p>
                <p className="text-xs text-gray-500 mt-1">membros ativos</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#fc7a67]/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-[#fc7a67]" />
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
                <p className="text-xs text-gray-500 mt-1">
                  {stats.completedTasks}/{stats.totalTasks} tarefas
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400">Em Progresso</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.inProgressTasks}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.overdueTasks > 0 && (
                    <span className="text-red-400">{stats.overdueTasks} atrasadas</span>
                  )}
                  {stats.overdueTasks === 0 && 'tarefas ativas'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400">Eventos</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.upcomingEvents}</p>
                <p className="text-xs text-gray-500 mt-1">próximos 7 dias</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance da Equipe */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-[#0a0a0a] border-[#262626]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart2 className="h-5 w-5 text-[#fc7a67]" />
                Performance da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {teamPerformance.map((member, index) => (
                    <div key={member.id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar ?? undefined} />
                          <AvatarFallback className="bg-[#fc7a67] text-black text-sm">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white truncate">
                              {member.name}
                            </p>
                            <div className="flex items-center gap-2">
                              {member.tasksOverdue > 0 && (
                                <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-400 border-0">
                                  {member.tasksOverdue} atrasada{member.tasksOverdue > 1 ? 's' : ''}
                                </Badge>
                              )}
                              <span className={cn(
                                "text-sm font-medium",
                                member.completionRate >= 70 ? "text-green-500" :
                                member.completionRate >= 40 ? "text-yellow-500" : "text-red-500"
                              )}>
                                {member.completionRate}%
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {member.tasksCompleted}/{member.tasksTotal} tarefas concluídas
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={member.completionRate}
                        className="h-1.5 bg-[#1a1a1a]"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Próximos Eventos */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-purple-500" />
                Agenda do Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-center min-w-[50px]">
                          <p className="text-xs text-purple-400">
                            {getDateLabel(new Date(event.startTime))}
                          </p>
                          <p className="text-lg font-bold text-white">
                            {format(new Date(event.startTime), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.attendees.length} participantes
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhum evento agendado</p>
                  </div>
                )}
              </div>
              <Button variant="outline" className="w-full mt-4 border-[#262626]" asChild>
                <Link href="/calendar">Ver calendário</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tarefas Pendentes */}
      <motion.div variants={itemVariants}>
        <Card className="bg-[#0a0a0a] border-[#262626]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckSquare className="h-5 w-5 text-[#fc7a67]" />
              Tarefas Pendentes do Setor
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks" className="text-gray-400 hover:text-white">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => {
                  const assignee = users?.find(u => u.id === task.assignedTo)
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-4 rounded-lg bg-[#1a1a1a] border transition-colors",
                        isOverdue ? "border-red-500/30" : "border-[#262626]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white line-clamp-2">
                          {task.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs flex-shrink-0",
                            task.priority === 'high' ? "border-red-500/50 text-red-400" :
                            task.priority === 'medium' ? "border-yellow-500/50 text-yellow-400" :
                            "border-green-500/50 text-green-400"
                          )}
                        >
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee?.avatar ?? undefined} />
                            <AvatarFallback className="bg-[#262626] text-xs">
                              {assignee?.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-500 truncate max-w-[80px]">
                            {assignee?.name.split(' ')[0]}
                          </span>
                        </div>
                        {task.dueDate && (
                          <span className={cn(
                            "text-xs",
                            isOverdue ? "text-red-400" : "text-gray-500"
                          )}>
                            {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
                            {format(new Date(task.dueDate), 'dd/MM')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-8">
                  <CheckSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Todas as tarefas concluídas!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
