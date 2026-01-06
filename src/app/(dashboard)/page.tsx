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
import { motion } from 'framer-motion'
import { addDays, format } from 'date-fns'

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

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const { users } = useUsers()

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
    // TODO: Integrar com API real
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
    // TODO: Integrar com API real
  }

  // Mock data for the dashboard
  const dashboardData = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd')

    // Upcoming meeting (happening soon)
    const nextMeeting = {
      title: 'Reunião mensal de retrospectiva',
      startsIn: 'Em 19 min',
      time: '10:00',
      duration: '35 min',
      attendees: users?.slice(0, 4).map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar ?? undefined,
      })) || [],
    }

    // Efficiency data
    const efficiency = {
      efficiency: 78,
      hoursWorked: 32,
      totalHours: 40,
      activity: 58,
      projectCount: 3,
      projects: [
        { name: 'Projeto WeBuild', hours: 16.5, color: 'hsl(218, 100%, 52%)' },
        { name: 'Tarefas de Marketing', hours: 12.5, color: 'hsl(22, 94%, 48%)' },
        { name: 'Reuniões', hours: 3, color: 'hsl(0, 0%, 0%)' },
      ],
    }

    // Upcoming events grouped by date
    const eventGroups = [
      {
        date: today,
        events: [
          {
            id: '1',
            title: 'Reunião semanal',
            time: '10:00',
            duration: '60 min',
            date: now,
            attendees: users?.slice(0, 3).map((u) => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar ?? undefined,
            })) || [],
          },
          {
            id: '2',
            title: 'Treinamento de Design',
            time: '15:30',
            duration: '30 min',
            date: now,
            attendees: users?.slice(2, 5).map((u) => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar ?? undefined,
            })) || [],
          },
        ],
      },
      {
        date: tomorrow,
        events: [
          {
            id: '3',
            title: 'Treinamento de Design',
            time: '15:30',
            duration: '30 min',
            date: addDays(now, 1),
            attendees: users?.slice(1, 3).map((u) => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar ?? undefined,
            })) || [],
          },
        ],
      },
    ]

    // Requests
    const requests = [
      {
        id: '1',
        startDate: new Date('2024-03-16'),
        endDate: new Date('2024-03-26'),
        type: 'Férias',
        status: 'processing' as const,
        assignedTo: users?.[0] ? {
          id: users[0].id,
          name: users[0].name,
          avatar: users[0].avatar ?? undefined,
        } : { id: '', name: 'Não atribuído', avatar: undefined },
      },
      {
        id: '2',
        startDate: new Date('2024-03-16'),
        endDate: new Date('2024-03-26'),
        type: 'Atestado',
        status: 'processing' as const,
        assignedTo: users?.[1] ? {
          id: users[1].id,
          name: users[1].name,
          avatar: users[1].avatar ?? undefined,
        } : { id: '', name: 'Não atribuído', avatar: undefined },
      },
    ]

    // Leave stats
    const leaveStats = {
      dayoff: { current: 0, total: 6 },
      vacation: { current: 12, total: 28 },
      sick: { current: 10 },
    }

    // News
    const news = {
      title: 'Atualizações no time de Devs & Designers',
      description:
        'Compilamos uma lista das principais mudanças que aconteceram em março.',
      imageUrl: '/images/office-meeting.jpg',
      href: '/chat',
    }

    return {
      nextMeeting,
      efficiency,
      eventGroups,
      requests,
      leaveStats,
      news,
    }
  }, [users])

  if (isLoading) {
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

  // Obter role e sector do usuário
  const userRole = user.role || 'Colaborador'
  const userSector = user.sector || 'Administrativo'
  const userName = user.name || 'Usuário'

  // Renderizar dashboard baseado no role
  if (userRole === 'Admin') {
    return <AdminDashboard userName={userName} />
  }

  if (userRole === 'Gerente') {
    return <ManagerDashboard userName={userName} userSector={userSector} />
  }

  // Dashboard do Colaborador (padrão)
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-[90%] mx-auto py-6 md:py-8 space-y-8"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <WelcomeHeader
          onNewRequest={() => setIsRequestModalOpen(true)}
          onScheduleMeeting={() => setIsMeetingModalOpen(true)}
        />
      </motion.div>

      {/* Modals */}
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

      {/* Row 1: Meeting Card + Efficiency */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        <MeetingCard
          title={dashboardData.nextMeeting.title}
          startsIn={dashboardData.nextMeeting.startsIn}
          time={dashboardData.nextMeeting.time}
          duration={dashboardData.nextMeeting.duration}
          attendees={dashboardData.nextMeeting.attendees}
          onJoin={() => console.log('Join meeting')}
        />
        <div className="lg:col-span-2">
          <EfficiencyCard {...dashboardData.efficiency} />
        </div>
      </motion.div>

      {/* Row 2: Upcoming Events + Requests + News */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        <UpcomingEvents
          eventGroups={dashboardData.eventGroups}
          newCount={2}
        />
        <RequestsTable requests={dashboardData.requests} />
        <NewsCard {...dashboardData.news} />
      </motion.div>

      {/* Row 3: Leave Stats */}
      <motion.div variants={itemVariants}>
        <LeaveStats {...dashboardData.leaveStats} />
      </motion.div>
    </motion.div>
  )
}
