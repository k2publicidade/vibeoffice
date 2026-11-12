import { alignEndToStart, clipEventToDay, durationMinutes, endsNextDay, eventOverlapsDay, resolveEventRange, toLocalDateInput } from '../calendar-time'

describe('calendar-time', () => {
  const day = new Date(2026, 10, 12)

  it('resolves a session from 22:00 to 05:00 into the next day', () => {
    const { start, end } = resolveEventRange(day, '22:00', '05:00')
    expect(start).toEqual(new Date(2026, 10, 12, 22, 0))
    expect(end).toEqual(new Date(2026, 10, 13, 5, 0))
    expect(endsNextDay('22:00', '05:00')).toBe(true)
    expect(durationMinutes('22:00', '05:00')).toBe(7 * 60)
  })

  it('keeps same-day ranges and rejects equal times', () => {
    const { end } = resolveEventRange(day, '09:00', '10:30')
    expect(end).toEqual(new Date(2026, 10, 12, 10, 30))
    expect(endsNextDay('09:00', '10:30')).toBe(false)
    expect(() => resolveEventRange(day, '10:00', '10:00')).toThrow()
    expect(() => resolveEventRange(day, '', '10:00')).toThrow()
  })

  it('shows an overnight event on both days, clipped to each', () => {
    const event = { startTime: new Date(2026, 10, 12, 22), endTime: new Date(2026, 10, 13, 5) }
    expect(eventOverlapsDay(event, day)).toBe(true)
    expect(eventOverlapsDay(event, new Date(2026, 10, 13))).toBe(true)
    expect(eventOverlapsDay(event, new Date(2026, 10, 14))).toBe(false)
    expect(clipEventToDay(event, day)).toEqual({ startMinute: 22 * 60, durationMinutes: 120 })
    expect(clipEventToDay(event, new Date(2026, 10, 13))).toEqual({ startMinute: 0, durationMinutes: 300 })
  })

  it('does not show an event ending exactly at midnight on the next day', () => {
    const event = { startTime: new Date(2026, 10, 12, 23), endTime: new Date(2026, 10, 13, 0) }
    expect(eventOverlapsDay(event, new Date(2026, 10, 13))).toBe(false)
  })

  it('aligns an edited end time after the start', () => {
    expect(alignEndToStart(new Date(2026, 10, 12, 22), new Date(2026, 10, 12, 5))).toEqual(new Date(2026, 10, 13, 5))
    expect(alignEndToStart(new Date(2026, 10, 12, 9), new Date(2026, 10, 13, 11))).toEqual(new Date(2026, 10, 12, 11))
  })

  it('formats the local date without UTC shift', () => {
    expect(toLocalDateInput(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12')
  })
})
