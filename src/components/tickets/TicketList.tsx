'use client'

import { Ticket } from '@/types/tickets'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid'
import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketListProps {
  tickets: Ticket[]
  onSelectTicket?: (ticket: Ticket) => void
  view?: 'grid' | 'list'
}

const statusConfig = {
  open: { label: 'Aberto', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle },
  analyzing: { label: 'Em Análise', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
  in_progress: { label: 'Em Execução', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Clock },
  completed: { label: 'Concluído', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'text-zinc-400', icon: ShieldAlert },
  medium: { label: 'Média', color: 'text-blue-400', icon: ShieldAlert },
  high: { label: 'Alta', color: 'text-orange-400', icon: AlertCircle },
}

export function TicketList({ tickets, onSelectTicket, view = 'grid' }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-800/20 border border-zinc-700/30 p-16 text-center space-y-4">
        <p className="text-zinc-500 font-medium">Nenhum ticket encontrado</p>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open
          const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.low
          const StatusIcon = status.icon

          return (
            <div
              key={ticket.id}
              onClick={() => onSelectTicket?.(ticket)}
              className="group flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-gradient-to-br hover:from-[#fc7a67]/25 hover:to-transparent hover:border-zinc-600/50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", status.bg)}>
                  <StatusIcon className={cn("h-5 w-5", status.color)} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                    {ticket.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">#{ticket.id}</span>
                    <span className="text-zinc-700 text-xs">•</span>
                    <span className="text-xs text-zinc-400 truncate">{ticket.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 md:gap-8 shrink-0">
                <div className="flex flex-col items-start md:items-center gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Status</span>
                  <Badge className={cn("rounded-full border-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", status.bg, status.color)}>
                    {status.label}
                  </Badge>
                </div>

                <div className="flex flex-col items-start md:items-center gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Prioridade</span>
                  <div className="flex items-center gap-1.5">
                    <priority.icon className={cn("h-3.5 w-3.5", priority.color)} />
                    <span className="text-xs font-medium text-zinc-300">{priority.label}</span>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Data</span>
                  <span className="text-xs font-medium text-zinc-400">03.01.26</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const bentoItems: BentoItem[] = tickets.map((ticket, index) => {
    const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open
    const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.low
    const Icon = status.icon

    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description || '',
      meta: ticket.id,
      status: status.label,
      tags: [ticket.category, `${priority.label} Prioridade`],
      icon: <Icon className={cn("h-4 w-4", status.color)} />,
      colSpan: index % 4 === 0 ? 2 : 1, // Make every 4th ticket wider for visual interest
      onClick: () => onSelectTicket?.(ticket),
    }
  })

  return (
    <BentoGrid items={bentoItems} />
  )
}
