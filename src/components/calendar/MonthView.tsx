'use client'

import { useLayoutEffect, useRef, useState, useId } from 'react'
import { Calendar, Plus } from 'lucide-react'
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
  dayColors?: Record<string, string>
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void
  isMobile?: boolean
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const CHIP_HEIGHT = 20
const CHIP_GAP = 2
const DAY_HEADER = 30

export function MonthView({
  dayColors = {},
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onDayClick,
  onEventDrop,
  isMobile = false,
}: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 }),
  })
  const weeks = calendarDays.length / 7

  const getEventsForDay = (day: Date) =>
    events
      .filter(event => isSameDay(new Date(event.startTime), day))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  // Quantos eventos cabem em cada célula sem cortar nem rolar
  const gridRef = useRef<HTMLDivElement>(null)
  const [maxChips, setMaxChips] = useState(2)
  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const update = () => {
      const cellHeight = el.clientHeight / weeks
      setMaxChips(Math.max(0, Math.floor((cellHeight - DAY_HEADER - 6) / (CHIP_HEIGHT + CHIP_GAP))))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [weeks, isMobile])

  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
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
    const oldStart = new Date(draggedEvent.startTime)
    const newStartTime = new Date(String(over.id))
    newStartTime.setHours(oldStart.getHours(), oldStart.getMinutes())
    const duration = differenceInMinutes(new Date(draggedEvent.endTime), oldStart)
    onEventDrop?.(active.id as string, newStartTime, new Date(newStartTime.getTime() + duration * 60000))
  }

  // ---------- Mobile: mini-grade do mês + eventos do dia selecionado ----------
  if (isMobile) {
    const selectedEvents = getEventsForDay(selectedDate)
    return (
      <div className="flex h-full flex-col">
        <div className="flex-shrink-0 border-b border-[#262626] px-2 pb-2 pt-1">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-1 text-center text-[11px] font-medium uppercase text-zinc-500">
                {d.charAt(0)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map(day => {
              const dayEvents = getEventsForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const inMonth = isSameMonth(day, selectedDate)
              const todayDate = isToday(day)
              const color = dayColors[format(day, 'yyyy-MM-dd')]
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateChange(day)}
                  aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
                  aria-pressed={isSelected}
                  className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl"
                  style={color && !isSelected ? { backgroundColor: `${color}26` } : undefined}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                      isSelected && 'bg-gradient-to-br from-[#fc7a67] to-[#ff0300] font-bold text-white shadow-md shadow-[#ff0300]/30',
                      !isSelected && todayDate && 'text-[#fc7a67] ring-2 ring-[#fc7a67]',
                      !isSelected && !todayDate && (inMonth ? 'text-white' : 'text-zinc-600')
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="flex h-1 gap-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <span key={e.id} className="h-1 w-1 rounded-full" style={{ backgroundColor: e.color || '#fc7a67' }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Eventos do dia selecionado */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold capitalize text-white">
              {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <button
              onClick={() => onDayClick?.(selectedDate)}
              className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-[#fc7a67] active:bg-[#1a1a1a]"
            >
              <Plus className="h-4 w-4" /> Evento
            </button>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            {selectedEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#262626] py-8 text-zinc-500"
              >
                <Calendar className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Nenhum evento neste dia</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(event => (
                  <motion.button
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onEventClick?.(event)}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#1a1a1a] p-3 text-left active:bg-[#262626]"
                  >
                    <span className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: event.color || '#fc7a67' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">{event.title}</span>
                      <span className="block text-sm text-zinc-500">
                        {format(new Date(event.startTime), 'HH:mm')} – {format(new Date(event.endTime), 'HH:mm')}
                      </span>
                    </span>
                    {event.linkedTaskId && <span className="text-xs">📋</span>}
                    {event.linkedTicketId && <span className="text-xs">🎫</span>}
                  </motion.button>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ---------- Desktop: grade que ocupa exatamente a altura disponível ----------
  return (
    <DndContext id={dndId} sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        <div className="grid flex-shrink-0 grid-cols-7 border-b border-[#262626]">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-2.5 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
              {day}
            </div>
          ))}
        </div>

        <div
          ref={gridRef}
          className="grid min-h-0 flex-1 grid-cols-7"
          style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day)
            const inMonth = isSameMonth(day, selectedDate)
            const isSelected = isSameDay(day, selectedDate)
            const todayDate = isToday(day)
            // Se nem todos cabem, reserva uma linha para o "+N"
            const fits = dayEvents.length <= maxChips
            const shown = fits ? dayEvents : dayEvents.slice(0, Math.max(0, maxChips - 1))
            const hidden = dayEvents.length - shown.length

            return (
              <DroppableMonthDay
                key={day.toISOString()}
                day={day}
                color={dayColors[format(day, 'yyyy-MM-dd')]}
                onClick={() => onDayClick?.(day)}
                className={cn(
                  'flex min-h-0 cursor-pointer flex-col overflow-hidden border-[#262626] p-1.5 transition-colors hover:bg-[#141414]',
                  (index + 1) % 7 !== 0 && 'border-r',
                  index < calendarDays.length - 7 && 'border-b',
                  !inMonth && 'bg-[#070707]',
                  isSelected && 'bg-[#fc7a67]/[0.06]'
                )}
              >
                <div className="mb-0.5 flex flex-shrink-0 items-center justify-between" style={{ height: DAY_HEADER - 4 }}>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onDateChange(day)
                    }}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
                      todayDate && 'bg-[#fc7a67] text-black',
                      !todayDate && isSelected && 'text-[#fc7a67] ring-1 ring-[#fc7a67]',
                      !todayDate && !isSelected && (inMonth ? 'text-white hover:bg-zinc-800' : 'text-zinc-600')
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                  {maxChips === 0 && dayEvents.length > 0 && (
                    <span className="flex gap-0.5 pr-1">
                      {dayEvents.slice(0, 3).map(e => (
                        <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.color || '#fc7a67' }} />
                      ))}
                    </span>
                  )}
                </div>

                <div className="flex min-h-0 flex-col" style={{ gap: CHIP_GAP }}>
                  {shown.map(event => (
                    <DraggableMonthEvent key={event.id} event={event} onClick={() => onEventClick?.(event)} />
                  ))}
                  {hidden > 0 && maxChips > 0 && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onDateChange(day)
                      }}
                      className="truncate rounded px-1.5 text-left text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      style={{ height: CHIP_HEIGHT }}
                    >
                      +{hidden} {hidden === 1 ? 'evento' : 'eventos'}
                    </button>
                  )}
                </div>
              </DroppableMonthDay>
            )
          })}
        </div>
      </div>
      <DragOverlay>
        {activeEvent ? (
          <div
            className="truncate rounded px-2 py-1 text-xs font-medium text-white shadow-xl"
            style={{ backgroundColor: activeEvent.color || '#fc7a67' }}
          >
            {format(new Date(activeEvent.startTime), 'HH:mm')} {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DraggableMonthEvent({ event, onClick }: { event: CalendarEvent; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: event.id, data: event })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={event.title}
      className={cn(
        'flex flex-shrink-0 cursor-grab items-center gap-1 truncate rounded px-1.5 text-[11px] font-medium text-white transition-opacity active:cursor-grabbing',
        isDragging ? 'opacity-30' : 'hover:opacity-85'
      )}
      style={{ height: CHIP_HEIGHT, backgroundColor: event.color || '#fc7a67' }}
      onClick={e => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <span className="opacity-80">{format(new Date(event.startTime), 'HH:mm')}</span>
      <span className="truncate">{event.title}</span>
    </div>
  )
}

function DroppableMonthDay({
  day,
  color,
  children,
  onClick,
  className,
}: {
  day: Date
  color?: string
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const { isOver, setNodeRef } = useDroppable({ id: day.toISOString() })
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && 'bg-[#fc7a67]/20')}
      style={{
        backgroundColor: color ? `${color}1f` : undefined,
        boxShadow: color ? `inset 0 3px 0 ${color}` : undefined,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
