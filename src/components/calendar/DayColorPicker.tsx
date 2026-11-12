'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Palette, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DAY_COLORS } from '@/lib/office-preferences'
import { cn } from '@/lib/utils'

interface DayColorPickerProps {
  date: Date
  colors: Record<string, string>
  saving?: boolean
  loading?: boolean
  error?: string
  onSave: (day: string, color: string | null) => void
  onRetry?: () => void
  /** Variante só com ícone (header mobile) */
  compact?: boolean
  className?: string
}

/** Marcação pessoal de cor do dia, num popover compacto (substitui a barra fixa). */
export function DayColorPicker({
  date,
  colors,
  saving,
  loading,
  error,
  onSave,
  onRetry,
  compact = false,
  className,
}: DayColorPickerProps) {
  const day = format(date, 'yyyy-MM-dd')
  const current = colors[day]
  const disabled = saving || loading || !!error

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Cor do dia"
          title="Cor do dia"
          className={cn(
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/50 text-sm font-medium text-zinc-300 transition-colors hover:border-orange-500/50 hover:text-orange-400',
            compact ? 'min-w-11 px-0' : 'min-w-11 px-0 2xl:px-3',
            className
          )}
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            {current ? (
              <span className="h-4 w-4 rounded-full ring-2 ring-white/70" style={{ backgroundColor: current }} />
            ) : (
              <Palette className="h-4 w-4" />
            )}
          </span>
          {!compact && <span className="hidden 2xl:inline">Cor do dia</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-2xl p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-white">Cor do dia</p>
          <p className="text-xs text-zinc-400 first-letter:uppercase">
            {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })} · marcação pessoal
          </p>
        </div>
        <div className="grid grid-cols-6 gap-2" aria-label="Cores dos dias">
          {DAY_COLORS.map(color => (
            <button
              key={color.value}
              type="button"
              title={color.label}
              aria-label={`Marcar dia em ${color.label.toLowerCase()}`}
              aria-pressed={current === color.value}
              disabled={disabled}
              onClick={() => onSave(day, color.value)}
              className="aspect-square w-full rounded-full border-2 border-transparent transition-transform hover:scale-110 disabled:opacity-50 aria-pressed:border-white aria-pressed:ring-2 aria-pressed:ring-white/40"
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={disabled || !current}
          onClick={() => onSave(day, null)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-40"
        >
          <X className="h-4 w-4" /> Sem cor
        </button>
        {error && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {error}{' '}
            {onRetry && (
              <button type="button" onClick={onRetry} className="underline">
                Tentar novamente
              </button>
            )}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
