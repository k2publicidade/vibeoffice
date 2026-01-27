'use client'

import { useMemo, useState } from 'react'
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
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventBlock } from './EventBlock'

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

const HOURS = Array.from({ length: 9 }, (_, i) => i + 10) // 10am to 6pm

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
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
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

    // Always clear active event
    setActiveEvent(null)

    if (!over) return

    const draggedEvent = events.find(e => e.id === active.id)
    if (!draggedEvent) return

    const [dateStr, hourStr] = String(over.id).split('|')
    const hour = parseInt(hourStr, 10)

    // Reconstruct date from string safely or use data from droppable
    const targetDay = new Date(dateStr)

    // Set new start time
    const newStartTime = new Date(targetDay)
    newStartTime.setHours(hour, 0, 0, 0)

    // Calculate new end time keeping duration
    const duration = differenceInMinutes(draggedEvent.endTime, draggedEvent.startTime)
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000)

    onEventDrop?.(active.id as string, newStartTime, newEndTime)
  }

  const handlePrevWeek = () => onDateChange(subWeeks(selectedDate, 1))
  const handleNextWeek = () => onDateChange(addWeeks(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.startTime, day))
  }

  // Calculate event position and height (usando porcentagens para flexbox)
  const getEventStyle = (event: CalendarEvent) => {
    const startHour = getHours(event.startTime)
    const startMinute = getMinutes(event.startTime)
    const duration = differenceInMinutes(event.endTime, event.startTime)

    // Cada hora ocupa 100/9 = 11.111% da altura total
    const hourPercentage = 100 / HOURS.length

    // Posição: (hora - hora_inicial) + fração de minutos
    const hoursFromStart = startHour - 10
    const minuteFraction = startMinute / 60
    const topPercentage = (hoursFromStart + minuteFraction) * hourPercentage

    // Altura: duração em horas * porcentagem por hora
    const durationHours = duration / 60
    const heightPercentage = durationHours * hourPercentage

    return { top: `${topPercentage}%`, height: `${heightPercentage}%` }
  }

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
            {format(selectedDate, "MMMM, yyyy", { locale: ptBR })}
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
                  {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : v === 'day' ? 'Dia' : 'Agenda'}
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
            const isToday = isSameDay(day, new Date())
            const isSelected = isSameDay(day, selectedDate)

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={cn(
                  'flex flex-col items-center py-3 rounded-xl transition-all duration-200',
                  isSelected && 'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30',
                  !isSelected && isToday && 'ring-2 ring-orange-500 bg-zinc-800/50',
                  !isSelected && !isToday && 'hover:bg-zinc-800 hover:text-orange-400'
                )}
              >
                <span className={cn(
                  "text-xs uppercase tracking-wide",
                  isSelected ? "text-white/80" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-xl font-bold mt-0.5">{format(day, 'd')}</span>
              </button>
            )
          })}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-2 overflow-hidden">
          <div className="grid grid-cols-8 gap-1 h-full">
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
              const isToday = isSameDay(day, new Date())

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative border-l border-zinc-700/50 rounded-lg flex flex-col",
                    isToday && "bg-orange-500/5"
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
              // We don't set top/height here because DragOverlay handles position.
              // But we want it to look like the event block.
              height: '60px' // Approximate or fixed height for dragging look
            }}
          >
            <EventBlock event={activeEvent} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DraggableEvent({ event, onClick, style, children }: { event: CalendarEvent, onClick?: () => void, style: React.CSSProperties, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: event
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute left-1 right-1 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
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

function DroppableSlot({ day, hour, onClick }: { day: Date, hour: number, onClick?: () => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${day.toISOString()}|${hour}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 border-b border-zinc-700/30 transition-colors group relative",
        isOver ? "bg-orange-500/20" : "cursor-pointer hover:bg-orange-500/10"
      )}
      onClick={onClick}
    >
      {/* Add button on hover */}
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
          <Plus className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  )
}
