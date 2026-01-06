'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type RequestStatus = 'processing' | 'approved' | 'rejected' | 'pending'

interface Request {
  id: string
  startDate: Date
  endDate: Date
  type: string
  assignedTo: {
    id: string
    name: string
    avatar?: string
  }
  status: RequestStatus
}

interface RequestsTableProps {
  requests: Request[]
}

export function RequestsTable({ requests }: RequestsTableProps) {
  return (
    <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-6 transition-all hover:bg-zinc-800/80">
      <div className="pb-4 border-b border-zinc-800 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">Solicitações</h3>
          <Badge className="rounded-full bg-orange-500/20 text-orange-400 border-none px-3 py-0.5 text-xs font-medium uppercase tracking-wider">
            Em análise
          </Badge>
        </div>
      </div>
      <div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="pb-4 text-left font-semibold">Datas</th>
                <th className="pb-4 text-left font-semibold">Tipo</th>
                <th className="pb-4 text-left font-semibold">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {requests.map((request, index) => (
                <tr
                  key={request.id}
                  className="group cursor-pointer transition-colors hover:bg-zinc-800/50"
                >
                  <td className="py-4 text-sm text-zinc-300">
                    {format(request.startDate, 'dd.MM.yy', { locale: ptBR })} -{' '}
                    {format(request.endDate, 'dd.MM.yy', { locale: ptBR })}
                  </td>
                  <td className="py-4 text-sm text-zinc-400 font-medium">{request.type}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-zinc-700/50">
                        <AvatarImage
                          src={request.assignedTo.avatar}
                          alt={request.assignedTo.name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-[10px] font-semibold">
                          {request.assignedTo.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-orange-400 transition-colors">
                        {request.assignedTo.name}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
