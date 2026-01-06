'use client'

import { Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Attendee {
  id: string
  name: string
  avatar?: string
}

interface Event {
  id: string
  title: string
  time: string
  duration: string
  attendees: Attendee[]
  date: Date
}

interface EventGroup {
  date: string
  events: Event[]
}

interface UpcomingEventsProps {
  eventGroups: EventGroup[]
  newCount?: number
}

export function UpcomingEvents({ eventGroups, newCount = 0 }: UpcomingEventsProps) {
  return (
    <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-6 transition-all hover:bg-zinc-800/80">
      <div className="pb-3 border-b border-zinc-800 mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">Próximos eventos</h3>
          {newCount > 0 && (
            <Badge className="rounded-full bg-orange-500/20 text-orange-500 border-none px-3 py-0.5 text-xs font-medium">
              {newCount} novo{newCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {eventGroups.map((group) => (
          <div key={group.date} className="space-y-4">
            {/* Date header */}
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {format(new Date(group.date), "d 'de' MMMM", { locale: ptBR })}
            </p>

            {/* Events */}
            {group.events.map((event) => (
              <div
                key={event.id}
                className="group flex items-start gap-4 rounded-xl p-3 transition-all hover:bg-zinc-800/80 cursor-pointer border border-transparent hover:border-zinc-700/50"
              >
                {/* Avatar(s) */}
                <div className="flex -space-x-2 shrink-0">
                  {event.attendees.slice(0, 2).map((attendee, index) => (
                    <Avatar
                      key={attendee.id}
                      className="h-9 w-9 border-2 border-zinc-800"
                      style={{ zIndex: event.attendees.length - index }}
                    >
                      <AvatarImage src={attendee.avatar} alt={attendee.name} />
                      <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-[10px] font-semibold">
                        {attendee.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>

                {/* Event info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-200 truncate group-hover:text-orange-400 transition-colors">
                      {event.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-zinc-400">
                      {event.time}
                    </span>
                    <span className="text-zinc-700">•</span>
                    <p className="text-xs text-zinc-500 truncate">
                      {event.attendees.map((a) => a.name.split(' ')[0]).join(', ')}...
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-700/50 shrink-0">
                  <Clock className="h-3.3 w-3.3" />
                  <span>{event.duration}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
