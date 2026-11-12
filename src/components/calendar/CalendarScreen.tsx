'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks } from 'date-fns'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { CalendarEvent, CreateEventInput } from '@/types/calendar'
import type { Sector } from '@/types/auth'
import type { Task } from '@/types/tasks'
import type { User } from '@/hooks/useUsers'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useFitViewportHeight } from '@/hooks/useFitViewportHeight'
import { resolveEventRange } from '@/lib/calendar-time'
import { cn } from '@/lib/utils'
import { CalendarSidebar } from './CalendarSidebar'
import { WeekView, type CalendarEvent as ViewCalendarEvent } from './WeekView'
import { MonthView } from './MonthView'
import { DayView } from './DayView'
import { AgendaView } from './AgendaView'
import { CreateEventModal } from './CreateEventModal'
import { EventDetailsModal } from './EventDetailsModal'
import { MobileCalendarHeader } from './MobileCalendarHeader'
import { CalendarBottomSheet } from './CalendarBottomSheet'
import { CalendarToolbar, type CalendarViewMode } from './CalendarToolbar'
import { DayColorPicker } from './DayColorPicker'

export interface DayColorsState {
  colors: Record<string, string>
  saving: boolean
  loading: boolean
  error: string
  save: (day: string, color: string | null) => void | Promise<void>
  reload: () => void | Promise<void>
}

export interface CalendarScreenProps {
  events: CalendarEvent[]
  users: User[] | null
  tasks: Task[]
  dayColors: DayColorsState
  createEvent: (event: CreateEventInput) => Promise<unknown>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<unknown>
  deleteEvent: (id: string) => Promise<unknown>
  duplicateEvent: (id: string) => Promise<unknown>
}

const TYPE_COLORS: Record<string, string> = {
  personal: 'hsl(218, 100%, 52%)',
  sector: 'hsl(22, 94%, 48%)',
  company: 'hsl(142, 76%, 36%)',
}

/**
 * Tela da Agenda. Ocupa exatamente a altura disponível da janela: a página
 * nunca rola e cada visualização tem no máximo uma área rolável interna,
 * sem barra visível.
 */
