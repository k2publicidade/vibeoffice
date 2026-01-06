'use client'

import { CalendarX2, Palmtree, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveStatProps {
  type: 'dayoff' | 'vacation' | 'sick'
  current: number
  total?: number
}

const leaveConfig = {
  dayoff: {
    icon: CalendarX2,
    label: 'Day off',
    bgClass: 'bg-zinc-800/50 border border-zinc-700/50',
    textClass: 'text-zinc-100',
    iconBgClass: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    numberClass: 'text-zinc-100',
    totalClass: 'text-zinc-500',
  },
  vacation: {
    icon: Palmtree,
    label: 'Férias',
    bgClass: 'bg-zinc-800/50 border border-zinc-700/50',
    textClass: 'text-zinc-100',
    iconBgClass: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    numberClass: 'text-zinc-100',
    totalClass: 'text-zinc-500',
  },
  sick: {
    icon: Plus,
    label: 'Atestado',
    bgClass: 'bg-zinc-800/50 border border-zinc-700/50',
    textClass: 'text-zinc-100',
    iconBgClass: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    numberClass: 'text-zinc-100',
    totalClass: 'text-zinc-500',
  },
}

function LeaveStat({ type, current, total }: LeaveStatProps) {
  const config = leaveConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all hover:bg-zinc-800/80 cursor-pointer group border',
        config.bgClass
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300',
          config.iconBgClass
        )}
      >
        <Icon className={cn('h-6 w-6', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{config.label}</p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className={cn('text-4xl font-bold tracking-tight', config.numberClass)}>
            {current}
          </span>
          {total !== undefined && (
            <span className={cn('text-xl font-medium', config.totalClass)}> / {total}</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface LeaveStatsProps {
  dayoff: { current: number; total: number }
  vacation: { current: number; total: number }
  sick: { current: number }
}

export function LeaveStats({ dayoff, vacation, sick }: LeaveStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <LeaveStat type="dayoff" current={dayoff.current} total={dayoff.total} />
      <LeaveStat type="vacation" current={vacation.current} total={vacation.total} />
      <LeaveStat type="sick" current={sick.current} />
    </div>
  )
}
