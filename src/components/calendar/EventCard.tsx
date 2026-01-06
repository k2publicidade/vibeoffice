'use client'

import type { CalendarEvent } from '@/types/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, Trash2, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EventCardProps {
  event: CalendarEvent
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
}

const typeConfig = {
  personal: { label: 'Pessoal', color: 'bg-blue-100 text-blue-800' },
  sector: { label: 'Setor', color: 'bg-orange-100 text-orange-800' },
  company: { label: 'Empresa', color: 'bg-green-100 text-green-800' },
}

export function EventCard({
  event,
  onEdit,
  onDelete,
  showActions = true,
}: EventCardProps) {
  const config = typeConfig[event.type]
  const eventDate = new Date(event.startTime)
  const formattedTime = format(eventDate, 'HH:mm', { locale: ptBR })
  const formattedDate = format(eventDate, "dd 'de' MMMM", { locale: ptBR })

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <div className="h-1 bg-gradient-to-r from-[#fe6e5b] to-[#ff0300]" />

      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{event.title}</h3>
            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {event.description}
              </p>
            )}
          </div>
          {showActions && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={onEdit}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>
              {formattedDate} às {formattedTime}
            </span>
          </div>
        </div>

        {/* Type badge */}
        <div className="flex gap-2 pt-2">
          <Badge className={`${config.color} text-xs`}>{config.label}</Badge>
          {event.sector && (
            <Badge variant="secondary" className="text-xs">
              {event.sector}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
