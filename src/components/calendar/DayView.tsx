'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  format,
  isSameDay,
  isToday,
  addDays,
  subDays,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion'
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
import { useState, useRef } from 'react'

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

interface DayViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void
  isMobile?: boolean
}

const HOURS = Array.from({ length: 9 }, (_, i) => i + 10) // 10am to 6pm

export function DayView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onSlotClick,
  onEventDrop,
  view = 'day',
  onViewChange,
  isMobile = false,
}: DayViewProps) {
  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1))
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const dayEvents = events.filter((event) => isSameDay(new Date(event.startTime), selectedDate))
  const isTodayDate = isToday(selectedDate)

  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()

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
    const draggedEvent = events.find(e => e.id === active.id)
    if (draggedEvent) {
      setActiveEvent(draggedEvent)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveEvent(null)

    if (!over) return

    const draggedEvent = events.find(e => e.id === active.id)
    if (!draggedEvent) return

    const [dateStr, hourStr] = String(over.id).split('|')
    const hour = parseInt(hourStr, 10)

    const targetDay = new Date(dateStr)
    const newStartTime = new Date(targetDay)
    newStartTime.setHours(hour, 0, 0, 0)

    const duration = differenceInMinutes(new Date(draggedEvent.endTime), new Date(draggedEvent.startTime))
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000)

    onEventDrop?.(active.id as string, newStartTime, newEndTime)
  }

  // Swipe gesture handler for mobile
  const handleSwipe = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) {
      // Swipe right - go to previous day
      handlePrevDay()
    } else if (info.offset.x < -threshold) {
      // Swipe left - go to next day
      handleNextDay()
    }
  }

  const getEventStyle = (event: CalendarEvent) => {
    const startHour = getHours(new Date(event.startTime))
    const startMinute = getMinutes(new Date(event.startTime))
    const duration = differenceInMinutes(new Date(event.endTime), new Date(event.startTime))

    // Cada hora ocupa 100/9 = 11.111% da altura total
    const hourPercentage = 100 / HOURS.length

    // Posição: (hora - hora_inicial) + fração de minutos
    const hoursFromStart = startHour - 10
    const minuteFraction = startMinute / 60
    const topPercentage = (hoursFromStart + minuteFraction) * hourPercentage

    // Altura: duração em horas * porcentagem por hora (mínimo 3%)
    const durationHours = duration / 60
    const heightPercentage = Math.max(durationHours * hourPercentage, 3)

    return { top: `${topPercentage}%`, height: `${heightPercentage}%` }
  }

  // Mobile-optimized layout
  if (isMobile) {
    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          ref={containerRef}
          className="flex flex-col h-full bg-black overflow-hidden"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleSwipe}
        >
          {/* Day Summary - Mobile Compact */}
          <div className="px-4 py-3 border-b border-[#262626] bg-[#0a0a0a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-xl text-xl font-bold',
                    isTodayDate
                      ? 'bg-[#fc7a67] text-black'
                      : 'bg-[#1a1a1a] text-white'
                  )}
                >
                  {format(selectedDate, 'd')}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">
                    {dayEvents.length}{' '}
                    {dayEvents.length === 1 ? 'evento' : 'eventos'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dayEvents.length === 0
                      ? 'Dia livre'
                      : `Primeiro às ${format(
                          new Date(dayEvents[0]?.startTime),
                          'HH:mm'
                        )}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Grid - Mobile Optimized */}
          <div className="flex-1 overflow-y-auto">
            <div className="relative min-h-full">
              {/* Hour Lines - Droppable Slots */}
              {HOURS.map((hour) => (
                <DroppableSlot
                  key={hour}
                  day={selectedDate}
                  hour={hour}
                  maxHours={HOURS.length}
                  onClick={() => onSlotClick?.(selectedDate, hour)}
                  isMobile={true}
                >
                  <div className="w-14 flex-shrink-0 pr-2 py-3 text-right">
                    <span className="text-xs text-gray-500 font-medium">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                </DroppableSlot>
              ))}

              {/* Current Time Indicator */}
              {isTodayDate && <CurrentTimeIndicator />}

              {/* Events - Draggable */}
              <div className="absolute left-14 right-4 top-0 bottom-0 pointer-events-none">
                <AnimatePresence>
                  {dayEvents.map((event) => {
                    const style = getEventStyle(event)
                    return (
                      <DraggableEvent
                        key={event.id}
                        event={event}
                        style={{
                          ...style,
                          backgroundColor: event.color || '#fc7a67',
                        }}
                        onClick={() => onEventClick?.(event)}
                        isMobile={true}
                      />
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        <DragOverlay>
          {activeEvent ? (
            <div
              className="p-3 rounded-xl text-left shadow-xl"
              style={{
                backgroundColor: activeEvent.color || '#fc7a67',
                height: '70px',
                width: '280px',
              }}
            >
              <div className="font-medium text-white text-sm truncate">
                {activeEvent.title}
              </div>
              <div className="text-xs text-white/80 mt-1">
                {format(new Date(activeEvent.startTime), 'HH:mm')} -{' '}
                {format(new Date(activeEvent.endTime), 'HH:mm')}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    )
  }

  // Desktop layout (original)
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
            <div>
              <h2 className="text-xl font-bold">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-sm text-gray-400">
                {format(selectedDate, 'yyyy', { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevDay}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className={cn(
                  'h-8 px-3 text-sm hover:bg-[#1a1a1a]',
                  isTodayDate ? 'text-[#fc7a67]' : 'text-gray-400 hover:text-white'
                )}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextDay}
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
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : v === 'day' ? 'Dia' : 'Agenda'}
              </button>
            ))}
          </div>
        </div>

        {/* Day Summary */}
        <div className="px-4 py-3 border-b border-[#262626] bg-[#0a0a0a]">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex items-center justify-center w-14 h-14 rounded-xl text-2xl font-bold',
              isTodayDate ? 'bg-[#fc7a67] text-black' : 'bg-[#1a1a1a] text-white'
            )}>
              {format(selectedDate, 'd')}
            </div>
            <div>
              <p className="font-medium text-white">
                {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'} agendados
              </p>
              <p className="text-sm text-gray-400">
                {dayEvents.length === 0
                  ? 'Nenhum compromisso para este dia'
                  : `Primeiro às ${format(new Date(dayEvents[0]?.startTime), 'HH:mm')}`
                }
              </p>
            </div>
            <Button
              onClick={() => onSlotClick?.(selectedDate, 9)}
              className="ml-auto gap-2 bg-[#fc7a67] text-black hover:bg-[#ff0300]"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </Button>
          </div>
        </div>

        {/* Time Grid */}
        <div className="flex-1 overflow-hidden">
          <div className="relative h-full flex flex-col">
            {/* Hour Lines - Droppable Slots */}
            {HOURS.map((hour) => (
              <DroppableSlot
                key={hour}
                day={selectedDate}
                hour={hour}
                maxHours={HOURS.length}
                onClick={() => onSlotClick?.(selectedDate, hour)}
              >
                <div className="w-16 flex-shrink-0 pr-2 pt-1 text-right">
                  <span className="text-xs text-gray-500">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              </DroppableSlot>
            ))}

            {/* Current Time Indicator */}
            {isTodayDate && <CurrentTimeIndicator />}

            {/* Events - Draggable */}
            <div className="absolute left-16 right-4 top-0 bottom-0 pointer-events-none">
              {dayEvents.map((event, index) => {
                const style = getEventStyle(event)
                return (
                  <DraggableEvent
                    key={event.id}
                    event={event}
                    style={{
                      ...style,
                      backgroundColor: event.color || '#fc7a67',
                    }}
                    onClick={() => onEventClick?.(event)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEvent ? (
          <div
            className="p-3 rounded-lg text-left"
            style={{
              backgroundColor: activeEvent.color || '#fc7a67',
              height: '60px',
              width: '300px'
            }}
          >
            <div className="font-medium text-white text-sm truncate">
              {activeEvent.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function CurrentTimeIndicator() {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const hourPercentage = 100 / HOURS.length
  const hoursFromStart = currentHour - 10
  const minuteFraction = currentMinute / 60
  const topPercentage = (hoursFromStart + minuteFraction) * hourPercentage

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute left-14 md:left-16 right-0 flex items-center pointer-events-none z-10"
      style={{
        top: `${topPercentage}%`,
      }}
    >
      <div className="w-3 h-3 rounded-full bg-[#ff0300] -ml-1.5" />
      <div className="flex-1 h-0.5 bg-[#ff0300]" />
    </motion.div>
  )
}

function DraggableEvent({
  event,
  onClick,
  style,
  isMobile = false,
}: {
  event: CalendarEvent
  onClick?: () => void
  style: React.CSSProperties
  isMobile?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: event,
  })

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={(e) => {
        onClick?.()
      }}
      className={cn(
        'absolute left-0 right-0 rounded-xl text-left transition-transform overflow-hidden cursor-grab active:cursor-grabbing pointer-events-auto',
        isMobile ? 'p-3 min-h-[60px]' : 'p-3 hover:scale-[1.02]',
        isDragging ? 'opacity-30 z-50' : 'z-10'
      )}
      style={style}
    >
      <div
        className={cn(
          'font-medium text-white truncate',
          isMobile ? 'text-sm' : 'text-sm'
        )}
      >
        {event.title}
      </div>
      <div className="text-xs text-white/80 mt-1">
        {format(new Date(event.startTime), 'HH:mm')} -{' '}
        {format(new Date(event.endTime), 'HH:mm')}
      </div>
      {event.attendees && event.attendees.length > 0 && !isMobile && (
        <div className="flex -space-x-2 mt-2">
          {event.attendees.slice(0, 3).map((attendee) => (
            <div
              key={attendee.id}
              className="w-6 h-6 rounded-full bg-black/30 border-2 border-white/20 flex items-center justify-center text-xs text-white font-medium"
            >
              {attendee.name.charAt(0)}
            </div>
          ))}
          {event.attendees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-black/50 border-2 border-white/20 flex items-center justify-center text-xs text-white">
              +{event.attendees.length - 3}
            </div>
          )}
        </div>
      )}
      {/* Linked entity badges */}
      {(event.linkedTaskId || event.linkedTicketId) && (
        <div className="flex gap-1 mt-2">
          {event.linkedTaskId && (
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">📋</span>
          )}
          {event.linkedTicketId && (
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">🎫</span>
          )}
        </div>
      )}
    </motion.div>
  )
}

function DroppableSlot({
  day,
  hour,
  children,
  onClick,
  maxHours,
  isMobile = false,
}: {
  day: Date
  hour: number
  children: React.ReactNode
  onClick?: () => void
  maxHours: number
  isMobile?: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${day.toISOString()}|${hour}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex border-b border-[#1a1a1a] relative transition-colors',
        isMobile ? 'min-h-[64px]' : 'flex-1',
        isOver && 'bg-[#fc7a67]/20'
      )}
    >
      {children}
      <div
        className={cn(
          'flex-1 cursor-pointer',
          isMobile
            ? 'active:bg-[#1a1a1a]/70 min-h-[48px]'
            : 'hover:bg-[#1a1a1a]/50'
        )}
        onClick={onClick}
      />
    </div>
  )
}
