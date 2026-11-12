'use client'

import { eventOverlapsDay } from '@/lib/calendar-time'
import { cn } from '@/lib/utils'
import { format, isToday, addDays, subDays, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, PanInfo } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragStartEvent,
} from '@dnd-kit/core'
import { useRef, useState, useId } from 'react'
import {
  HOURS,
  HOUR_HEIGHT,
  HourLabels,
  HourSlot,
  NowIndicator,
  TimedEvent,
  DragPreview,
  getEventBox,
  layoutOverlaps,
  useScrollToWorkingHours,
} from './TimeGridParts'

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

export function DayView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onSlotClick,
  onEventDrop,
  isMobile = false,
}: DayViewProps) {
  const dayEvents = events
    .filter(event => eventOverlapsDay(event, selectedDate))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const lanes = layoutOverlaps(dayEvents, selectedDate)
  const isTodayDate = isToday(selectedDate)
  const hourHeight = isMobile ? HOUR_HEIGHT.mobile : HOUR_HEIGHT.desktop

  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  useScrollToWorkingHours(scrollRef, hourHeight, isTodayDate, selectedDate.toDateString())

  const dndId = useId()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveEvent(events.find(e => e.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveEvent(null)
    if (!over) return
    const draggedEvent = events.find(e => e.id === active.id)
    if (!draggedEvent) return
    const [dateStr, hourStr] = String(over.id).split('|')
    const newStartTime = new Date(dateStr)
    newStartTime.setHours(parseInt(hourStr, 10), 0, 0, 0)
    const duration = differenceInMinutes(new Date(draggedEvent.endTime), new Date(draggedEvent.startTime))
    onEventDrop?.(active.id as string, newStartTime, new Date(newStartTime.getTime() + duration * 60000))
  }

  // Swipe horizontal (mobile) troca de dia
  const handleSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 80 || Math.abs(info.offset.y) > Math.abs(info.offset.x)) return
    onDateChange(info.offset.x > 0 ? subDays(selectedDate, 1) : addDays(selectedDate, 1))
  }

  const firstEvent = dayEvents[0]
  const summary = (
    <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#262626] bg-[#0a0a0a] px-4 py-2.5">
      <div
        className={cn(
          'flex h-11 w-11 flex-col items-center justify-center rounded-xl leading-none',
          isTodayDate ? 'bg-[#fc7a67] text-black' : 'bg-[#1a1a1a] text-white'
        )}
      >
        <span className="text-[10px] uppercase opacity-80">{format(selectedDate, 'EEE', { locale: ptBR })}</span>
        <span className="text-lg font-bold">{format(selectedDate, 'd')}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">
          {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
          {!isMobile && ' agendados'}
        </p>
        <p className="truncate text-xs text-zinc-400">
          {firstEvent ? `Primeiro às ${format(new Date(firstEvent.startTime), 'HH:mm')} · ${firstEvent.title}` : 'Dia livre'}
        </p>
      </div>
    </div>
  )

  return (
    <DndContext id={dndId} sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <motion.div
        className="flex h-full flex-col"
        {...(isMobile
          ? { drag: 'x' as const, dragConstraints: { left: 0, right: 0 }, dragElastic: 0.15, dragDirectionLock: true, onDragEnd: handleSwipe }
          : {})}
      >
        {summary}

        <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex pt-2">
            <HourLabels hourHeight={hourHeight} className={isMobile ? 'w-14' : 'w-16'} />
            <div className="relative min-w-0 flex-1 border-l border-[#262626] pr-2 md:pr-4" style={{ height: hourHeight * 24 }}>
              {HOURS.map(hour => (
                <HourSlot
                  key={hour}
                  day={selectedDate}
                  hour={hour}
                  hourHeight={hourHeight}
                  onClick={() => onSlotClick?.(selectedDate, hour)}
                  showAddHint={!isMobile}
                />
              ))}
              <div className="pointer-events-none absolute inset-y-0 left-0 right-2 md:right-4">
                {dayEvents.map(event => (
                  <div key={event.id} className="pointer-events-auto">
                    <TimedEvent
                      event={event}
                      box={getEventBox(event, selectedDate, hourHeight)}
                      lane={lanes.get(event.id)}
                      onClick={() => onEventClick?.(event)}
                      detailed
                    />
                  </div>
                ))}
              </div>
              {isTodayDate && <NowIndicator hourHeight={hourHeight} />}
            </div>
          </div>
        </div>
      </motion.div>

      <DragOverlay>{activeEvent ? <DragPreview event={activeEvent} /> : null}</DragOverlay>
    </DndContext>
  )
}
