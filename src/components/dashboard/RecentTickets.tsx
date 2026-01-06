'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { mockTickets } from '@/lib/mock-data'

const statusConfig = {
  open: {
    label: 'Aberto',
    color: 'bg-yellow-500',
    icon: AlertCircle,
  },
  analyzing: {
    label: 'Em Análise',
    color: 'bg-blue-500',
    icon: Clock,
  },
  in_progress: {
    label: 'Em Execução',
    color: 'bg-orange-500',
    icon: Clock,
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
    icon: CheckCircle2,
  },
}

export function RecentTickets() {
  // Pegar últimos 5 tickets abertos ou em análise
  const recentTickets = mockTickets
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tickets Recentes</span>
          <Badge variant="secondary">{mockTickets.filter(t => t.status !== 'completed').length} abertos</Badge>
        </CardTitle>
        <CardDescription>
          Solicitações aguardando ação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentTickets.length > 0 ? (
            recentTickets.map((ticket) => {
              const status = statusConfig[ticket.status as keyof typeof statusConfig]
              const StatusIcon = status?.icon || Clock

              return (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`${status?.color} rounded-full p-2 mt-0.5 flex-shrink-0`}>
                      <StatusIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {ticket.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {status?.label}
                  </Badge>
                </div>
              )
            })
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum ticket aberto</p>
            </div>
          )}
        </div>

        {recentTickets.length > 0 && (
          <Button asChild variant="ghost" className="w-full mt-4" >
            <Link href="/tickets" className="flex items-center justify-center gap-2">
              Ver todos os tickets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
