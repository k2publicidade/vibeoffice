'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  format,
  isSameDay,
  isToday,
  isTomorrow,
  addDays,
  subDays,
  startOfDay,
  differenceInMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  color?: string
  attendees?: { id: string; name: string; avatar?: string }[]
  location?: string
  linkedTaskId?: string
  linkedTicketId?: string
}

interface AgendaViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  onViewChange?: (view: 'month' | 'week' | 'day' | 'agenda') => void
  isMobile?: boolean
}

export function AgendaView({
  selectedDate,
  events,
  onDateChange,
  onEventClick,
  view = 'agenda',
  onViewChange,
  isMobile = false,
}: AgendaViewProps) {
  const handlePrevWeek = () => onDateChange(subDays(selectedDate, 7))
  const handleNextWeek = () => onDateChange(addDays(selectedDate, 7))
  const handleToday = () => onDateChange(new Date())

  // Get events for the next 30 days, grouped by date
  const groupedEvents = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(selectedDate), i))
    const groups: { date: Date; events: CalendarEvent[] }[] = []

    days.forEach((day) => {
      const dayEvents = events
        .filter((event) => isSameDay(new Date(event.startTime), day))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

      if (dayEvents.length > 0) {
        groups.push({ date: day, events: dayEvents })
      }
    })

    return groups
  }, [selectedDate, events])

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje'
    if (isTomorrow(date)) return 'Amanhã'
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
  }

  const getDuration = (start: Date, end: Date) => {
    const minutes = differenceInMinutes(end, start)
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours}h`
    return `${hours}h ${remainingMinutes}min`
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-black overflow-hidden",
      !isMobile && "rounded-2xl border border-[#262626]"
    )}>
      {/* Header - Desktop Only */}
      {!isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">Agenda</h2>
              <p className="text-sm text-gray-400">
                Próximos 30 dias a partir de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevWeek}
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
                onClick={handleNextWeek}
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
      )}

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className={cn("space-y-6", isMobile ? "p-3" : "p-4")}>
          <AnimatePresence>
            {groupedEvents.length > 0 ? (
              groupedEvents.map((group, groupIndex) => (
                <motion.div
                  key={group.date.toISOString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.05 }}
                  className="space-y-3"
                >
                  {/* Date Header */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold',
                      isToday(group.date)
                        ? 'bg-[#fc7a67] text-black'
                        : 'bg-[#1a1a1a] text-white'
                    )}>
                      {format(group.date, 'd')}
                    </div>
                    <div>
                      <p className={cn(
                        'font-semibold capitalize',
                        isToday(group.date) ? 'text-[#fc7a67]' : 'text-white'
                      )}>
                        {getDateLabel(group.date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {group.events.length} {group.events.length === 1 ? 'evento' : 'eventos'}
                      </p>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="ml-15 space-y-2 pl-4 border-l-2 border-[#262626]">
                    {group.events.map((event, eventIndex) => (
                      <motion.button
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: eventIndex * 0.03 }}
                        onClick={() => onEventClick?.(event)}
                        className="w-full text-left p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] hover:border-[#fc7a67]/50 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Color Indicator */}
                          <div
                            className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.color || '#fc7a67' }}
                          />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="font-semibold text-white group-hover:text-[#fc7a67] transition-colors">
                                {event.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className="flex-shrink-0 border-[#262626] text-gray-400"
                              >
                                {getDuration(new Date(event.startTime), new Date(event.endTime))}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                              </span>

                              {event.location && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {event.location}
                                </span>
                              )}

                              {event.attendees && event.attendees.length > 0 && (
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5" />
                                  {event.attendees.length} {event.attendees.length === 1 ? 'participante' : 'participantes'}
                                </span>
                              )}
                            </div>

                            {/* Attendees Avatars */}
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-2 mt-3">
                                <div className="flex -space-x-2">
                                  {event.attendees.slice(0, 5).map((attendee) => (
                                    <div
                                      key={attendee.id}
                                      className="w-7 h-7 rounded-full bg-[#262626] border-2 border-[#1a1a1a] flex items-center justify-center text-xs font-medium text-white"
                                      title={attendee.name}
                                    >
                                      {attendee.name.charAt(0)}
                                    </div>
                                  ))}
                                </div>
                                {event.attendees.length > 5 && (
                                  <span className="text-xs text-gray-500">
                                    +{event.attendees.length - 5}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="p-4 rounded-full bg-[#1a1a1a] mb-4">
                  <Calendar className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="font-semibold text-white mb-1">Nenhum evento agendado</h3>
                <p className="text-sm text-gray-400">
                  Não há eventos nos próximos 30 dias
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  )
}
