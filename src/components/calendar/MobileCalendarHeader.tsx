'use client'

import { ChevronLeft, ChevronRight, Menu, Calendar, List, Clock, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileCalendarHeaderProps {
  selectedDate: Date
  view: 'month' | 'week' | 'day' | 'agenda'
  onDateChange: (date: Date) => void
  onViewChange: (view: 'month' | 'week' | 'day' | 'agenda') => void
  onMenuClick: () => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

const viewIcons = {
  month: LayoutGrid,
  week: Calendar,
  day: Clock,
  agenda: List,
}

const viewLabels = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
}

export function MobileCalendarHeader({
  selectedDate,
  view,
  onDateChange,
  onViewChange,
  onMenuClick,
  onPrevious,
  onNext,
  onToday,
}: MobileCalendarHeaderProps) {
  const isTodayDate = isToday(selectedDate)
  const ViewIcon = viewIcons[view]

  // Formatar título baseado na view
  const getTitle = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, "EEEE, d 'de' MMM", { locale: ptBR })
      case 'week':
        return format(selectedDate, "'Semana de' d MMM", { locale: ptBR })
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: ptBR })
      case 'agenda':
        return 'Agenda'
      default:
        return format(selectedDate, 'MMMM yyyy', { locale: ptBR })
    }
  }

  return (
    <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-b border-[#262626]">
      {/* Main Header Row */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-11 w-11 flex-shrink-0 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-xl"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title with Animation */}
        <div className="flex-1 min-w-0 text-center">
          <AnimatePresence mode="wait">
            <motion.h1
              key={selectedDate.toISOString() + view}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-base font-semibold text-white truncate capitalize"
            >
              {getTitle()}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Today Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          className={cn(
            'h-11 px-3 flex-shrink-0 rounded-xl font-medium text-sm',
            isTodayDate
              ? 'bg-[#fc7a67] text-black hover:bg-[#ff0300]'
              : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
          )}
        >
          Hoje
        </Button>
      </div>

      {/* Navigation Row */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="h-10 w-10 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-xl"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Date Badge */}
          <div
            className={cn(
              'flex items-center justify-center min-w-[48px] h-10 rounded-xl px-3',
              isTodayDate
                ? 'bg-[#fc7a67] text-black font-bold'
                : 'bg-[#1a1a1a] text-white font-medium'
            )}
          >
            {format(selectedDate, 'd')}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="h-10 w-10 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-xl"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* View Toggle - Compact */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-xl p-1">
          {(['day', 'week', 'agenda'] as const).map((v) => {
            const Icon = viewIcons[v]
            const isActive = view === v
            return (
              <Button
                key={v}
                variant="ghost"
                size="icon"
                onClick={() => onViewChange(v)}
                className={cn(
                  'h-9 w-9 rounded-lg transition-all',
                  isActive
                    ? 'bg-[#fc7a67] text-black'
                    : 'text-gray-400 hover:text-white hover:bg-[#262626]'
                )}
                title={viewLabels[v]}
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
