'use client'

import { useMemo } from 'react'
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
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'framer-motion'

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  color?: string
  attendees?: { id: string; name: string; avatar?: string }[]
}

interface MonthViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function MonthView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onDayClick,
  view = 'month',
  onViewChange,
}: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => onDateChange(subMonths(selectedDate, 1))
  const handleNextMonth = () => onDateChange(addMonths(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startTime), day))
  }

  return (
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
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : v === 'day' ? 'Dia' : 'Agenda'}
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
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.01 }}
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
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick?.(event)
                    }}
                    className={cn(
                      'w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-opacity hover:opacity-80',
                      'text-white'
                    )}
                    style={{ backgroundColor: event.color || '#fc7a67' }}
                  >
                    {format(new Date(event.startTime), 'HH:mm')} {event.title}
                  </button>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
