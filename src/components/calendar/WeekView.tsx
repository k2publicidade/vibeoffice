'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
}

interface WeekViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
}

const HOURS = Array.from({ length: 9 }, (_, i) => i + 10) // 10am to 6pm

export function WeekView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onSlotClick,
  view = 'week',
  onViewChange,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const handlePrevWeek = () => onDateChange(subWeeks(selectedDate, 1))
  const handleNextWeek = () => onDateChange(addWeeks(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.startTime, day))
  }

  // Calculate event position and height
  const getEventStyle = (event: CalendarEvent) => {
    const startHour = getHours(event.startTime)
    const startMinute = getMinutes(event.startTime)
    const duration = differenceInMinutes(event.endTime, event.startTime)

    const top = ((startHour - 10) * 60 + startMinute) * (64 / 60) // 64px per hour
    const height = (duration / 60) * 64

    return { top: `${top}px`, height: `${height}px` }
  }

  return (
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
      <div className="flex-1 overflow-y-auto rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-2">
        <div className="grid grid-cols-8 gap-1">
          {/* Time Column */}
          <div className="w-16">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 text-xs text-muted-foreground text-right pr-3 -mt-2 font-medium"
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
                  "relative min-h-[768px] border-l border-zinc-700/50 rounded-lg",
                  isToday && "bg-orange-500/5"
                )}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-zinc-700/30 cursor-pointer hover:bg-orange-500/10 transition-colors group relative"
                    onClick={() => onSlotClick?.(day, hour)}
                  >
                    {/* Add button on hover */}
                    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Events */}
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="absolute left-1 right-1"
                    style={getEventStyle(event)}
                  >
                    <EventBlock
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
