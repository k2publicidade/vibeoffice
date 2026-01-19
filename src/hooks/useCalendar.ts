'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { CalendarEvent } from '@/types/calendar'
import { isSameDay, isToday, isBefore, isAfter, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export interface CreateEventInput {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  type: CalendarEvent['type']
  location?: string | null
  attendees?: string[]
  linkedTaskId?: string
  linkedTicketId?: string
}

export interface UseCalendarReturn {
  events: CalendarEvent[]
  isLoading: boolean
  getEventsByDate: (date: Date) => CalendarEvent[]
  getEventsByMonth: (date: Date) => CalendarEvent[]
  getUpcomingEvents: (days?: number) => CalendarEvent[]
  getEventById: (id: string) => CalendarEvent | null
  createEvent: (event: CreateEventInput) => Promise<void>
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  duplicateEvent: (id: string) => Promise<void>
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
        data.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          startTime: new Date(event.start_time),
          endTime: new Date(event.end_time),
          type: event.type as 'personal' | 'sector' | 'company',
          location: event.location,
          attendees: event.attendees || [],
          createdBy: event.created_by,
          createdAt: new Date(event.created_at),
          updatedAt: new Date(event.created_at), // DB não tem updated_at, usando created_at
          linkedTaskId: event.linked_task_id || undefined,
          linkedTicketId: event.linked_ticket_id || undefined,
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
    async (event: CreateEventInput) => {
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
          attendees: event.attendees || [],
          created_by: user.id,
          linked_task_id: event.linkedTaskId || null,
          linked_ticket_id: event.linkedTicketId || null,
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
        attendees: data.attendees || [],
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.created_at), // DB não tem updated_at
        linkedTaskId: (data as any).linked_task_id || undefined,
        linkedTicketId: (data as any).linked_ticket_id || undefined,
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
          attendees: updates.attendees,
          linked_task_id: updates.linkedTaskId || null,
          linked_ticket_id: updates.linkedTicketId || null,
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
                attendees: data.attendees || [],
                updatedAt: new Date(), // DB não tem updated_at, usando data atual
                linkedTaskId: (data as any).linked_task_id || undefined,
                linkedTicketId: (data as any).linked_ticket_id || undefined,
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

  const duplicateEvent = useCallback(
    async (id: string) => {
      if (!user) throw new Error('User not authenticated')

      // Buscar o evento original
      const originalEvent = events.find((event) => event.id === id)
      if (!originalEvent) throw new Error('Event not found')

      // Criar cópia do evento com novo título
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: `${originalEvent.title} (Cópia)`,
          description: originalEvent.description,
          start_time: originalEvent.startTime.toISOString(),
          end_time: originalEvent.endTime.toISOString(),
          type: originalEvent.type,
          location: originalEvent.location,
          attendees: originalEvent.attendees || [],
          created_by: user.id,
          linked_task_id: originalEvent.linkedTaskId || null,
          linked_ticket_id: originalEvent.linkedTicketId || null,
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
        attendees: data.attendees || [],
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.created_at),
        linkedTaskId: (data as any).linked_task_id || undefined,
        linkedTicketId: (data as any).linked_ticket_id || undefined,
      }

      setEvents((prev) => [...prev, newEvent])
    },
    [user, events]
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
    isLoading,
    getEventsByDate,
    getEventsByMonth,
    getUpcomingEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    getEventsByType,
    getMonthDays,
  }
}
