/**
 * Calendar Module Types
 * Defines calendar events and scheduling
 */

import { Sector } from './auth'

export type EventType = 'personal' | 'sector' | 'company'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  type: EventType
  sector?: Sector // For sector events
  attendees: string[] // User IDs
  createdBy: string // User ID
  createdAt: Date
  updatedAt: Date
}

export interface CreateEventInput {
  title: string
  description?: string
  startTime: string
  endTime: string
  type: EventType
  sector?: Sector
  attendees?: string[]
}

export interface UpdateEventInput {
  title?: string
  description?: string
  startTime?: string
  endTime?: string
  attendees?: string[]
}
