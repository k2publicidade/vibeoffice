'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { clipEventToDay } from '@/lib/calendar-time'
import { cn } from '@/lib/utils'

export interface TimeGridEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  color?: string
  attendees?: { id: string; name: string; avatar?: string }[]
  linkedTaskId?: string
  linkedTicketId?: string
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** Altura de cada hora (px). Mantém alvos de toque ≥ 44px. */
export const HOUR_HEIGHT = { mobile: 56, desktop: 48 } as const

/** Posição/altura absolutas do evento dentro da coluna do dia. */
export function getEventBox(event: TimeGridEvent, day: Date, hourHeight: number) {
  const { startMinute, durationMinutes } = clipEventToDay(event, day)
  const top = (startMinute / 60) * hourHeight
  const height = Math.max((durationMinutes / 60) * hourHeight, 22)
  return { top, height }
}

/**
 * Distribui eventos sobrepostos em colunas lado a lado (estilo Google Agenda).
 * Retorna, por id, a coluna ocupada e quantas colunas o grupo tem.
 */
export function layoutOverlaps(events: TimeGridEvent[], day: Date) {
  const items = events
    .map(event => {
      const { startMinute, durationMinutes } = clipEventToDay(event, day)
      return { id: event.id, start: startMinute, end: startMinute + Math.max(durationMinutes, 25) }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const lanes = new Map<string, { index: number; count: number }>()
  let cluster: { id: string; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1

  const flush = () => {
    const count = laneEnds.length
    cluster.forEach(c => lanes.set(c.id, { index: c.lane, count }))
    cluster = []
    laneEnds = []
  }

  for (const item of items) {
    if (item.start >= clusterEnd && cluster.length) flush()
    let lane = laneEnds.findIndex(end => end <= item.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.end)
    } else {
      laneEnds[lane] = item.end
    }
    cluster.push({ id: item.id, lane })
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  if (cluster.length) flush()
  return lanes
}

/** Rola a grade para perto da hora atual (hoje) ou para 08:00. */
export function useScrollToWorkingHours(
  ref: React.RefObject<HTMLDivElement | null>,
  hourHeight: number,
  focusNow: boolean,
  key: string
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targetHour = focusNow ? Math.max(new Date().getHours() - 1, 0) : 8
    el.scrollTo({ top: targetHour * hourHeight, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hourHeight])
}

/** Coluna de horários. */
export function HourLabels({ hourHeight, className }: { hourHeight: number; className?: string }) {
  return (
    <div className={cn('relative flex-shrink-0 select-none', className)} style={{ height: hourHeight * 24 }}>
      {HOURS.map(hour =>
        hour === 0 ? null : (
          <span
            key={hour}
            className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-zinc-500"
            style={{ top: hour * hourHeight }}
          >
            {hour.toString().padStart(2, '0')}:00
          </span>
        )
      )}
    </div>
  )
}

/** Linha da hora atual. */
export function NowIndicator({ hourHeight }: { hourHeight: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const top = (now.getHours() + now.getMinutes() / 60) * hourHeight
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top }}>
      <div className="-ml-1.5 h-3 w-3 rounded-full bg-[#ff0300] shadow-[0_0_8px_#ff0300]" />
      <div className="h-0.5 flex-1 bg-[#ff0300]" />
    </div>
  )
}

/** Faixa de uma hora que recebe cliques (criar evento) e eventos arrastados. */
export function HourSlot({
  day,
  hour,
  hourHeight,
  onClick,
  showAddHint = false,
}: {
  day: Date
  hour: number
  hourHeight: number
  onClick?: () => void
  showAddHint?: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `${day.toISOString()}|${hour}` })
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={-1}
      aria-label={`Criar evento às ${hour.toString().padStart(2, '0')}:00`}
      onClick={onClick}
      style={{ height: hourHeight }}
      className={cn(
        'group relative cursor-pointer border-b border-zinc-800/70 transition-colors',
        isOver ? 'bg-orange-500/20' : 'hover:bg-orange-500/[0.06] active:bg-orange-500/10'
      )}
    >
      {showAddHint && (
        <span className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-orange-500 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:flex">
          <Plus className="h-3 w-3 text-white" />
        </span>
      )}
    </div>
  )
}

/** Bloco de evento arrastável, adaptado à altura disponível. */
export function TimedEvent({
  event,
  box,
  onClick,
  lane = { index: 0, count: 1 },
  detailed = false,
}: {
  event: TimeGridEvent
  box: { top: number; height: number }
  onClick?: () => void
  lane?: { index: number; count: number }
  detailed?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: event.id, data: event })
  const color = event.color || '#fc7a67'
  const tiny = box.height < 40
  const time = `${format(new Date(event.startTime), 'HH:mm')} – ${format(new Date(event.endTime), 'HH:mm')}`

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => {
        e.stopPropagation()
        onClick?.()
      }}
      title={`${event.title} · ${time}`}
      className={cn(
        'absolute cursor-grab overflow-hidden rounded-lg border-l-[3px] text-left text-white shadow-sm transition-[opacity,filter] hover:brightness-110 active:cursor-grabbing',
        tiny ? 'flex items-center gap-1 px-1.5' : 'px-2 py-1',
        isDragging ? 'z-30 opacity-30' : 'z-10'
      )}
      style={{
        top: box.top + 1,
        height: box.height - 2,
        left: `calc(${(lane.index / lane.count) * 100}% + 2px)`,
        width: `calc(${100 / lane.count}% - 4px)`,
        backgroundColor: `color-mix(in srgb, ${color} 82%, black)`,
        borderLeftColor: color,
      }}
    >
      {tiny ? (
        <p className="truncate text-[11px] font-semibold leading-none">
          <span className="font-normal opacity-80">{format(new Date(event.startTime), 'HH:mm')}</span> {event.title}
        </p>
      ) : (
        <>
          <p className="truncate text-xs font-semibold leading-tight">
            {event.title}
            {event.linkedTaskId && <span className="ml-1">📋</span>}
            {event.linkedTicketId && <span className="ml-1">🎫</span>}
          </p>
          <p className="truncate text-[11px] leading-tight opacity-80">{time}</p>
          {detailed && box.height >= 88 && event.attendees && event.attendees.length > 0 && (
            <div className="mt-1.5 flex -space-x-1.5">
              {event.attendees.slice(0, 4).map(a => (
                <span
                  key={a.id}
                  title={a.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/20 bg-black/30 text-[10px] font-semibold"
                >
                  {a.name.charAt(0)}
                </span>
              ))}
              {event.attendees.length > 4 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/20 bg-black/50 text-[10px]">
                  +{event.attendees.length - 4}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Visual do evento durante o arraste. */
export function DragPreview({ event }: { event: TimeGridEvent }) {
  return (
    <div
      className="w-40 cursor-grabbing rounded-lg px-2 py-1.5 text-white shadow-2xl"
      style={{ backgroundColor: event.color || '#fc7a67' }}
    >
      <p className="truncate text-xs font-semibold">{event.title}</p>
      <p className="text-[11px] opacity-80">{format(new Date(event.startTime), 'HH:mm')}</p>
    </div>
  )
}
