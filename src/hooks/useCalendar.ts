'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { CalendarEvent } from '@/types/calendar'
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
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Fetch inicial de events
  useEffect(() => {
    if (!user) return

    fetchEvents()
  }, [user])

  async function fetchEvents() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) throw error

      setEvents(
        data.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          startTime: new Date(event.start_time),
          endTime: new Date(event.end_time),
          type: event.type as 'personal' | 'sector' | 'company',
          location: event.location,
          participants: event.participants || [],
          createdBy: event.created_by,
        }))
      )
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
    async (event: Omit<CalendarEvent, 'id'>) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          description: event.description,
          start_time: event.startTime.toISOString(),
          end_time: event.endTime.toISOString(),
          type: event.type,
          location: event.location,
          participants: event.participants || [],
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      const newEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        type: data.type as 'personal' | 'sector' | 'company',
        location: data.location,
        participants: data.participants || [],
        createdBy: data.created_by,
      }

      setEvents((prev) => [...prev, newEvent])
    },
    [user]
  )

  const updateEvent = useCallback(
    async (id: string, updates: Partial<CalendarEvent>) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          title: updates.title,
          description: updates.description,
          start_time: updates.startTime?.toISOString(),
          end_time: updates.endTime?.toISOString(),
          type: updates.type,
          location: updates.location,
          participants: updates.participants,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? {
                ...event,
                title: data.title,
                description: data.description || '',
                startTime: new Date(data.start_time),
                endTime: new Date(data.end_time),
                type: data.type as 'personal' | 'sector' | 'company',
                location: data.location,
                participants: data.participants || [],
              }
            : event
        )
      )
    },
    []
  )

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) throw error

    setEvents((prev) => prev.filter((event) => event.id !== id))
  }, [])

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
