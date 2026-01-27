'use client'

import { useState, useMemo } from 'react'
import { useCalendar } from '@/hooks/useCalendar'
import type { CalendarEvent } from '@/types/calendar'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { WeekView, CalendarEvent as ViewCalendarEvent } from '@/components/calendar/WeekView'
import { MonthView } from '@/components/calendar/MonthView'
import { DayView } from '@/components/calendar/DayView'
import { AgendaView } from '@/components/calendar/AgendaView'
import { CreateEventModal } from '@/components/calendar/CreateEventModal'
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { toast } from 'sonner'

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

  // Fetch tasks for the agenda sidebar
  const { tasks } = useTasks()

  // Filter only active tasks for the current user
  const activeTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done')
  }, [tasks])

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('week')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null)

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

  // Merged Create Event Handler
  const handleCreateEvent = async (eventData: {
    title: string
    date: Date
    startTime: string
    endTime: string
    location?: string
    tags: string[]
    attendees: string[]
    linkedTaskId?: string
    linkedTicketId?: string
  }) => {
    try {
      // Combinar data + hora em Date objects
      const [startHour, startMin] = eventData.startTime.split(':')
      const [endHour, endMin] = eventData.endTime.split(':')

      const startTime = new Date(eventData.date)
      startTime.setHours(parseInt(startHour), parseInt(startMin), 0)

      const endTime = new Date(eventData.date)
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0)

      await createEvent({
        title: eventData.title,
        description: '',
        startTime,
        endTime,
        type: 'personal',
        location: eventData.location,
        attendees: eventData.attendees,
        linkedTaskId: eventData.linkedTaskId,
        linkedTicketId: eventData.linkedTicketId,
      })

      setCreateModalOpen(false)
      setSelectedSlot(null)
      toast.success('Evento criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast.error('Erro ao criar evento')
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
      <div className="flex-1 overflow-auto flex gap-4 md:gap-6 px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 lg:flex-shrink-0">
          <CalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
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
                setView('day')
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
            />
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setSelectedSlot(null)
        }}
        onSave={handleCreateEvent}
        selectedDate={selectedSlot?.date || selectedDate}
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
