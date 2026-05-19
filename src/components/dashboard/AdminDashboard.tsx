'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  Loader2,
  ShieldAlert,
  Target,
  Ticket,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { useCalendar } from '@/hooks/useCalendar'
import { cn } from '@/lib/utils'
import { addDays, differenceInHours, endOfWeek, format, isSameDay, isWithinInterval, startOfDay, startOfWeek } from 'date-fns'
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

const statusLabels = {
  todo: 'A fazer',
  in_progress: 'Em progresso',
  done: 'Concluída',
  open: 'Aberto',
  analyzing: 'Em análise',
  completed: 'Concluído',
}

interface AdminDashboardProps {
  userName: string
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string
  value: string | number
  detail: string
  icon: typeof Users
  tone: 'orange' | 'blue' | 'green' | 'yellow' | 'red'
}) {
  const tones = {
    orange: 'from-[#fc7a67]/15 to-[#ff0300]/5 border-[#fc7a67]/25 text-[#fc7a67] bg-[#fc7a67]/15',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400 bg-blue-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400 bg-green-500/20',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400 bg-yellow-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-400 bg-red-500/20',
  }[tone]
  const [gradient, text, bg] = [tones.split(' ').slice(0, 3).join(' '), tones.split(' ')[3], tones.split(' ')[4]]

  return (
    <Card className={cn('bg-gradient-to-br', gradient)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={cn('text-sm', text)}>{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{detail}</p>
          </div>
          <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', bg)}>
            <Icon className={cn('h-6 w-6', text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type CollaboratorPerformance = {
  id: string
  name: string
  role: string
  sector: string
  avatar?: string | null
  completionRate: number
  completed: number
  total: number
  active: number
  sectorShare: number
  completedDays: boolean[]
}

function CollaboratorPerformanceCard({ collaborator }: { collaborator: CollaboratorPerformance }) {
  const circumference = 2 * Math.PI * 54
  const progressOffset = circumference * (1 - collaborator.completionRate / 100)
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <Card className="overflow-hidden rounded-3xl border-[#262626] bg-[#1d1d1d] shadow-2xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-[#fc7a67]/30">
                <AvatarImage src={collaborator.avatar ?? undefined} />
                <AvatarFallback className="bg-[#fc7a67] text-black text-xs font-bold">
                  {initials(collaborator.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{collaborator.name}</p>
                <p className="truncate text-xs text-gray-500">{collaborator.role} • {collaborator.sector}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <span className="text-5xl font-black leading-none tracking-tight text-white">{collaborator.completionRate}%</span>
              <span className="text-sm font-medium text-gray-500">semana</span>
            </div>
          </div>

          <div className="relative h-36 w-36 shrink-0">
            <svg className="h-full w-full -rotate-90 drop-shadow-2xl" viewBox="0 0 140 140" aria-label={`Desempenho semanal de ${collaborator.name}: ${collaborator.completionRate}%`}>
              <circle cx="70" cy="70" r="54" stroke="#2a2a2a" strokeWidth="14" fill="none" />
              <circle
                cx="70"
                cy="70"
                r="54"
                stroke="#fc7a67"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{collaborator.completed}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">concluídas</span>
              <div className="mt-2 h-1 w-8 rounded-full bg-[#2a2a2a]" />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xl font-black text-white" aria-label={`${collaborator.completed} de ${collaborator.total} tarefas concluídas`}>{collaborator.completed}<span className="text-base text-gray-600">/{collaborator.total}</span></p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Concluídas</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">{collaborator.active}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ativas</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">{collaborator.sectorShare}%</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Do setor</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {weekDays.map((day, index) => (
            <div key={`${day}-${index}`} className="flex flex-1 flex-col items-center gap-2">
              <div className={cn('h-2 w-full rounded-full transition-colors', collaborator.completedDays[index] ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]' : 'bg-[#2a2a2a]')} />
              <span className={cn('text-[10px] font-bold', collaborator.completedDays[index] ? 'text-white' : 'text-gray-600')}>{day}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-[#2a2a2a] pt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-full bg-[#fc7a67]" />
              <span className="truncate">{collaborator.sector}</span>
            </span>
            <span className="font-bold text-white">{collaborator.total} tarefas</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#121212]">
            <div className="h-full rounded-full bg-[#fc7a67]" style={{ width: `${collaborator.completionRate}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminDashboard({ userName }: AdminDashboardProps) {
  const { users, isLoading: usersLoading } = useUsers()
  const { tasks, isLoading: tasksLoading } = useTasks()
  const { tickets, isLoading: ticketsLoading } = useTickets()
  const { events, isLoading: eventsLoading } = useCalendar()

  const isLoading = usersLoading || tasksLoading || ticketsLoading || eventsLoading

  const dashboard = useMemo(() => {
    const now = new Date()
    const activeUsers = users ?? []
    const completedTasks = tasks.filter((task) => task.status === 'done')
    const activeTasks = tasks.filter((task) => task.status !== 'done')
    const overdueTasks = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false
      return startOfDay(new Date(task.dueDate)) < startOfDay(now)
    })
    const highPriorityTasks = tasks.filter((task) => task.priority === 'high' && task.status !== 'done')
    const openTickets = tickets.filter((ticket) => ticket.status !== 'completed')
    const highPriorityTickets = tickets.filter((ticket) => ticket.priority === 'high' && ticket.status !== 'completed')
    const upcomingEvents = events
      .filter((event) => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    const isThisWeekDate = (date?: Date | string | null) => {
      if (!date) return false
      return isWithinInterval(new Date(date), { start: weekStart, end: weekEnd })
    }

    const usersBySector = activeUsers.reduce((acc, user) => {
      acc[user.sector] = (acc[user.sector] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const usersByRole = activeUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sectorStats = Object.entries(usersBySector).map(([sector, memberCount]) => {
      const sectorMembers = activeUsers.filter((user) => user.sector === sector)
      const sectorMemberIds = new Set(sectorMembers.map((user) => user.id))
      const sectorTasks = tasks.filter(
        (task) => task.sector === sector || task.assignees.some((id) => sectorMemberIds.has(id))
      )
      const sectorTickets = tickets.filter(
        (ticket) => ticket.category === sector || sectorMemberIds.has(ticket.requester) || Boolean(ticket.assignedTo && sectorMemberIds.has(ticket.assignedTo))
      )
      const sectorCompleted = sectorTasks.filter((task) => task.status === 'done').length
      const sectorOpenTickets = sectorTickets.filter((ticket) => ticket.status !== 'completed').length
      const completionRate = sectorTasks.length > 0 ? Math.round((sectorCompleted / sectorTasks.length) * 100) : 0

      return {
        sector,
        memberCount,
        taskCount: sectorTasks.length,
        completed: sectorCompleted,
        openTickets: sectorOpenTickets,
        completionRate,
      }
    }).sort((a, b) => b.taskCount + b.openTickets - (a.taskCount + a.openTickets))

    const recentUsers = [...activeUsers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)

    const criticalItems = [
      ...overdueTasks.map((task) => ({
        id: task.id,
        title: task.title,
        kind: 'Tarefa atrasada',
        detail: task.dueDate ? format(new Date(task.dueDate), 'dd/MM', { locale: ptBR }) : 'Sem prazo',
        tone: 'text-red-400',
        href: '/tasks',
      })),
      ...highPriorityTickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        kind: 'Ticket crítico',
        detail: ticket.category,
        tone: 'text-yellow-400',
        href: '/tickets',
      })),
    ].slice(0, 6)

    const activityFeed = [
      ...tasks.slice(0, 5).map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        meta: `${statusLabels[task.status]} • ${task.sector}`,
        date: new Date(task.updatedAt ?? task.createdAt ?? now),
        href: '/tasks',
      })),
      ...tickets.slice(0, 5).map((ticket) => ({
        id: `ticket-${ticket.id}`,
        title: ticket.title,
        meta: `${statusLabels[ticket.status]} • ${ticket.category}`,
        date: new Date(ticket.updatedAt ?? ticket.createdAt ?? now),
        href: '/tickets',
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6)

    const ticketFunnel = [
      { label: 'Abertos', count: tickets.filter((ticket) => ticket.status === 'open').length, color: 'bg-blue-500' },
      { label: 'Em análise', count: tickets.filter((ticket) => ticket.status === 'analyzing').length, color: 'bg-yellow-500' },
      { label: 'Em progresso', count: tickets.filter((ticket) => ticket.status === 'in_progress').length, color: 'bg-orange-500' },
      { label: 'Concluídos', count: tickets.filter((ticket) => ticket.status === 'completed').length, color: 'bg-green-500' },
    ]

    const collaborators = activeUsers.filter((user) => user.role.toLowerCase() !== 'admin')
    const collaboratorPerformance = collaborators.map((collaborator) => {
      const assignedTasks = tasks.filter((task) => task.assignees.includes(collaborator.id))
      const weeklyTasks = assignedTasks.filter(
        (task) => isThisWeekDate(task.dueDate) || isThisWeekDate(task.updatedAt) || isThisWeekDate(task.createdAt)
      )
      const completedWeeklyTasks = weeklyTasks.filter((task) => task.status === 'done')
      const activeWeeklyTasks = weeklyTasks.filter((task) => task.status !== 'done')
      const sectorWeeklyTotal = tasks.filter(
        (task) => task.sector === collaborator.sector && (isThisWeekDate(task.dueDate) || isThisWeekDate(task.updatedAt) || isThisWeekDate(task.createdAt))
      ).length

      return {
        id: collaborator.id,
        name: collaborator.name,
        role: collaborator.role,
        sector: collaborator.sector,
        avatar: collaborator.avatar,
        completionRate: weeklyTasks.length > 0 ? Math.round((completedWeeklyTasks.length / weeklyTasks.length) * 100) : 0,
        completed: completedWeeklyTasks.length,
        total: weeklyTasks.length,
        active: activeWeeklyTasks.length,
        sectorShare: sectorWeeklyTotal > 0 ? Math.round((weeklyTasks.length / sectorWeeklyTotal) * 100) : 0,
        completedDays: weekDays.map((day) => completedWeeklyTasks.some((task) => isSameDay(new Date(task.updatedAt ?? now), day))),
      }
    }).sort((a, b) => b.completionRate - a.completionRate || b.completed - a.completed || b.total - a.total)

    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
    const operationalHealth = Math.max(0, Math.min(100, completionRate + 10 - overdueTasks.length * 3 - highPriorityTickets.length * 2 + upcomingEvents.slice(0, 7).length))

    return {
      totalUsers: activeUsers.length,
      managers: (usersByRole.Gerente || 0) + (usersByRole.gerente || 0),
      admins: (usersByRole.Admin || 0) + (usersByRole.admin || 0),
      completionRate,
      activeTasks: activeTasks.length,
      overdueTasks,
      highPriorityTasks,
      openTickets,
      totalTickets: tickets.length,
      highPriorityTickets,
      upcomingEvents,
      sectorStats,
      recentUsers,
      criticalItems,
      activityFeed,
      ticketFunnel,
      collaboratorPerformance,
      operationalHealth,
    }
  }, [users, tasks, tickets, events])

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
      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Painel Administrativo</h1>
          <p className="text-sm md:text-base text-gray-400">
            Bem-vindo, {userName}. Dados reais de equipe, tarefas, tickets e agenda da empresa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white border-0 px-4 py-1">
            <Building2 className="h-3 w-3 mr-1" /> Admin
          </Badge>
          <Button asChild size="sm" className="bg-white text-black hover:bg-white/90">
            <Link href="/admin/avisos">Gerenciar avisos</Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Total Usuários" value={dashboard.totalUsers} detail={`${dashboard.managers} gerentes • ${dashboard.admins} admins`} icon={Users} tone="blue" />
        <KpiCard title="Saúde operacional" value={`${dashboard.operationalHealth}%`} detail="conclusão, atrasos e críticos" icon={Activity} tone="orange" />
        <KpiCard title="Conclusão" value={`${dashboard.completionRate}%`} detail={`${dashboard.activeTasks} tarefas ativas`} icon={Target} tone="green" />
        <KpiCard title="Tickets" value={dashboard.totalTickets} detail={`${dashboard.openTickets.length} abertos • ${dashboard.highPriorityTickets.length} alta prioridade`} icon={Ticket} tone="yellow" />
        <KpiCard title="Atrasos" value={dashboard.overdueTasks.length} detail={`${dashboard.highPriorityTasks.length} tarefas críticas`} icon={ShieldAlert} tone="red" />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fc7a67]">Colaboradores</p>
            <h2 className="text-xl font-bold text-white md:text-2xl">Desempenho semanal</h2>
            <p className="text-sm text-gray-500">Cards com gráfico circular de conclusão, atividade e tarefas da semana por colaborador.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tasks" className="text-gray-400 hover:text-white">
              Ver tarefas <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {dashboard.collaboratorPerformance.slice(0, 6).map((collaborator) => (
            <CollaboratorPerformanceCard key={collaborator.id} collaborator={collaborator} />
          ))}
          {dashboard.collaboratorPerformance.length === 0 && (
            <Card className="border-[#262626] bg-[#0a0a0a]">
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">Nenhum colaborador com tarefas nesta semana.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-[#fc7a67]" />
                Operação por setor
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks" className="text-gray-400 hover:text-white">
                  Ver tarefas <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {dashboard.sectorStats.map((sector) => (
                  <div key={sector.sector} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{sector.sector}</span>
                        <Badge variant="outline" className="text-xs border-[#262626] text-gray-400">
                          {sector.memberCount} membros
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{sector.completed}/{sector.taskCount} tarefas</span>
                        <span>{sector.openTickets} tickets</span>
                        <span className={cn('font-semibold', sector.completionRate >= 70 ? 'text-green-400' : sector.completionRate >= 40 ? 'text-yellow-400' : 'text-red-400')}>
                          {sector.completionRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', sector.completionRate >= 70 ? 'bg-green-500' : sector.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
                        style={{ width: `${sector.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
                {dashboard.sectorStats.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-6">Nenhum setor com dados ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Atenção imediata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] pr-3">
                <div className="space-y-3">
                  {dashboard.criticalItems.map((item) => (
                    <Link key={item.id} href={item.href} className="block p-3 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#fc7a67]/40 transition-colors">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className={item.tone}>{item.kind}</span>
                        <span className="text-gray-500">{item.detail}</span>
                      </div>
                    </Link>
                  ))}
                  {dashboard.criticalItems.length === 0 && (
                    <div className="text-center py-10">
                      <CheckSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhum item crítico</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Ticket className="h-5 w-5 text-[#fc7a67]" />
                Funil de tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.ticketFunnel.map((stage) => {
                const max = Math.max(...dashboard.ticketFunnel.map((item) => item.count), 1)
                return (
                  <div key={stage.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{stage.label}</span>
                      <span className="font-semibold text-white">{stage.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                      <div className={cn('h-full rounded-full', stage.color)} style={{ width: `${(stage.count / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
              <Button variant="outline" className="w-full border-[#262626]" asChild>
                <Link href="/tickets">Abrir tickets</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-[#fc7a67]" />
                Agenda da empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.upcomingEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#262626]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(event.startTime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-[#262626] text-gray-400 text-xs shrink-0">
                        {differenceInHours(new Date(event.startTime), new Date()) < 24 ? 'Hoje' : event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {dashboard.upcomingEvents.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhum evento futuro.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#262626] h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-[#fc7a67]" />
                Atividade recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.activityFeed.map((item) => (
                  <Link key={item.id} href={item.href} className="block p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span className="truncate">{item.meta}</span>
                      <span>{format(item.date, 'dd/MM')}</span>
                    </div>
                  </Link>
                ))}
                {dashboard.activityFeed.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">Sem movimentações ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="bg-[#0a0a0a] border-[#262626]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-[#fc7a67]" />
              Membros recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {dashboard.recentUsers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#262626]">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar ?? undefined} />
                    <AvatarFallback className="bg-[#fc7a67] text-black font-semibold">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.sector}</p>
                  </div>
                  <Badge variant="outline" className="border-[#262626] text-gray-400 text-xs">
                    {member.role}
                  </Badge>
                </div>
              ))}
              {dashboard.recentUsers.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum usuário cadastrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
