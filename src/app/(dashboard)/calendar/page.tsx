'use client'

import { useState, useMemo } from 'react'
import { useCalendar } from '@/hooks/useCalendar'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { WeekView, CalendarEvent } from '@/components/calendar/WeekView'
import { MonthView } from '@/components/calendar/MonthView'
import { DayView } from '@/components/calendar/DayView'
import { AgendaView } from '@/components/calendar/AgendaView'
import { CreateEventModal } from '@/components/calendar/CreateEventModal'
import { useUsers } from '@/hooks/useUsers'

export default function CalendarPage() {
  const {
    events,
    getEventsByType,
  } = useCalendar()
  const { users } = useUsers()

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

  // Projects for sidebar
  const projects = [
    { id: '1', name: 'Projeto WeBuild', hours: 16.5, color: 'hsl(218, 100%, 52%)' },
    { id: '2', name: 'Tarefas de Marketing', hours: 12.5, color: 'hsl(22, 94%, 48%)' },
    { id: '3', name: 'Reuniões', hours: 3, color: 'hsl(0, 0%, 0%)' },
  ]

  // Upcoming event for sidebar
  const upcomingEvent = {
    id: 'upcoming-1',
    title: 'Encontro com Gabriel na Biblioteca Internacional',
    time: '12:00 - 13:30',
    duration: '10 min',
    location: 'Biblioteca Central',
  }

  // Transform events for WeekView
  const weekEvents: CalendarEvent[] = useMemo(() => {
    const activeFilters = filters.filter(f => f.checked).map(f => f.id)

    return events
      .filter(event => {
        const typeMap: Record<string, string> = {
          personal: 'personal',
          sector: 'sector',
          company: 'company',
        }
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

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event)
    // TODO: Open event details modal
  }

  const handleCreateEvent = (eventData: {
    title: string
    date: Date
    startTime: string
    endTime: string
    location?: string
    tags: string[]
    attendees: string[]
  }) => {
    console.log('Create event:', eventData)
    // TODO: Actually create the event
    setCreateModalOpen(false)
    setSelectedSlot(null)
  }

  // Available attendees for create modal
  const availableAttendees = (users || []).slice(0, 8).map(u => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar ?? undefined,
  }))

  return (
    <div className="w-[95%] mx-auto py-6 md:py-8">
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <CalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            upcomingEvent={upcomingEvent}
          />
        </div>

        {/* Main Calendar */}
        <div className="flex-1 min-w-0">
          {view === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              events={weekEvents}
              onDateChange={setSelectedDate}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
              view={view}
              onViewChange={setView}
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
    </div>
  )
}
