'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarFilter {
  id: string
  name: string
  color: string
  checked: boolean
  count?: number
}

interface Project {
  id: string
  name: string
  hours: number
  color: string
}

interface UpcomingEvent {
  id: string
  title: string
  time: string
  duration: string
  location?: string
}

interface CalendarSidebarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  filters: CalendarFilter[]
  onFilterChange: (id: string, checked: boolean) => void
  projects?: Project[]
  upcomingEvent?: UpcomingEvent
}

export function CalendarSidebar({
  selectedDate,
  onDateSelect,
  filters,
  onFilterChange,
  projects = [],
  upcomingEvent,
}: CalendarSidebarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className="flex flex-col gap-4">
      {/* Mini Calendar */}
      <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-4 text-foreground">
        {/* Month Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-foreground hover:bg-orange-500/20 hover:text-orange-400 transition-colors"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-foreground hover:bg-orange-500/20 hover:text-orange-400 transition-colors"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week days header */}
        <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted-foreground">
          {weekDays.map((day) => (
            <div key={day} className="py-1">
              {day.charAt(0)}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-200',
                  !isCurrentMonth && 'text-zinc-600',
                  isCurrentMonth && 'text-foreground',
                  isSelected && 'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30',
                  !isSelected && isToday && 'ring-2 ring-orange-500',
                  !isSelected &&
                    isCurrentMonth &&
                    'hover:bg-zinc-700 hover:text-orange-400'
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* My Calendars */}
      <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-4">
        <h3 className="mb-3 font-semibold text-foreground">Meus Calendários</h3>
        <div className="space-y-3">
          {filters.map((filter) => (
            <label
              key={filter.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={filter.checked}
                  onCheckedChange={(checked) =>
                    onFilterChange(filter.id, checked as boolean)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-[#fe6e5b] data-[state=checked]:to-[#ff0300] data-[state=checked]:border-[#ff0300]"
                />
                <span className="text-sm text-foreground group-hover:text-orange-400 transition-colors">{filter.name}</span>
              </div>
              {filter.count !== undefined && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-300">
                  {filter.count}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Projects Planned */}
      {projects.length > 0 && (
        <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-4">
          <h3 className="mb-3 font-semibold text-foreground">Projetos planejados</h3>
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between text-sm group cursor-pointer hover:bg-zinc-700/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-zinc-800"
                    style={{ backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}40` }}
                  />
                  <span className="text-foreground group-hover:text-orange-400 transition-colors">{project.name}</span>
                </div>
                <span className="text-muted-foreground font-medium">{project.hours} hr</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Event Card */}
      {upcomingEvent && (
        <div className="rounded-2xl bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] p-4 text-white shadow-lg shadow-[#ff0300]/30">
          <div className="mb-2 flex items-center justify-between text-sm text-white/80">
            <span>{upcomingEvent.time}</span>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{upcomingEvent.duration}</span>
            </div>
          </div>
          <h4 className="font-semibold text-white">{upcomingEvent.title}</h4>
          {upcomingEvent.location && (
            <p className="mt-1 text-sm text-white/80">
              📍 {upcomingEvent.location}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full bg-white/20 text-white border-0 hover:bg-white/30 transition-colors"
            >
              Depois
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full bg-white text-orange-600 border-0 hover:bg-white/90 font-medium transition-colors"
            >
              Detalhes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
