'use client'

import { eventOverlapsDay } from '@/lib/calendar-time'
import { useRef, useState, useId } from 'react'
import { cn } from '@/lib/utils'
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
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInMinutes, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
  location?: string
  attendees?: { id: string; name: string; avatar?: string }[]
  linkedTaskId?: string
  linkedTicketId?: string
}

interface WeekViewProps {
  dayColors?: Record<string, string>
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

export function WeekView({
  dayColors = {},
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onEventDrop,
  onSlotClick,
  isMobile = false,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 0 }) })
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hourHeight = isMobile ? HOUR_HEIGHT.mobile : HOUR_HEIGHT.desktop

  // Mobile: 3 dias visíveis, centrados no dia selecionado
  const selectedIndex = weekDays.findIndex(d => isSameDay(d, selectedDate))
  const mobileStart = Math.max(0, Math.min(selectedIndex - 1, weekDays.length - 3))
  const displayDays = isMobile ? weekDays.slice(mobileStart, mobileStart + 3) : weekDays

  const weekHasToday = weekDays.some(d => isToday(d))
  useScrollToWorkingHours(scrollRef, hourHeight, weekHasToday, weekStart.toDateString())

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
    const duration = differenceInMinutes(draggedEvent.endTime, draggedEvent.startTime)
    onEventDrop?.(active.id as string, newStartTime, new Date(newStartTime.getTime() + duration * 60000))
  }

  const gridCols = { gridTemplateColumns: `${isMobile ? 44 : 56}px repeat(${displayDays.length}, minmax(0, 1fr))` }

  return (
    <DndContext id={dndId} sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        {/* Cabeçalho dos dias (fixo) */}
        {isMobile ? (
          <div className="grid flex-shrink-0 grid-cols-7 gap-1 border-b border-[#262626] px-2 py-2">
            {weekDays.map(day => {
              const isSelected = isSameDay(day, selectedDate)
              const color = dayColors[format(day, 'yyyy-MM-dd')]
              const visible = displayDays.some(d => isSameDay(d, day))
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateChange(day)}
                  className={cn(
                    'relative flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl transition-all',
                    isSelected
                      ? 'bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30'
                      : visible
                        ? 'bg-[#1a1a1a] text-white'
                        : 'text-zinc-500 active:bg-[#1a1a1a]',
                    !isSelected && isToday(day) && 'ring-2 ring-inset ring-[#fc7a67]'
                  )}
                >
                  <span className={cn('text-[10px] uppercase', isSelected ? 'text-white/80' : 'text-zinc-500')}>
                    {format(day, 'EEEEE', { locale: ptBR })}
                  </span>
                  <span className="text-base font-bold leading-tight">{format(day, 'd')}</span>
                  {color && <span className="absolute bottom-1 h-1 w-4 rounded-full" style={{ backgroundColor: color }} />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid flex-shrink-0 border-b border-[#262626]" style={gridCols}>
            <div />
            {weekDays.map(day => {
              const isSelected = isSameDay(day, selectedDate)
              const todayDate = isToday(day)
              const color = dayColors[format(day, 'yyyy-MM-dd')]
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateChange(day)}
                  className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 border-l border-[#262626] py-2 transition-colors hover:bg-zinc-900"
                  style={color ? { backgroundColor: `${color}1f` } : undefined}
                >
                  <span className={cn('text-[11px] uppercase tracking-wide', todayDate ? 'text-[#fc7a67]' : 'text-zinc-500')}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold transition-all',
                      isSelected
                        ? 'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30'
                        : todayDate
                          ? 'text-[#fc7a67] ring-2 ring-[#fc7a67]'
                          : 'text-white group-hover:text-orange-400'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {color && <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: color }} />}
                </button>
              )
            })}
          </div>
        )}

        {/* Grade de horários — única área rolável, sem barra visível */}
        <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid pt-2" style={gridCols}>
            <HourLabels hourHeight={hourHeight} />
            {displayDays.map(day => {
              const dayEvents = events.filter(event => eventOverlapsDay(event, day))
              const lanes = layoutOverlaps(dayEvents, day)
              const todayDate = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className={cn('relative min-w-0 border-l border-[#262626]', todayDate && 'bg-orange-500/[0.04]')}
                  style={{ height: hourHeight * 24 }}
                >
                  {HOURS.map(hour => (
                    <HourSlot
                      key={hour}
                      day={day}
                      hour={hour}
                      hourHeight={hourHeight}
                      onClick={() => onSlotClick?.(day, hour)}
                      showAddHint={!isMobile}
                    />
                  ))}
                  {dayEvents.map(event => (
                    <TimedEvent
                      key={event.id}
                      event={event}
                      box={getEventBox(event, day, hourHeight)}
                      lane={lanes.get(event.id)}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))}
                  {todayDate && <NowIndicator hourHeight={hourHeight} />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay>{activeEvent ? <DragPreview event={activeEvent} /> : null}</DragOverlay>
    </DndContext>
  )
}
