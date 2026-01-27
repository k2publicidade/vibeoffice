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
import { motion } from 'framer-motion'
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
import { useState } from 'react'

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
}: DayViewProps) {
  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1))
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const dayEvents = events.filter((event) => isSameDay(new Date(event.startTime), selectedDate))
  const isTodayDate = isToday(selectedDate)

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
            {isTodayDate && (() => {
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
                  className="absolute left-16 right-0 flex items-center pointer-events-none z-10"
                  style={{
                    top: `${topPercentage}%`,
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-[#ff0300] -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-[#ff0300]" />
                </motion.div>
              )
            })()}

            {/* Events - Draggable */}
            <div className="absolute left-16 right-4 top-0 bottom-0 pointer-events-none">
              {/* Pointer events none wrapper so clicks fall through to slots, but we need events to be clickable/draggable. 
                    Actually, DraggableEvent will handle its own pointer events. 
                    The DroppableSlot takes up the full width, so we need to be careful about z-index.
                */}
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

function DraggableEvent({ event, onClick, style }: { event: CalendarEvent, onClick?: () => void, style: React.CSSProperties }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: event
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent click when dragging, but dnd-kit usually handles this.
        // We might want to stop propagation strictly for the click handler?
        onClick?.()
      }}
      className={cn(
        "absolute left-0 right-0 p-3 rounded-lg text-left transition-transform hover:scale-[1.02] overflow-hidden cursor-grab active:cursor-grabbing pointer-events-auto",
        isDragging ? "opacity-30 z-50" : "z-10"
      )}
      style={style}
    >
      <div className="font-medium text-white text-sm truncate">
        {event.title}
      </div>
      <div className="text-xs text-white/80 mt-1">
        {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
      </div>
      {event.attendees && event.attendees.length > 0 && (
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
    </div>
  )
}

function DroppableSlot({ day, hour, children, onClick, maxHours }: { day: Date, hour: number, children: React.ReactNode, onClick?: () => void, maxHours: number }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${day.toISOString()}|${hour}`,
  })

  // We need to render the slot exactly as before but attach the ref
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 flex border-b border-[#1a1a1a] relative transition-colors",
        isOver && "bg-[#fc7a67]/20"
      )}
    >
      {children}
      <div
        className="flex-1 cursor-pointer hover:bg-[#1a1a1a]/50"
        onClick={onClick}
      />
    </div>
  )
}
