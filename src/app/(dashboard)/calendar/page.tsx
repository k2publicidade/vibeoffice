'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useCalendar } from '@/hooks/useCalendar'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { CalendarEvent } from '@/types/calendar'
import type { Sector } from '@/types/auth'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { WeekView, CalendarEvent as ViewCalendarEvent } from '@/components/calendar/WeekView'
import { MonthView } from '@/components/calendar/MonthView'
import { DayView } from '@/components/calendar/DayView'
import { AgendaView } from '@/components/calendar/AgendaView'
import { CreateEventModal } from '@/components/calendar/CreateEventModal'
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal'
import { MobileCalendarHeader } from '@/components/calendar/MobileCalendarHeader'
import { CalendarBottomSheet } from '@/components/calendar/CalendarBottomSheet'
import { Button } from '@/components/ui/button'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { toast } from 'sonner'
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'

export default function CalendarPage() {
  const {
    events,
    getEventsByType,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    getUpcomingEvents
  } = useCalendar()
  const { users } = useUsers()
  const isMobile = useIsMobile()

  // Fetch tasks for the agenda sidebar
  const { tasks } = useTasks()

  // Filter only active tasks for the current user
  const activeTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done')
  }, [tasks])

  const [selectedDate, setSelectedDate] = useState(new Date())
  // Default para 'day' em mobile, 'week' em desktop
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('week')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)

  // Ajustar view padrão baseado no dispositivo
  useEffect(() => {
    if (isMobile && view === 'week') {
      setView('day')
    }
  }, [isMobile])

  // Calendar filters
  const [filters, setFilters] = useState([
    { id: 'personal', name: 'Pessoal', color: 'hsl(218, 100%, 52%)', checked: true, count: getEventsByType('personal').length },
    { id: 'sector', name: 'Setor', color: 'hsl(22, 94%, 48%)', checked: true, count: getEventsByType('sector').length },
    { id: 'company', name: 'Empresa', color: 'hsl(142, 76%, 36%)', checked: false, count: getEventsByType('company').length },
  ])

  // TODO: Implement Real Projects Backend
  // Currently using static mock data as requested until project module is fully integrated
  const projects = [
    { id: '1', name: 'Projeto WeBuild', hours: 16.5, color: 'hsl(218, 100%, 52%)' },
    { id: '2', name: 'Tarefas de Marketing', hours: 12.5, color: 'hsl(22, 94%, 48%)' },
    { id: '3', name: 'Reuniões', hours: 3, color: 'hsl(0, 0%, 0%)' },
  ]

  // Transform events for WeekView
  const weekEvents: ViewCalendarEvent[] = useMemo(() => {
    const activeFilters = filters.filter(f => f.checked).map(f => f.id)

    return events
      .filter(event => {
        return activeFilters.includes(event.type)
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.type === 'personal'
          ? 'hsl(218, 100%, 52%)'
          : event.type === 'sector'
            ? 'hsl(22, 94%, 48%)'
            : 'hsl(142, 76%, 36%)',
        attendees: event.attendees
          .map(id => users?.find(u => u.id === id))
          .filter(Boolean)
          .map(u => ({ id: u!.id, name: u!.name, avatar: u!.avatar ?? undefined })),
        linkedTaskId: event.linkedTaskId,
        linkedTicketId: event.linkedTicketId,
      }))
  }, [events, filters, users])

  const handleFilterChange = (id: string, checked: boolean) => {
    setFilters(prev =>
      prev.map(f => (f.id === id ? { ...f, checked } : f))
    )
  }

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour })
    setCreateModalOpen(true)
  }

  // Navegação de data baseada na view
  const handlePrevious = () => {
    switch (view) {
      case 'day':
        setSelectedDate(subDays(selectedDate, 1))
        break
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1))
        break
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1))
        break
      case 'agenda':
        setSelectedDate(subDays(selectedDate, 7))
        break
    }
  }

  const handleNext = () => {
    switch (view) {
      case 'day':
        setSelectedDate(addDays(selectedDate, 1))
        break
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1))
        break
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1))
        break
      case 'agenda':
        setSelectedDate(addDays(selectedDate, 7))
        break
    }
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  // Merged Create Event Handler
  const handleCreateEvent = async (eventData: {
    title: string
    description?: string
    date: Date
    startTime: string
    endTime: string
    type: 'personal' | 'sector' | 'company'
    sector?: Sector
    location?: string
    attendees: string[]
    linkedTaskId?: string
    linkedTicketId?: string
  }) => {
    try {
      // Combinar data + hora em Date objects
      const [startHour, startMin] = eventData.startTime.split(':')
      const [endHour, endMin] = eventData.endTime.split(':')

      // Normalizar a data base para meia-noite local (evita problemas de timezone)
      const baseDate = new Date(eventData.date)
      baseDate.setHours(0, 0, 0, 0)

      const startTime = new Date(baseDate)
      startTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0)

      const endTime = new Date(baseDate)
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0)

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[CalendarPage] handleCreateEvent:', {
          eventData,
          baseDate: baseDate.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          isEndAfterStart: endTime > startTime,
        })
      }

      // Validação extra antes de enviar
      if (endTime <= startTime) {
        toast.error('Erro: Hora de término deve ser após hora de início')
        console.error('[CalendarPage] Validação falhou: endTime <= startTime')
        return
      }

      await createEvent({
        title: eventData.title,
        description: eventData.description ?? '',
        startTime,
        endTime,
        type: eventData.type,
        sector: eventData.sector,
        location: eventData.location,
        attendees: eventData.attendees,
        linkedTaskId: eventData.linkedTaskId,
        linkedTicketId: eventData.linkedTicketId,
      })

      setCreateModalOpen(false)
      setSelectedSlot(null)
      toast.success('Evento criado com sucesso!')
    } catch (error) {
      console.error('[CalendarPage] Erro ao criar evento:', error)
      toast.error('Erro ao criar evento. Verifique o console para detalhes.')
    }
  }

  // Available attendees for create modal
  const availableAttendees = (users || []).slice(0, 8).map(u => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar ?? undefined,
  }))

  // Edit/View Event State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // Handlers for CRUD (using functions from top-level hook)

  const handleEventClick = (event: ViewCalendarEvent) => {
    // Find full event data from hook events to ensure we have all fields
    const fullEvent = events.find(e => e.id === event.id)
    if (fullEvent) {
      setSelectedEvent(fullEvent)
      setDetailsModalOpen(true)
    }
  }

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      await updateEvent(id, updates)
      toast.success('Evento atualizado com sucesso!')
      // Optionally close modal or keep open
      setDetailsModalOpen(false)
    } catch (error) {
      console.error("Error update", error)
      toast.error("Erro ao atualizar evento")
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await deleteEvent(id)
        toast.success('Evento excluído com sucesso!')
        setDetailsModalOpen(false)
      } catch (error) {
        console.error("Error delete", error)
        toast.error("Erro ao excluir evento")
      }
    }
  }

  const handleDuplicateEvent = async (id: string) => {
    try {
      await duplicateEvent(id)
      toast.success('Evento duplicado com sucesso!')
      setDetailsModalOpen(false)
    } catch (error) {
      console.error("Error duplicate", error)
      toast.error("Erro ao duplicar evento")
    }
  }

  const handleEventDrop = async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      await updateEvent(eventId, {
        startTime: newStartTime,
        endTime: newEndTime,
      })
      toast.success('Evento movido com sucesso!')
    } catch (error) {
      console.error('Error moving event:', error)
      toast.error('Erro ao mover evento')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <MobileCalendarHeader
          selectedDate={selectedDate}
          view={view}
          onDateChange={setSelectedDate}
          onViewChange={setView}
          onMenuClick={() => setBottomSheetOpen(true)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
        />
      )}

      <div className="flex-1 overflow-auto flex gap-4 md:gap-6 px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 lg:flex-shrink-0">
          <CalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date)
              setSelectedSlot({ date, hour: 9 })
              setCreateModalOpen(true)
            }}
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            tasks={activeTasks}
          />
        </div>

        {/* Main Calendar */}
        <div className="flex-1 min-w-0 overflow-auto">
          {view === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              events={weekEvents}
              onDateChange={setSelectedDate}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
              view={view}
              onViewChange={setView}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === 'month' && (
            <MonthView
              selectedDate={selectedDate}
              events={weekEvents}
              onDateChange={setSelectedDate}
              onEventClick={handleEventClick}
              onDayClick={(date) => {
                setSelectedDate(date)
                setSelectedSlot({ date, hour: 9 })
                setCreateModalOpen(true)
              }}
              view={view}
              onViewChange={setView}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === 'day' && (
            <DayView
              selectedDate={selectedDate}
              events={weekEvents}
              onDateChange={setSelectedDate}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
              view={view}
              onViewChange={setView}
              onEventDrop={handleEventDrop}
              isMobile={isMobile}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              selectedDate={selectedDate}
              events={weekEvents}
              onDateChange={setSelectedDate}
              onEventClick={handleEventClick}
              view={view}
              onViewChange={setView}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      {/* Mobile FAB - Floating Action Button para criar evento */}
      {isMobile && (
        <Button
          onClick={() => {
            setSelectedSlot({ date: selectedDate, hour: 9 })
            setCreateModalOpen(true)
          }}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/40 hover:shadow-xl hover:shadow-[#ff0300]/50 z-40"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Bottom Sheet */}
      <CalendarBottomSheet
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date)
          setSelectedSlot({ date, hour: 9 })
          setCreateModalOpen(true)
          setBottomSheetOpen(false)
        }}
        filters={filters}
        onFilterChange={handleFilterChange}
        tasks={activeTasks}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setSelectedSlot(null)
        }}
        onSave={handleCreateEvent}
        selectedDate={selectedSlot?.date || selectedDate}
        selectedHour={selectedSlot?.hour}
        availableAttendees={availableAttendees}
      />

      {/* Edit/Details Modal */}
      <EventDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        event={selectedEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        onDuplicate={handleDuplicateEvent}
        availableAttendees={availableAttendees}
      />
    </div>
  )
}