export function CalendarScreen({
  events,
  users,
  tasks,
  dayColors,
  createEvent,
  updateEvent,
  deleteEvent,
  duplicateEvent,
}: CalendarScreenProps) {
  const isMobile = useIsMobile()
  const { ref: rootRef, height } = useFitViewportHeight<HTMLDivElement>()

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<CalendarViewMode>('week')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)

  // Mobile abre no dia; desktop na semana
  // (confere o matchMedia real: no 1º render pós-hidratação o hook ainda reflete o snapshot do servidor)
  useEffect(() => {
    if (isMobile && window.matchMedia('(max-width: 767px)').matches) {
      setView(current => (current === 'week' ? 'day' : current))
    }
  }, [isMobile])

  const [filterSelections, setFilterSelections] = useState([
    { id: 'personal', name: 'Pessoal', color: TYPE_COLORS.personal, checked: true },
    { id: 'sector', name: 'Setor', color: TYPE_COLORS.sector, checked: true },
    { id: 'company', name: 'Empresa', color: TYPE_COLORS.company, checked: true },
  ])
  const filters = useMemo(
    () =>
      filterSelections.map(filter => {
        const ofType = events.filter(event => event.type === filter.id)
        return {
          ...filter,
          count: ofType.length,
          hours: ofType.reduce((h, e) => h + (e.endTime.getTime() - e.startTime.getTime()) / 3600000, 0),
        }
      }),
    [filterSelections, events]
  )

  const viewEvents: ViewCalendarEvent[] = useMemo(() => {
    const activeFilters = filters.filter(f => f.checked).map(f => f.id)
    return events
      .filter(event => activeFilters.includes(event.type))
      .map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        color: dayColors.colors[format(event.startTime, 'yyyy-MM-dd')] || TYPE_COLORS[event.type] || TYPE_COLORS.company,
        location: event.location ?? undefined,
        attendees: event.attendees
          .map(id => users?.find(u => u.id === id))
          .filter(Boolean)
          .map(u => ({ id: u!.id, name: u!.name, avatar: u!.avatar ?? undefined })),
        linkedTaskId: event.linkedTaskId,
        linkedTicketId: event.linkedTicketId,
      }))
  }, [events, filters, users, dayColors.colors])

  const handleFilterChange = (id: string, checked: boolean) => {
    setFilterSelections(prev => prev.map(f => (f.id === id ? { ...f, checked } : f)))
  }

  const openCreate = (date: Date, hour = 9) => {
    setSelectedSlot({ date, hour })
    setCreateModalOpen(true)
  }

  const handlePrevious = () => {
    const step = { day: subDays(selectedDate, 1), week: subWeeks(selectedDate, 1), month: subMonths(selectedDate, 1), agenda: subDays(selectedDate, 7) }
    setSelectedDate(step[view])
  }
  const handleNext = () => {
    const step = { day: addDays(selectedDate, 1), week: addWeeks(selectedDate, 1), month: addMonths(selectedDate, 1), agenda: addDays(selectedDate, 7) }
    setSelectedDate(step[view])
  }
  const handleToday = () => setSelectedDate(new Date())

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
      // Combinar data + hora; término antes do início vai para o dia seguinte
      const { start: startTime, end: endTime } = resolveEventRange(new Date(eventData.date), eventData.startTime, eventData.endTime)
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
      toast.error('Não foi possível criar o evento. Seus dados foram preservados.')
      throw error
    }
  }

  const availableAttendees = (users || [])
    .filter(u => u.active !== false)
    .map(u => ({ id: u.id, name: u.name, avatar: u.avatar ?? undefined }))

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const handleEventClick = (event: ViewCalendarEvent) => {
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
      setDetailsModalOpen(false)
    } catch (error) {
      console.error('Error update', error)
      toast.error('Erro ao atualizar evento')
      throw error
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await deleteEvent(id)
        toast.success('Evento excluído com sucesso!')
        setDetailsModalOpen(false)
        return true
      } catch (error) {
        console.error('Error delete', error)
        toast.error('Erro ao excluir evento')
        throw error
      }
    }
    return false
  }

  const handleDuplicateEvent = async (id: string) => {
    try {
      await duplicateEvent(id)
      toast.success('Evento duplicado com sucesso!')
      setDetailsModalOpen(false)
    } catch (error) {
      console.error('Error duplicate', error)
      toast.error('Erro ao duplicar evento')
      throw error
    }
  }

  const handleEventDrop = async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      await updateEvent(eventId, { startTime: newStartTime, endTime: newEndTime })
      toast.success('Evento movido com sucesso!')
    } catch (error) {
      console.error('Error moving event:', error)
      toast.error('Erro ao mover evento')
    }
  }

  const selectedDayColor = dayColors.colors[format(selectedDate, 'yyyy-MM-dd')]

  const colorPicker = (
    <DayColorPicker
      date={selectedDate}
      colors={dayColors.colors}
      saving={dayColors.saving}
      loading={dayColors.loading}
      error={dayColors.error}
      onSave={(day, color) => void dayColors.save(day, color)}
      onRetry={() => void dayColors.reload()}
      compact={isMobile}
    />
  )

  const viewProps = {
    selectedDate,
    events: viewEvents,
    onDateChange: setSelectedDate,
    onEventClick: handleEventClick,
    view,
    onViewChange: setView,
    isMobile,
  }

  return (
    <div
      ref={rootRef}
      style={{ height: height ?? undefined }}
      className={cn(
        'flex flex-col overflow-hidden',
        // Mobile: ocupa a largura toda, colado ao header; desktop respeita o container
        '-mx-4 -mt-6 -mb-6 sm:-mx-6 md:mx-0 md:-mt-4 md:-mb-4',
        height === null && 'h-[calc(100dvh-4rem)]'
      )}
    >
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
          actions={colorPicker}
        />
      )}

      <div className="flex min-h-0 flex-1 gap-4 xl:gap-6">
        {/* Sidebar - apenas desktop */}
        <aside className="no-scrollbar hidden min-h-0 overflow-y-auto lg:block lg:w-64 lg:flex-shrink-0 xl:w-72">
          <CalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            filters={filters}
            onFilterChange={handleFilterChange}
            tasks={activeTasks}
          />
        </aside>

        {/* Calendário principal */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {!isMobile && (
            <CalendarToolbar
              view={view}
              selectedDate={selectedDate}
              onViewChange={setView}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToday={handleToday}
              onCreate={() => openCreate(selectedDate)}
              actions={colorPicker}
            />
          )}

          <div
            className={cn(
              'relative min-h-0 flex-1 overflow-hidden bg-black',
              !isMobile && 'rounded-2xl border border-[#262626]'
            )}
          >
            {selectedDayColor && view === 'day' && (
              <div className="absolute inset-x-0 top-0 z-20 h-1" style={{ backgroundColor: selectedDayColor }} />
            )}
            {view === 'week' && (
              <WeekView {...viewProps} dayColors={dayColors.colors} onSlotClick={openCreate} onEventDrop={handleEventDrop} />
            )}
            {view === 'month' && (
              <MonthView
                {...viewProps}
                dayColors={dayColors.colors}
                onDayClick={date => openCreate(date)}
                onEventDrop={handleEventDrop}
              />
            )}
            {view === 'day' && <DayView {...viewProps} onSlotClick={openCreate} onEventDrop={handleEventDrop} />}
            {view === 'agenda' && <AgendaView {...viewProps} />}
          </div>
        </section>
      </div>

      {/* FAB mobile para criar evento */}
      {isMobile && (
        <button
          type="button"
          aria-label="Novo evento"
          onClick={() => openCreate(selectedDate)}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/40 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <CalendarBottomSheet
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={date => {
          setSelectedDate(date)
          setBottomSheetOpen(false)
        }}
        filters={filters}
        onFilterChange={handleFilterChange}
        tasks={activeTasks}
      />

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
