'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  differenceInMinutes,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventBlock } from './EventBlock'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { motion, AnimatePresence } from 'framer-motion'

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

interface WeekViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0am to 11pm (full day)

export function WeekView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onEventDrop,
  onSlotClick,
  view = 'week',
  onViewChange,
}: WeekViewProps) {
  const isMobile = useIsMobile()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current hour or 8am on mount
  useEffect(() => {
    const scrollToHour = () => {
      const now = new Date()
      const targetHour = isToday(selectedDate) ? Math.max(now.getHours() - 1, 0) : 8
      const scrollPercentage = targetHour / 24

      if (scrollContainerRef.current) {
        const scrollHeight = scrollContainerRef.current.scrollHeight
        scrollContainerRef.current.scrollTop = scrollHeight * scrollPercentage
      }
      if (desktopScrollRef.current) {
        const scrollHeight = desktopScrollRef.current.scrollHeight
        desktopScrollRef.current.scrollTop = scrollHeight * scrollPercentage
      }
    }
    // Small delay to ensure DOM is ready
    const timer = setTimeout(scrollToHour, 100)
    return () => clearTimeout(timer)
  }, [selectedDate])

  // Para mobile, mostrar apenas 3 dias de cada vez centrados no dia selecionado
  const mobileDays = useMemo(() => {
    const selectedIndex = weekDays.findIndex((d) => isSameDay(d, selectedDate))
    // Centralizar o dia selecionado, mostrando anterior e próximo
    const startIdx = Math.max(0, Math.min(selectedIndex - 1, weekDays.length - 3))
    return weekDays.slice(startIdx, startIdx + 3)
  }, [weekDays, selectedDate])

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

    const [dateStr, hourStr] = String(over.id).split('|')
    const hour = parseInt(hourStr, 10)

    const targetDay = new Date(dateStr)

    const newStartTime = new Date(targetDay)
    newStartTime.setHours(hour, 0, 0, 0)

    const duration = differenceInMinutes(draggedEvent.endTime, draggedEvent.startTime)
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000)

    onEventDrop?.(active.id as string, newStartTime, newEndTime)
  }

  const handlePrevWeek = () => onDateChange(subWeeks(selectedDate, 1))
  const handleNextWeek = () => onDateChange(addWeeks(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  // Mobile navigation
  const handlePrevDays = () => onDateChange(subDays(selectedDate, 3))
  const handleNextDays = () => onDateChange(addDays(selectedDate, 3))

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.startTime, day))
  }

  const getEventStyle = (event: CalendarEvent) => {
    const startHour = getHours(event.startTime)
    const startMinute = getMinutes(event.startTime)
    const duration = differenceInMinutes(event.endTime, event.startTime)

    const hourPercentage = 100 / HOURS.length
    const hoursFromStart = startHour // Full day starts at 0
    const minuteFraction = startMinute / 60
    const topPercentage = (hoursFromStart + minuteFraction) * hourPercentage
    const durationHours = duration / 60
    const heightPercentage = Math.max(durationHours * hourPercentage, 2) // Minimum 2%

    return { top: `${topPercentage}%`, height: `${heightPercentage}%` }
  }

  // Mobile Week View - Horizontal scroll com 3 dias visíveis
  if (isMobile) {
    const displayDays = mobileDays

    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full bg-black overflow-hidden">
          {/* Week Days Header - Horizontal scroll */}
          <div className="px-2 py-2 border-b border-[#262626] overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {weekDays.map((day) => {
                const isTodayDate = isToday(day)
                const isSelected = isSameDay(day, selectedDate)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onDateChange(day)}
                    className={cn(
                      'flex flex-col items-center py-2 px-3 rounded-xl transition-all min-w-[48px]',
                      isSelected &&
                        'bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30',
                      !isSelected &&
                        isTodayDate &&
                        'ring-2 ring-[#fc7a67] bg-[#1a1a1a]',
                      !isSelected &&
                        !isTodayDate &&
                        'hover:bg-[#1a1a1a] active:bg-[#262626]'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs uppercase',
                        isSelected ? 'text-white/80' : 'text-gray-500'
                      )}
                    >
                      {format(day, 'EEE', { locale: ptBR })}
                    </span>
                    <span
                      className={cn(
                        'text-lg font-bold',
                        !isSelected && !isTodayDate && 'text-white'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Calendar Grid - Mobile 3-column */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
          >
            <div className="flex h-full min-h-[500px]">
              {/* Time Column */}
              <div className="w-12 flex-shrink-0 flex flex-col border-r border-[#262626]">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-xs text-gray-500 text-right pr-2 flex items-start pt-2 font-medium min-h-[60px]"
                  >
                    {hour.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              <AnimatePresence mode="popLayout">
                {displayDays.map((day) => {
                  const dayEvents = getEventsForDay(day)
                  const isTodayDate = isToday(day)

                  return (
                    <motion.div
                      key={day.toISOString()}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        'flex-1 relative border-r border-[#262626] flex flex-col min-w-0',
                        isTodayDate && 'bg-[#fc7a67]/5'
                      )}
                    >
                      {/* Hour slots */}
                      {HOURS.map((hour) => (
                        <DroppableSlot
                          key={hour}
                          day={day}
                          hour={hour}
                          onClick={() => onSlotClick?.(day, hour)}
                          isMobile={true}
                        />
                      ))}

                      {/* Events */}
                      {dayEvents.map((event) => (
                        <DraggableEvent
                          key={event.id}
                          event={event}
                          style={getEventStyle(event)}
                          onClick={() => onEventClick?.(event)}
                          isMobile={true}
                        >
                          <MobileEventBlock event={event} />
                        </DraggableEvent>
                      ))}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeEvent ? (
            <div className="h-[60px] w-[100px] opacity-80 cursor-grabbing">
              <MobileEventBlock event={activeEvent} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    )
  }

  // Desktop Week View (original)
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">
            {format(selectedDate, 'MMMM, yyyy', { locale: ptBR })}
          </h2>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center rounded-full bg-zinc-800/50 border border-zinc-700/50 p-1">
              {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => onViewChange?.(v)}
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
                    view === v
                      ? 'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30'
                      : 'text-muted-foreground hover:text-orange-400 hover:bg-zinc-700/50'
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

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-zinc-700 bg-zinc-800/50 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50 transition-all"
                onClick={handlePrevWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-zinc-700 bg-zinc-800/50 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50 transition-all"
                onClick={handleToday}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-zinc-700 bg-zinc-800/50 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50 transition-all"
                onClick={handleNextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Week Header with Days */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="w-16" /> {/* Time column spacer */}
          {weekDays.map((day) => {
            const isTodayDate = isToday(day)
            const isSelected = isSameDay(day, selectedDate)

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={cn(
                  'flex flex-col items-center py-3 rounded-xl transition-all duration-200',
                  isSelected &&
                    'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30',
                  !isSelected &&
                    isTodayDate &&
                    'ring-2 ring-orange-500 bg-zinc-800/50',
                  !isSelected &&
                    !isTodayDate &&
                    'hover:bg-zinc-800 hover:text-orange-400'
                )}
              >
                <span
                  className={cn(
                    'text-xs uppercase tracking-wide',
                    isSelected ? 'text-white/80' : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-xl font-bold mt-0.5">
                  {format(day, 'd')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Calendar Grid */}
        <div ref={desktopScrollRef} className="flex-1 rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-2 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1 min-h-[1600px]">
            {/* Time Column */}
            <div className="w-16 flex flex-col">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-xs text-muted-foreground text-right pr-3 flex items-start pt-1 font-medium"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isTodayDate = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative border-l border-zinc-700/50 rounded-lg flex flex-col',
                    isTodayDate && 'bg-orange-500/5'
                  )}
                >
                  {/* Hour grid lines - Droppable Slots */}
                  {HOURS.map((hour) => (
                    <DroppableSlot
                      key={hour}
                      day={day}
                      hour={hour}
                      onClick={() => onSlotClick?.(day, hour)}
                    />
                  ))}

                  {/* Events - Draggable */}
                  {dayEvents.map((event) => (
                    <DraggableEvent
                      key={event.id}
                      event={event}
                      style={getEventStyle(event)}
                      onClick={() => onEventClick?.(event)}
                    >
                      <EventBlock event={event} />
                    </DraggableEvent>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEvent ? (
          <div
            className="h-full w-full opacity-80 cursor-grabbing"
            style={{
              height: '60px',
            }}
          >
            <EventBlock event={activeEvent} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Mobile Event Block - Compact version
function MobileEventBlock({ event }: { event: CalendarEvent }) {
  return (
    <div
      className="h-full w-full rounded-lg p-1.5 overflow-hidden"
      style={{ backgroundColor: event.color || '#fc7a67' }}
    >
      <div className="font-medium text-white text-xs truncate">
        {event.title}
      </div>
      <div className="text-[10px] text-white/70 truncate">
        {format(new Date(event.startTime), 'HH:mm')}
      </div>
    </div>
  )
}

function DraggableEvent({
  event,
  onClick,
  style,
  children,
  isMobile = false,
}: {
  event: CalendarEvent
  onClick?: () => void
  style: React.CSSProperties
  children: React.ReactNode
  isMobile?: boolean
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
        'absolute cursor-grab active:cursor-grabbing',
        isMobile ? 'left-0.5 right-0.5' : 'left-1 right-1',
        isDragging && 'opacity-30'
      )}
      style={{
        ...style,
        zIndex: isDragging ? 50 : 10,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function DroppableSlot({
  day,
  hour,
  onClick,
  isMobile = false,
}: {
  day: Date
  hour: number
  onClick?: () => void
  isMobile?: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${day.toISOString()}|${hour}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 border-b border-zinc-700/30 transition-colors group relative',
        isMobile ? 'min-h-[60px]' : '',
        isOver
          ? 'bg-orange-500/20'
          : isMobile
            ? 'active:bg-orange-500/10'
            : 'cursor-pointer hover:bg-orange-500/10'
      )}
      onClick={onClick}
    >
      {/* Add button on hover - desktop only */}
      {!isMobile && (
        <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
            <Plus className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
