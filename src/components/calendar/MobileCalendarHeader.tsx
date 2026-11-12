'use client'

import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { endOfWeek, format, isSameMonth, isToday, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { VIEW_LABELS, type CalendarViewMode } from './CalendarToolbar'

interface MobileCalendarHeaderProps {
  selectedDate: Date
  view: CalendarViewMode
  onDateChange?: (date: Date) => void
  onViewChange: (view: CalendarViewMode) => void
  onMenuClick: () => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  /** Slot para o seletor de cor do dia */
  actions?: React.ReactNode
}

function getMobileTitle(view: CalendarViewMode, date: Date) {
  switch (view) {
    case 'day':
      return format(date, "EEE, d 'de' MMM", { locale: ptBR })
    case 'week': {
      const start = startOfWeek(date, { weekStartsOn: 0 })
      const end = endOfWeek(date, { weekStartsOn: 0 })
      return isSameMonth(start, end)
        ? `${format(start, 'd')}–${format(end, 'd MMM', { locale: ptBR })}`
        : `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM', { locale: ptBR })}`
    }
    case 'agenda':
      return `Desde ${format(date, 'd MMM', { locale: ptBR })}`
    default:
      return format(date, 'MMMM yyyy', { locale: ptBR })
  }
}

const iconButton =
  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-[#1a1a1a] hover:text-white active:bg-[#262626]'

export function MobileCalendarHeader({
  selectedDate,
  view,
  onViewChange,
  onMenuClick,
  onPrevious,
  onNext,
  onToday,
  actions,
}: MobileCalendarHeaderProps) {
  const isTodayDate = isToday(selectedDate)

  return (
    <div className="flex-shrink-0 border-b border-[#262626] bg-black px-2 pb-2 pt-1">
      {/* Linha 1: filtros · navegação · hoje */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={onMenuClick} className={iconButton} aria-label="Calendários e filtros">
          <SlidersHorizontal className="h-5 w-5" />
        </button>
        <button type="button" onClick={onPrevious} className={iconButton} aria-label="Período anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden text-center">
          <motion.h1
            key={selectedDate.toDateString() + view}
            initial={{ opacity: 0.4, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="truncate text-base font-semibold text-white first-letter:uppercase"
          >
            {view === 'month' ? (
              <>
                <span className="min-[360px]:hidden">{format(selectedDate, 'MMM yyyy', { locale: ptBR })}</span>
                <span className="hidden min-[360px]:inline">{getMobileTitle(view, selectedDate)}</span>
              </>
            ) : (
              getMobileTitle(view, selectedDate)
            )}
          </motion.h1>
        </div>

        <button type="button" onClick={onNext} className={iconButton} aria-label="Próximo período">
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className={cn(
            'h-11 flex-shrink-0 rounded-xl px-3 text-sm font-medium transition-colors',
            isTodayDate
              ? 'bg-[#fc7a67]/15 text-[#fc7a67]'
              : 'bg-[#1a1a1a] text-zinc-200 active:bg-[#262626]'
          )}
        >
          Hoje
        </button>
      </div>

      {/* Linha 2: visualização · cor do dia */}
      <div className="mt-1 flex items-center gap-2">
        <div role="tablist" aria-label="Visualização" className="grid min-w-0 flex-1 grid-cols-4 gap-1 rounded-xl bg-[#1a1a1a] p-1">
          {(['day', 'week', 'month', 'agenda'] as const).map(v => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => onViewChange(v)}
              className={cn(
                'min-h-9 min-w-0 truncate rounded-lg px-1 text-[13px] font-medium transition-all',
                view === v
                  ? 'bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white shadow-md shadow-[#ff0300]/30'
                  : 'text-zinc-400 active:text-white'
              )}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        {actions}
      </div>
    </div>
  )
}
