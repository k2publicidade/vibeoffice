'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  color?: string
  attendees?: { id: string; name: string; avatar?: string }[]
}

interface DayViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am to 9pm

export function DayView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  onSlotClick,
  view = 'day',
  onViewChange,
}: DayViewProps) {
  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1))
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const dayEvents = events.filter((event) => isSameDay(new Date(event.startTime), selectedDate))
  const isTodayDate = isToday(selectedDate)

  const getEventStyle = (event: CalendarEvent) => {
    const startHour = getHours(new Date(event.startTime))
    const startMinute = getMinutes(new Date(event.startTime))
    const duration = differenceInMinutes(new Date(event.endTime), new Date(event.startTime))

    const top = ((startHour - 6) * 60 + startMinute) * (80 / 60) // 80px per hour
    const height = Math.max((duration / 60) * 80, 30) // Minimum 30px

    return { top: `${top}px`, height: `${height}px` }
  }

  return (
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
      <ScrollArea className="flex-1">
        <div className="relative min-h-[1280px]"> {/* 16 hours * 80px */}
          {/* Hour Lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex border-b border-[#1a1a1a]"
              style={{ top: `${(hour - 6) * 80}px`, height: '80px' }}
            >
              <div className="w-16 flex-shrink-0 pr-2 pt-1 text-right">
                <span className="text-xs text-gray-500">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
              <div
                className="flex-1 cursor-pointer hover:bg-[#1a1a1a]/50 transition-colors"
                onClick={() => onSlotClick?.(selectedDate, hour)}
              />
            </div>
          ))}

          {/* Current Time Indicator */}
          {isTodayDate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute left-16 right-0 flex items-center pointer-events-none z-10"
              style={{
                top: `${((new Date().getHours() - 6) * 60 + new Date().getMinutes()) * (80 / 60)}px`,
              }}
            >
              <div className="w-3 h-3 rounded-full bg-[#ff0300] -ml-1.5" />
              <div className="flex-1 h-0.5 bg-[#ff0300]" />
            </motion.div>
          )}

          {/* Events */}
          <div className="absolute left-16 right-4 top-0">
            {dayEvents.map((event, index) => {
              const style = getEventStyle(event)
              return (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onEventClick?.(event)}
                  className="absolute left-0 right-0 p-3 rounded-lg text-left transition-transform hover:scale-[1.02] overflow-hidden"
                  style={{
                    ...style,
                    backgroundColor: event.color || '#fc7a67',
                  }}
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
                </motion.button>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
