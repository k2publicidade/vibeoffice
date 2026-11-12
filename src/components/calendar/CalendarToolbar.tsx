'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { endOfWeek, format, isSameMonth, isSameYear, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'

export const VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
}

const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function getCalendarTitle(view: CalendarViewMode, date: Date) {
  return capitalizeFirst(buildTitle(view, date))
}

function buildTitle(view: CalendarViewMode, date: Date) {
  switch (view) {
    case 'day':
      return format(date, "EEEE, d 'de' MMM", { locale: ptBR })
    case 'week': {
      const start = startOfWeek(date, { weekStartsOn: 0 })
      const end = endOfWeek(date, { weekStartsOn: 0 })
      if (isSameMonth(start, end)) return `${format(start, 'd')} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`
      if (isSameYear(start, end)) return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`
      return `${format(start, 'd MMM yyyy', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`
    }
    case 'agenda':
      return `Próximos 30 dias · desde ${format(date, "d MMM", { locale: ptBR })}`
    default:
      return format(date, "MMMM 'de' yyyy", { locale: ptBR })
  }
}

interface CalendarToolbarProps {
  view: CalendarViewMode
  selectedDate: Date
  onViewChange: (view: CalendarViewMode) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onCreate: () => void
  /** Slot para o seletor de cor do dia */
  actions?: React.ReactNode
}

/** Barra única de navegação do calendário (tablet/desktop). */
export function CalendarToolbar({
  view,
  selectedDate,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onCreate,
  actions,
}: CalendarToolbarProps) {
  const navButton =
    'h-11 w-11 rounded-xl border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400'

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className={navButton} onClick={onPrevious} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-xl border-zinc-700/60 bg-zinc-800/50 px-4 text-zinc-200 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400"
          onClick={onToday}
        >
          Hoje
        </Button>
        <Button variant="outline" size="icon" className={navButton} onClick={onNext} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-white lg:text-xl">
        {getCalendarTitle(view, selectedDate)}
      </h2>

      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Visualização" className="flex items-center rounded-xl border border-zinc-700/60 bg-zinc-800/50 p-1">
          {(['month', 'week', 'day', 'agenda'] as const).map(v => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => onViewChange(v)}
              className={cn(
                'min-h-9 rounded-lg px-3 text-sm font-medium transition-all',
                view === v
                  ? 'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white shadow-md shadow-[#ff0300]/30'
                  : 'text-zinc-400 hover:text-orange-400'
              )}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        {actions}
        <Button
          onClick={onCreate}
          className="h-11 gap-2 rounded-xl bg-gradient-to-br from-[#fc7a67] to-[#ff0300] px-3 text-white shadow-lg shadow-[#ff0300]/30 hover:opacity-90 2xl:px-4"
          aria-label="Novo evento"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden 2xl:inline">Novo evento</span>
        </Button>
      </div>
    </div>
  )
}
