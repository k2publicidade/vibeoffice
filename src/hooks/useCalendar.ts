'use client'

import { useState, useCallback, useMemo } from 'react'
import type { CalendarEvent } from '@/types/calendar'
import { mockCalendarEvents } from '@/lib/mock-data'
import { isSameDay, isToday, isBefore, isAfter, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export interface UseCalendarReturn {
  events: CalendarEvent[]
  getEventsByDate: (date: Date) => CalendarEvent[]
  getEventsByMonth: (date: Date) => CalendarEvent[]
  getUpcomingEvents: (days?: number) => CalendarEvent[]
  getEventById: (id: string) => CalendarEvent | null
  createEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  getEventsByType: (type: CalendarEvent['type']) => CalendarEvent[]
  getMonthDays: (date: Date) => Date[]
}

export function useCalendar(): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>(mockCalendarEvents)

  const getEventsByDate = useCallback(
    (date: Date) => {
      return events.filter((event) => isSameDay(new Date(event.startTime), date))
    },
    [events]
  )

  const getEventsByMonth = useCallback(
    (date: Date) => {
      const start = startOfMonth(date)
      const end = endOfMonth(date)
      return events.filter((event) => {
        const eventDate = new Date(event.startTime)
        return eventDate >= start && eventDate <= end
      })
    },
    [events]
  )

  const getUpcomingEvents = useCallback(
    (days = 7) => {
      const now = new Date()
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

      return events
        .filter((event) => {
          const eventDate = new Date(event.startTime)
          return (
            (isToday(eventDate) ||
              isAfter(eventDate, now)) &&
            isBefore(eventDate, futureDate)
          )
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    },
    [events]
  )

  const getEventById = useCallback(
    (id: string) => {
      return events.find((event) => event.id === id) || null
    },
    [events]
  )

  const createEvent = useCallback(
    (event: Omit<CalendarEvent, 'id'>) => {
      const newEvent: CalendarEvent = {
        ...event,
        id: `event-${Date.now()}`,
      }
      setEvents((prev) => [...prev, newEvent])
    },
    []
  )

  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEvent>) => {
      setEvents((prev) =>
        prev.map((event) => (event.id === id ? { ...event, ...updates } : event))
      )
    },
    []
  )

  const deleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((event) => event.id !== id))
    },
    []
  )

  const getEventsByType = useCallback(
    (type: CalendarEvent['type']) => {
      return events.filter((event) => event.type === type)
    },
    [events]
  )

  const getMonthDays = useCallback((date: Date) => {
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    return eachDayOfInterval({ start, end })
  }, [])

  return {
    events,
    getEventsByDate,
    getEventsByMonth,
    getUpcomingEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsByType,
    getMonthDays,
  }
}
