'use client'

import { useTickets } from '@/hooks/useTickets'
import { Ticket } from '@/types/tickets'
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal'
import { TicketList } from '@/components/tickets/TicketList'
import { TicketFilters } from '@/components/tickets/TicketFilters'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertCircle, LayoutGrid, List, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo, useCallback, Suspense } from 'react'
import { useRecordLink } from '@/hooks/useRecordLink'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

export default function TicketsPage() {
  return <Suspense fallback={<p>Carregando solicitações...</p>}><TicketsPageContent /></Suspense>
}

function TicketsPageContent() {
  const {
    filteredTickets,
    filters,
    setFilters,
    getTicketsByStatus,
    getCommentsByTicketId,
    addComment,
    deleteComment,
    getUserById,
    tickets, // Destructure tickets for realtime updates
    isLoading,
  } = useTickets()

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  // Computar o ticket ativo baseado na lista atualizada (Realtime/Sync)
  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null
    return tickets.find(t => t.id === selectedTicket.id) || selectedTicket
  }, [selectedTicket, tickets])

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  // S-P1-21: sidebar de filtros vira Sheet em mobile/tablet
  const [filtersOpen, setFiltersOpen] = useState(false)
  const handleSelectTicket = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket)
    setIsDetailModalOpen(true)
  }, [])
  const { clearLink } = useRecordLink('open', tickets, !isLoading, handleSelectTicket)

  // Contagem de filtros ativos (para badge no botao mobile)
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.status && filters.status.length > 0) n++
    if (filters.priority) n++
    if (filters.category) n++
    if (filters.assignedTo) n++
    if (filters.searchQuery) n++
    return n
  }, [filters])

  // Obter comentários do ticket selecionado
  const ticketComments = useMemo(() => {
    if (!activeTicket) return []
    return getCommentsByTicketId(activeTicket.id)
  }, [activeTicket, getCommentsByTicketId])

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    clearLink()
    setTimeout(() => {
      setSelectedTicket(null)
    }, 300)
  }

  const handleAddComment = async (content: string, isInternal: boolean) => {
    if (!activeTicket) return

    try {
      await addComment({
        ticketId: activeTicket.id,
        content,
        isInternal,
      })
      toast.success('Comentário adicionado!')
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      toast.error('Erro ao adicionar comentário')
    }
  }

  // Inicia fluxo de delete — abre AlertDialog (sem confirm nativo; ver S-P1-20)
  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId)
  }

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return
    try {
      await deleteComment(commentToDelete)
      toast.success('Comentário excluído!')
    } catch (error) {
      console.error('Erro ao excluir comentário:', error)
      toast.error('Erro ao excluir comentário')
    } finally {
      setCommentToDelete(null)
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
          <div className="flex items-center gap-2 md:gap-4">
            {/* Botao Filtros (mobile/tablet only) — S-P1-21 */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden min-h-11 relative gap-2 border-zinc-700 hover:bg-zinc-800"
              onClick={() => setFiltersOpen(true)}
              aria-label="Abrir filtros"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px] bg-orange-500 text-white border-none">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

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

            {/* Botão "Novo Ticket" removido: tickets são criados automaticamente via tasks */}
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
        {/* Sidebar de Filtros — desktop only (S-P1-21) */}
        <div className="hidden lg:block lg:w-80 flex-shrink-0">
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

      {/* Sheet de filtros — mobile/tablet (S-P1-21) */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="w-[85vw] max-w-sm p-0 bg-zinc-950 border-zinc-800 lg:hidden"
        >
          <SheetHeader className="px-4 pt-6 pb-2">
            <SheetTitle className="text-zinc-100">Filtros</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100vh-5rem)] px-4 pb-6">
            <TicketFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </SheetContent>
      </Sheet>

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

      {/* AlertDialog: confirmar exclusão de comentário */}
      <AlertDialog
        open={!!commentToDelete}
        onOpenChange={(open) => {
          if (!open) setCommentToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteComment}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
