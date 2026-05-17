'use client'

import { useTickets } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { Ticket } from '@/types/tickets'
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal'
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal'
import { TicketList } from '@/components/tickets/TicketList'
import { TicketFilters } from '@/components/tickets/TicketFilters'
import { Button } from '@/components/ui/button'
import { Plus, AlertCircle, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { CreateTicketInput } from '@/lib/schemas'
import { toast } from 'sonner'

export default function TicketsPage() {
  const {
    filteredTickets,
    filters,
    setFilters,
    getTicketsByStatus,
    createTicket,
    getCommentsByTicketId,
    addComment,
    deleteComment,
    getUserById,
    tickets, // Destructure tickets for realtime updates
  } = useTickets()
  const { user } = useAuth()

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  // Computar o ticket ativo baseado na lista atualizada (Realtime/Sync)
  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null
    return tickets.find(t => t.id === selectedTicket.id) || selectedTicket
  }, [selectedTicket, tickets])

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Obter comentários do ticket selecionado
  const ticketComments = useMemo(() => {
    if (!activeTicket) return []
    return getCommentsByTicketId(activeTicket.id)
  }, [activeTicket, getCommentsByTicketId])

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setTimeout(() => {
      setSelectedTicket(null)
    }, 300)
  }

  const handleCreateTicket = async (data: CreateTicketInput) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    try {
      await createTicket({
        ...data,
        status: 'open',
        requester: user.id,
      })
      toast.success('Ticket criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar ticket:', error)
      toast.error('Erro ao criar ticket')
    }
  }

  const handleAddComment = (content: string, isInternal: boolean) => {
    if (!activeTicket) return

    addComment({
      ticketId: activeTicket.id,
      content,
      isInternal,
    })
    toast.success('Comentário adicionado!')
  }

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Tem certeza que deseja excluir este comentário?')) {
      deleteComment(commentId)
      toast.success('Comentário excluído!')
    }
  }

  // Contar tickets por status
  const openCount = getTicketsByStatus('open').length
  const analyzingCount = getTicketsByStatus('analyzing').length
  const inProgressCount = getTicketsByStatus('in_progress').length
  const completedCount = getTicketsByStatus('completed').length

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Tickets</h1>
            <p className="text-muted-foreground">
              Gerencie solicitações e problemas reportados
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center bg-zinc-800/50 border border-zinc-700/50 rounded-full p-1 self-center">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  viewMode === 'grid'
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Visualização em Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  viewMode === 'list'
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Visualização em Lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Botão removido: tickets são criados automaticamente via tasks
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 rounded-full px-6 h-11 bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] hover:from-[#ff0300] hover:to-[#cc0200] transition-all shadow-lg shadow-[#ff0300]/20 border-none"
            >
              <Plus className="h-4 w-4" />
              Novo Ticket
            </Button>
            */}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'A Fazer', count: openCount, borderColor: 'border-zinc-500/20', color: 'text-zinc-500', bg: 'bg-zinc-500/5' },
          { label: 'Em Análise', count: analyzingCount, borderColor: 'border-blue-500/20', color: 'text-blue-500', bg: 'bg-blue-500/5' },
          { label: 'Em Progresso', count: inProgressCount, borderColor: 'border-orange-500/20', color: 'text-orange-500', bg: 'bg-orange-500/5' },
          { label: 'Concluídos', count: completedCount, borderColor: 'border-green-500/20', color: 'text-green-500', bg: 'bg-green-500/5' },
        ].map((stat, i) => (
          <div key={i} className={cn("rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-5 transition-all hover:bg-zinc-800/80 group", stat.bg)}>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.label}</p>
            <div className={`text-3xl font-bold mt-2 tracking-tight ${stat.color}`}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de Filtros */}
        <div className="lg:w-80 flex-shrink-0">
          <TicketFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Lista de Tickets */}
        <div className="flex-1 min-w-0 space-y-6">
          {filteredTickets.length > 0 ? (
            <>
              <TicketList
                tickets={filteredTickets}
                onSelectTicket={handleSelectTicket}
                view={viewMode}
              />

              <div className="pt-6 border-t border-zinc-800">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
                  Mostrando <strong className="text-zinc-300">{filteredTickets.length}</strong> tickets
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-zinc-800/20 border border-zinc-700/30 p-16 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto" />
              <div>
                <h3 className="font-semibold text-zinc-300 mb-1">Nenhum ticket encontrado</h3>
                <p className="text-sm text-zinc-500">
                  Tente ajustar seus filtros ou criar um novo ticket
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-zinc-700 mt-4"
                onClick={() => setFilters({})}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={activeTicket}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        comments={ticketComments}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        getUserById={getUserById}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTicket={handleCreateTicket}
      />
    </div>
  )
}
