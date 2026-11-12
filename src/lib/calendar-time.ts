/**
 * Helpers de horário para eventos que podem atravessar a meia-noite
 * (ex.: sessão das 22:00 às 05:00 do dia seguinte).
 */

const MINUTES_PER_DAY = 24 * 60

/** Converte "HH:mm" em minutos desde 00:00. Retorna NaN se inválido. */
export function parseTimeToMinutes(value: string | null | undefined): number {
  if (!value) return NaN
  const [h, m] = value.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN
  return h * 60 + m
}

/** True quando o horário de término cai no dia seguinte ao início. */
export function endsNextDay(startTime: string, endTime: string): boolean {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  return Number.isFinite(start) && Number.isFinite(end) && end < start
}

/** Duração em minutos entre "HH:mm" de início e fim, considerando virada de dia. */
export function durationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return NaN
  const diff = end - start
  return diff < 0 ? diff + MINUTES_PER_DAY : diff
}

/**
 * Combina uma data base (dia local) com horários "HH:mm".
 * Se o término for anterior ao início, ele vai para o dia seguinte.
 * Lança erro quando os horários são inválidos ou iguais.
 */
export function resolveEventRange(date: Date, startTime: string, endTime: string): { start: Date; end: Date } {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    throw new Error('Horário inválido.')
  }
  if (startMinutes === endMinutes) {
    throw new Error('A hora de término deve ser diferente da hora de início.')
  }
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
  if (endMinutes < startMinutes) end.setDate(end.getDate() + 1)
  return { start, end }
}

/**
 * Recalcula o término a partir do dia do início: mantém o horário do fim
 * e o coloca no mesmo dia do início ou no seguinte, se necessário.
 */
export function alignEndToStart(start: Date, end: Date): Date {
  const aligned = new Date(start.getFullYear(), start.getMonth(), start.getDate(), end.getHours(), end.getMinutes(), 0, 0)
  if (aligned <= start) aligned.setDate(aligned.getDate() + 1)
  return aligned
}

function startOfLocalDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
}

/** True quando o evento ocupa parte do dia informado (inclui continuação após a meia-noite). */
export function eventOverlapsDay(event: { startTime: Date; endTime: Date }, day: Date): boolean {
  const dayStart = startOfLocalDay(day)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  if (start >= dayStart && start < dayEnd) return true
  return start < dayEnd && end > dayStart
}

/** Recorta o intervalo do evento aos limites do dia informado, em minutos desde 00:00. */
export function clipEventToDay(event: { startTime: Date; endTime: Date }, day: Date): { startMinute: number; durationMinutes: number } {
  const dayStart = startOfLocalDay(day).getTime()
  const dayEnd = dayStart + MINUTES_PER_DAY * 60000
  const start = Math.max(new Date(event.startTime).getTime(), dayStart)
  const end = Math.min(new Date(event.endTime).getTime(), dayEnd)
  return {
    startMinute: Math.max(0, (start - dayStart) / 60000),
    durationMinutes: Math.max(0, (end - start) / 60000),
  }
}

/** Data local no formato yyyy-MM-dd (evita o deslocamento de fuso do toISOString). */
export function toLocalDateInput(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
