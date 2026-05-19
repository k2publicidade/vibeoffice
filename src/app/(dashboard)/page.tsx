'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader'
import { MeetingCard } from '@/components/dashboard/MeetingCard'
import { EfficiencyCard } from '@/components/dashboard/EfficiencyCard'
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents'
import { RequestsTable } from '@/components/dashboard/RequestsTable'
import { LeaveStats } from '@/components/dashboard/LeaveStats'
import { NewsCard } from '@/components/dashboard/NewsCard'
import { NewRequestModal } from '@/components/dashboard/NewRequestModal'
import { ScheduleMeetingModal } from '@/components/dashboard/ScheduleMeetingModal'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { useCalendar } from '@/hooks/useCalendar'
import { motion } from 'framer-motion'
import { differenceInMinutes, format, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AnnouncementsCarousel } from '@/components/announcements/AnnouncementsCarousel'
import { CreateAnnouncementModal } from '@/components/announcements/CreateAnnouncementModal'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
}

const eventColors = ['#fc7a67', '#ff0300', '#f97316', '#22c55e', '#3b82f6']

function formatDuration(start: Date, end: Date) {
  const minutes = Math.max(differenceInMinutes(end, start), 0)
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`
}

function formatStartsIn(date: Date) {
  const minutes = differenceInMinutes(date, new Date())
  if (minutes <= 0) return 'Agora'
  if (minutes < 60) return `Em ${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours < 24) return remaining > 0 ? `Em ${hours}h ${remaining}min` : `Em ${hours}h`

  return format(date, "d 'de' MMM", { locale: ptBR })
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | undefined>()
  const { users, isLoading: usersLoading } = useUsers()
  const { tasks, isLoading: tasksLoading } = useTasks()
  const { tickets, isLoading: ticketsLoading } = useTickets()
  const { events, isLoading: eventsLoading } = useCalendar()

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const handleSaveRequest = (request: {
    type: string
    startDate: Date
    endDate: Date
    description?: string
  }) => {
    console.log('Nova solicitação:', request)
    // TODO: Integrar com API real de solicitações quando a tabela existir.
  }

  const handleSaveMeeting = (meeting: {
    title: string
    date: Date
    startTime: string
    duration: string
    location?: string
    meetingLink?: string
    participants: string[]
    agenda?: string
  }) => {
    console.log('Nova reunião:', meeting)
    // TODO: Integrar com API real de calendário quando o modal enviar payload completo.
  }

  const handleCreateAnnouncement = () => {
    setEditingAnnouncementId(undefined)
    setIsAnnouncementModalOpen(true)
  }

  const handleEditAnnouncement = (id: string) => {
    setEditingAnnouncementId(id)
    setIsAnnouncementModalOpen(true)
  }

  const userById = useMemo(() => {
    return new Map((users ?? []).map((user) => [user.id, user]))
  }, [users])

  const collaboratorDashboardData = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const upcomingEvents = events
      .filter((event) => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const toAttendee = (id: string) => {
      const attendee = userById.get(id)
      return {
        id,
        name: attendee?.name ?? 'Participante',
        avatar: attendee?.avatar ?? undefined,
      }
    }

    const nextEvent = upcomingEvents[0]
    const nextMeeting = nextEvent
      ? {
          title: nextEvent.title,
          startsIn: formatStartsIn(new Date(nextEvent.startTime)),
          time: format(new Date(nextEvent.startTime), 'HH:mm'),
          duration: formatDuration(new Date(nextEvent.startTime), new Date(nextEvent.endTime)),
          attendees: (nextEvent.attendees ?? []).map(toAttendee),
        }
      : {
          title: 'Nenhuma reunião agendada',
          startsIn: 'Sem eventos próximos',
          time: '--:--',
          duration: '0 min',
          attendees: [],
        }

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === 'done').length
    const activeTasks = tasks.filter((task) => task.status !== 'done').length
    const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length
    const overdueTasks = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false
      return startOfDay(new Date(task.dueDate)) < startOfDay(now)
    }).length

    const tasksBySector = tasks.reduce((acc, task) => {
      acc[task.sector] = (acc[task.sector] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const projects = Object.entries(tasksBySector)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        hours: count,
        color: eventColors[index % eventColors.length],
      }))

    const completedDays = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + index)
      return tasks.some(
        (task) => task.status === 'done' && isSameDay(new Date(task.updatedAt), day)
      )
    })

    const eventGroups = upcomingEvents.slice(0, 6).reduce((groups, event) => {
      const dateKey = format(new Date(event.startTime), 'yyyy-MM-dd')
      const existing = groups.find((group) => group.date === dateKey)
      const mappedEvent = {
        id: event.id,
        title: event.title,
        time: format(new Date(event.startTime), 'HH:mm'),
        duration: formatDuration(new Date(event.startTime), new Date(event.endTime)),
        date: new Date(event.startTime),
        attendees: (event.attendees ?? []).map(toAttendee),
      }

      if (existing) {
        existing.events.push(mappedEvent)
      } else {
        groups.push({ date: dateKey, events: [mappedEvent] })
      }

      return groups
    }, [] as Array<{ date: string; events: Array<{ id: string; title: string; time: string; duration: string; date: Date; attendees: Array<{ id: string; name: string; avatar?: string }> }> }>)

    const requestTickets = tickets.filter((ticket) => ticket.status !== 'completed')
    const requests = requestTickets.slice(0, 5).map((ticket) => {
      const responsible = userById.get(ticket.assignedTo ?? ticket.requester)
      return {
        id: ticket.id,
        startDate: new Date(ticket.createdAt),
        endDate: new Date(ticket.updatedAt),
        type: ticket.category || ticket.title,
        status: ticket.status === 'open' ? ('pending' as const) : ('processing' as const),
        assignedTo: {
          id: responsible?.id ?? ticket.requester,
          name: responsible?.name ?? 'Não atribuído',
          avatar: responsible?.avatar ?? undefined,
        },
      }
    })

    const lowerTicketText = (ticket: { title: string; category: string; description: string }) =>
      `${ticket.title} ${ticket.category} ${ticket.description}`.toLowerCase()

    const countMatchingTickets = (patterns: string[]) =>
      tickets.filter((ticket) => patterns.some((pattern) => lowerTicketText(ticket).includes(pattern)))

    const dayoffRequests = countMatchingTickets(['day off', 'dayoff', 'folga'])
    const vacationRequests = countMatchingTickets(['férias', 'ferias', 'vacation'])
    const sickRequests = countMatchingTickets(['atestado', 'médico', 'medico', 'sick'])

    const latestTicket = [...tickets].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]

    return {
      nextMeeting,
      efficiency: {
        efficiency: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        hoursWorked: completedTasks,
        totalHours: Math.max(totalTasks, 1),
        activity: totalTasks > 0 ? Math.round(((completedTasks + inProgressTasks) / totalTasks) * 100) : 0,
        projectCount: Object.keys(tasksBySector).length,
        projects: projects.length > 0 ? projects : [{ name: 'Sem tarefas vinculadas', hours: 0, color: '#52525b' }],
        period: 'Tarefas reais',
        primaryMetricLabel: 'Concluídas',
        activityLabel: 'Ativas',
        projectCountLabel: 'Setores',
        projectValueSuffix: 'tarefas',
        completedDays,
      },
      eventGroups,
      newEventsCount: upcomingEvents.filter((event) => differenceInMinutes(new Date(event.startTime), now) <= 24 * 60).length,
      requests,
      leaveStats: {
        dayoff: { current: dayoffRequests.filter((ticket) => ticket.status !== 'completed').length, total: dayoffRequests.length },
        vacation: { current: vacationRequests.filter((ticket) => ticket.status !== 'completed').length, total: vacationRequests.length },
        sick: { current: sickRequests.filter((ticket) => ticket.status !== 'completed').length },
      },
      news: latestTicket
        ? {
            title: latestTicket.title,
            description: latestTicket.description || `Status: ${latestTicket.status} • Prioridade: ${latestTicket.priority}`,
            href: '/tickets',
          }
        : {
            title: 'Sem atualizações recentes',
            description: activeTasks > 0 ? `${activeTasks} tarefas ativas e ${overdueTasks} atrasadas.` : 'Quando houver tickets ou tarefas, os dados aparecerão aqui.',
            href: '/tasks',
          },
    }
  }, [events, tasks, tickets, userById])

  if (isLoading || usersLoading || tasksLoading || ticketsLoading || eventsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!user) return null

  const userRole = user.role || 'Colaborador'
  const userSector = user.sector || 'Administrativo'
  const userName = user.name || 'Usuário'

  if (userRole === 'Admin') {
    return <AdminDashboard userName={userName} />
  }

  if (userRole === 'Gerente') {
    return <ManagerDashboard userName={userName} userSector={userSector} />
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8"
    >
      <motion.div variants={itemVariants}>
        <WelcomeHeader
          onNewRequest={() => setIsRequestModalOpen(true)}
          onScheduleMeeting={() => setIsMeetingModalOpen(true)}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <AnnouncementsCarousel
          onCreateClick={handleCreateAnnouncement}
          onEditClick={handleEditAnnouncement}
        />
      </motion.div>

      <NewRequestModal
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSave={handleSaveRequest}
      />
      <ScheduleMeetingModal
        open={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        onSave={handleSaveMeeting}
        availableParticipants={users?.slice(0, 6).map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar ?? undefined,
        })) || []}
      />
      <CreateAnnouncementModal
        open={isAnnouncementModalOpen}
        onClose={() => {
          setIsAnnouncementModalOpen(false)
          setEditingAnnouncementId(undefined)
        }}
        editingId={editingAnnouncementId}
      />

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <MeetingCard
          title={collaboratorDashboardData.nextMeeting.title}
          startsIn={collaboratorDashboardData.nextMeeting.startsIn}
          time={collaboratorDashboardData.nextMeeting.time}
          duration={collaboratorDashboardData.nextMeeting.duration}
          attendees={collaboratorDashboardData.nextMeeting.attendees}
          onJoin={() => console.log('Join meeting')}
        />
        <div className="lg:col-span-2">
          <EfficiencyCard {...collaboratorDashboardData.efficiency} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <UpcomingEvents
          eventGroups={collaboratorDashboardData.eventGroups}
          newCount={collaboratorDashboardData.newEventsCount}
        />
        <RequestsTable requests={collaboratorDashboardData.requests} />
        <NewsCard {...collaboratorDashboardData.news} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <LeaveStats {...collaboratorDashboardData.leaveStats} />
      </motion.div>
    </motion.div>
  )
}
