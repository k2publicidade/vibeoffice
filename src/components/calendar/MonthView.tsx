'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  color?: string
  attendees?: { id: string; name: string; avatar?: string }[]
}

interface MonthViewProps {
  // ... existing props
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
  // ... existing hooks and calculations
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

    // Droppable ID is ISO string of the date
    const targetDateStr = String(over.id)
    const targetDate = new Date(targetDateStr)

    // Calculate time difference to preserve time of day
    const oldStartTime = new Date(draggedEvent.startTime)
    const timeDiff = targetDate.getTime() - startOfDay(new Date(oldStartTime)).getTime()

    // In Month View, dragging to a day usually sets it to that day.
    // We should preserve the HH:MM of the original event but on the new day.
    const newStartTime = new Date(targetDate)
    newStartTime.setHours(oldStartTime.getHours(), oldStartTime.getMinutes())

    const duration = differenceInMinutes(new Date(draggedEvent.endTime), new Date(draggedEvent.startTime))
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000)

    onEventDrop?.(active.id as string, newStartTime, newEndTime)
  }

  // ... helper function to get startOfDay for calc
  function startOfDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-black rounded-2xl border border-[#262626] overflow-hidden">
        {/* ... Header ... */}
        {/* ... Weekday Headers ... */}

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
                    <span className="text-xs text-gray-500">+{dayEvents.length - 3}</span>
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
            style={{ backgroundColor: activeEvent.color || '#fc7a67', color: 'white' }}
          >
            {format(new Date(activeEvent.startTime), 'HH:mm')} {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DraggableMonthEvent({ event, onClick }: { event: CalendarEvent, onClick?: () => void }) {
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

function DroppableMonthDay({ day, children, onClick, className }: { day: Date, children: React.ReactNode, onClick?: () => void, className?: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: day.toISOString(),
  })

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(className, isOver && "bg-[#fc7a67]/20")}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  )
}
