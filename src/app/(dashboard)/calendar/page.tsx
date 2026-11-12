'use client'

import { useCalendar } from '@/hooks/useCalendar'
import { useCalendarDayColors } from '@/hooks/useCalendarDayColors'
import { useUsers } from '@/hooks/useUsers'
import { useTasks } from '@/hooks/useTasks'
import { CalendarScreen } from '@/components/calendar/CalendarScreen'

export default function CalendarPage() {
  const { events, createEvent, updateEvent, deleteEvent, duplicateEvent } = useCalendar()
  const dayColors = useCalendarDayColors()
  const { users } = useUsers()
  const { tasks } = useTasks()

  return (
    <CalendarScreen
      events={events}
      users={users}
      tasks={tasks}
      dayColors={dayColors}
      createEvent={createEvent}
      updateEvent={updateEvent}
      deleteEvent={deleteEvent}
      duplicateEvent={duplicateEvent}
    />
  )
}
