'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  differenceInMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  DragStartEvent,
} from '@dnd-kit/core'
import { useIsMobile } from '@/hooks/useMediaQuery'

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  color?: string
  attendees?: { id: string; name: string; avatar?: string }[]
  linkedTaskId?: string
  linkedTicketId?: string
}

interface MonthViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function MonthView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onDayClick,
  onEventDrop,
  view = 'month',
  onViewChange,
}: MonthViewProps) {
  const isMobile = useIsMobile()
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Para mobile, mostrar apenas dias do mês atual
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const handlePrevMonth = () => onDateChange(subMonths(selectedDate, 1))
  const handleNextMonth = () => onDateChange(addMonths(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startTime), day))
  }

  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const draggedEvent = events.find((e) => e.id === active.id)
    if (draggedEvent) {
      setActiveEvent(draggedEvent)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveEvent(null)

    if (!over) return

    const draggedEvent = events.find((e) => e.id === active.id)
    if (!draggedEvent) return

    const targetDateStr = String(over.id)
    const targetDate = new Date(targetDateStr)

    const oldStartTime = new Date(draggedEvent.startTime)

    const newStartTime = new Date(targetDate)
    newStartTime.setHours(oldStartTime.getHours(), oldStartTime.getMinutes())

    const duration = differenceInMinutes(
      new Date(draggedEvent.endTime),
      new Date(draggedEvent.startTime)
    )
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000)

    onEventDrop?.(active.id as string, newStartTime, newEndTime)
  }

  function startOfDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Mobile List View
  if (isMobile) {
    // Agrupar eventos por dia
    const daysWithEvents = monthDays.filter(
      (day) => getEventsForDay(day).length > 0 || isToday(day)
    )

    return (
      <div className="flex flex-col h-full bg-black overflow-hidden">
        {/* Mobile List */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {monthDays.map((day, index) => {
              const dayEvents = getEventsForDay(day)
              const isTodayDate = isToday(day)
              const hasEvents = dayEvents.length > 0

              // Pular dias vazios exceto hoje
              if (!hasEvents && !isTodayDate) return null

              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-[#262626]"
                >
                  {/* Day Header */}
                  <button
                    onClick={() => onDayClick?.(day)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                      isTodayDate
                        ? 'bg-[#fc7a67]/10'
                        : 'hover:bg-[#1a1a1a] active:bg-[#262626]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center w-12 h-12 rounded-xl',
                        isTodayDate
                          ? 'bg-[#fc7a67] text-black'
                          : 'bg-[#1a1a1a] text-white'
                      )}
                    >
                      <span className="text-lg font-bold leading-none">
                        {format(day, 'd')}
                      </span>
                      <span className="text-xs uppercase opacity-80">
                        {format(day, 'EEE', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          'font-medium capitalize',
                          isTodayDate ? 'text-[#fc7a67]' : 'text-white'
                        )}
                      >
                        {isTodayDate
                          ? 'Hoje'
                          : format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {dayEvents.length}{' '}
                        {dayEvents.length === 1 ? 'evento' : 'eventos'}
                      </p>
                    </div>
                  </button>

                  {/* Events List */}
                  {dayEvents.length > 0 && (
                    <div className="px-4 pb-3 space-y-2">
                      {dayEvents.map((event) => (
                        <motion.button
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors bg-[#1a1a1a] hover:bg-[#262626] active:bg-[#333] text-left"
                        >
                          <div
                            className="w-1 h-10 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: event.color || '#fc7a67',
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(event.startTime), 'HH:mm')} -{' '}
                              {format(new Date(event.endTime), 'HH:mm')}
                            </p>
                          </div>
                          {/* Linked badges */}
                          {(event.linkedTaskId || event.linkedTicketId) && (
                            <div className="flex gap-1 flex-shrink-0">
                              {event.linkedTaskId && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 rounded px-1.5 py-0.5">
                                  📋
                                </span>
                              )}
                              {event.linkedTicketId && (
                                <span className="text-xs bg-orange-500/20 text-orange-400 rounded px-1.5 py-0.5">
                                  🎫
                                </span>
                              )}
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Empty State */}
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum evento este mês</p>
              <p className="text-sm">Toque no + para criar um evento</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Desktop Grid View (original)
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-black rounded-2xl border border-[#262626] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold capitalize">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-8 px-3 text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-1">
            {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange?.(v)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  view === v
                    ? 'bg-[#fc7a67] text-black'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {v === 'month'
                  ? 'Mês'
                  : v === 'week'
                    ? 'Semana'
                    : v === 'day'
                      ? 'Dia'
                      : 'Agenda'}
              </button>
            ))}
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-[#262626]">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, selectedDate)
            const isSelected = isSameDay(day, selectedDate)
            const isTodayDate = isToday(day)

            return (
              <DroppableMonthDay
                key={day.toISOString()}
                day={day}
                onClick={() => onDayClick?.(day)}
                className={cn(
                  'min-h-[100px] p-2 border-b border-r border-[#262626] cursor-pointer transition-colors',
                  !isCurrentMonth && 'bg-[#0a0a0a]',
                  isSelected && 'bg-[#fc7a67]/5',
                  'hover:bg-[#1a1a1a]'
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full',
                      isTodayDate && 'bg-[#fc7a67] text-black',
                      !isTodayDate && isCurrentMonth && 'text-white',
                      !isTodayDate && !isCurrentMonth && 'text-gray-600'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <DraggableMonthEvent
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))}
                </div>
              </DroppableMonthDay>
            )
          })}
        </div>
      </div>
      <DragOverlay>
        {activeEvent ? (
          <div
            className="w-full text-left px-2 py-1 rounded text-xs font-medium truncate"
            style={{
              backgroundColor: activeEvent.color || '#fc7a67',
              color: 'white',
            }}
          >
            {format(new Date(activeEvent.startTime), 'HH:mm')} {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DraggableMonthEvent({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: event,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-opacity cursor-grab active:cursor-grabbing',
        'text-white',
        isDragging ? 'opacity-30' : 'hover:opacity-80'
      )}
      style={{ backgroundColor: event.color || '#fc7a67' }}
      onClick={(e) => {
        onClick?.()
      }}
    >
      {format(new Date(event.startTime), 'HH:mm')} {event.title}
    </div>
  )
}

function DroppableMonthDay({
  day,
  children,
  onClick,
  className,
}: {
  day: Date
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: day.toISOString(),
  })

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(className, isOver && 'bg-[#fc7a67]/20')}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  )
}
