'use client'

import { Ticket } from '@/types/tickets'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { mockUsers } from '@/lib/mock-data'
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'

interface TicketCardProps {
  ticket: Ticket
  onClick?: () => void
}

const statusConfig = {
  open: { label: 'Aberto', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  analyzing: { label: 'Em Análise', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  in_progress: { label: 'Em Execução', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-blue-100 text-blue-800' },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Alta', color: 'bg-red-100 text-red-800' },
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const assignee = mockUsers.find(u => u.id === ticket.assignedTo)
  const status = statusConfig[ticket.status as keyof typeof statusConfig]
  const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig]

  const initials = assignee?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  const createdDate = new Date(ticket.createdAt).toLocaleDateString('pt-BR')

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {ticket.id}
            </p>
            <h3 className="font-semibold text-foreground line-clamp-2 mt-1">
              {ticket.title}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {ticket.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {ticket.description}
          </p>
        )}

        {/* Status and Priority */}
        <div className="flex gap-2 flex-wrap">
          <Badge className={`${status.color} text-xs`}>
            {status.label}
          </Badge>
          <Badge className={`${priority.color} text-xs`}>
            {priority.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {ticket.category}
          </Badge>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {createdDate}
          </div>

          {assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.avatar} alt={assignee.name} />
              <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
