'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Disc3, LayoutDashboard, Columns3 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReleases } from '@/hooks/useReleases'
import { useCalendar } from '@/hooks/useCalendar'
import { ReleasesKanbanBoard, ReleaseColumnData } from '@/components/releases/ReleasesKanbanBoard'
import { ReleasesDashboard } from '@/components/releases/ReleasesDashboard'
import { ReleaseModal } from '@/components/releases/ReleaseModal'
import { ReleaseDetailsModal } from '@/components/releases/ReleaseDetailsModal'
import { toast } from 'sonner'
import type { Release, ReleaseStatus, CreateReleaseInput } from '@/types/releases'

const COLUMN_COLORS: Record<ReleaseStatus, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f97316',
  released: '#22c55e',
}

const COLUMN_TITLES: Record<ReleaseStatus, string> = {
  scheduled: 'Programado',
  in_progress: 'Em Andamento',
  released: 'Lancado',
}

export default function LancamentosPage() {
  const { createEvent: createCalendarEvent } = useCalendar()

  const {
    filteredReleases,
    filters,
    setFilters,
    isLoading,
    createRelease,
    updateRelease,
    deleteRelease,
    updateReleaseStatus,
    getReleasesByStatus,
  } = useReleases({ createCalendarEvent })

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null)
  const [initialStatus, setInitialStatus] = useState<ReleaseStatus>('scheduled')

  // Kanban columns
  const columns: ReleaseColumnData[] = useMemo(() => {
    const statuses: ReleaseStatus[] = ['scheduled', 'in_progress', 'released']
    return statuses.map(status => ({
      id: status,
      title: COLUMN_TITLES[status],
      releases: getReleasesByStatus(status),
      color: COLUMN_COLORS[status],
    }))
  }, [getReleasesByStatus])

  // Handlers
  const handleReleaseMove = async (releaseId: string, newStatus: ReleaseStatus) => {
    try {
      await updateReleaseStatus(releaseId, newStatus)
      toast.success('Lancamento movido com sucesso!')
    } catch (error) {
      console.error('Error moving release:', error)
      toast.error('Erro ao mover lancamento')
    }
  }

  const handleAddRelease = (status: ReleaseStatus) => {
    setInitialStatus(status)
    setSelectedRelease(null)
    setCreateModalOpen(true)
  }

  const handleReleaseClick = (release: Release) => {
    setSelectedRelease(release)
    setDetailsModalOpen(true)
  }

  const handleCreateRelease = async (data: CreateReleaseInput) => {
    try {
      await createRelease(data)
      toast.success(`"${data.title}" criado com sucesso!`, {
        description: data.releaseDate
          ? `Agendado para ${format(data.releaseDate, 'dd/MM/yyyy')} e adicionado a agenda`
          : 'Lancamento salvo sem data definida',
      })
    } catch (error) {
      console.error('Error creating release:', error)
      toast.error('Erro ao criar lancamento')
      throw error
    }
  }

  const handleEditRelease = (release: Release) => {
    setSelectedRelease(release)
    setDetailsModalOpen(false)
    setEditModalOpen(true)
  }

  const handleUpdateRelease = async (data: CreateReleaseInput) => {
    if (!selectedRelease) return
    try {
      await updateRelease(selectedRelease.id, {
        ...data,
      })
      toast.success(`"${data.title}" atualizado com sucesso!`, {
        description: data.releaseDate
          ? `Data: ${format(data.releaseDate, 'dd/MM/yyyy')}`
          : 'Sem data definida',
      })
    } catch (error) {
      console.error('Error updating release:', error)
      toast.error('Erro ao atualizar lancamento')
      throw error
    }
  }

  const handleDuplicateRelease = async (id: string) => {
    const original = filteredReleases.find(r => r.id === id)
    if (!original) return
    try {
      await createRelease({
        title: `${original.title} (Copia)`,
        artist: original.artist,
        releaseType: original.releaseType,
        genre: original.genre,
        releaseDate: original.releaseDate,
        status: original.status,
        coverUrl: original.coverUrl,
        composers: original.composers?.length ? [...original.composers] : undefined,
        platformLinks: original.platformLinks?.length ? [...original.platformLinks] : undefined,
        isrc: original.isrc,
        upc: original.upc,
        label: original.label,
        distributor: original.distributor,
        notes: original.notes,
        sector: original.sector,
      })
      toast.success(`"${original.title}" duplicado com sucesso!`)
      setDetailsModalOpen(false)
    } catch (error) {
      console.error('Error duplicating release:', error)
      toast.error('Erro ao duplicar lancamento')
    }
  }

  const handleDeleteRelease = async (releaseOrId: Release | string) => {
    const id = typeof releaseOrId === 'string' ? releaseOrId : releaseOrId.id
    const release = filteredReleases.find(r => r.id === id)
    if (!confirm('Tem certeza que deseja excluir este lancamento?')) return
    try {
      await deleteRelease(id)
      toast.success(`"${release?.title || 'Lancamento'}" excluido com sucesso!`)
      setDetailsModalOpen(false)
    } catch (error) {
      console.error('Error deleting release:', error)
      toast.error('Erro ao excluir lancamento')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 border-b border-[#2a2a2a]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc7a67] to-[#ff0300] flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Lancamentos</h1>
              <p className="text-gray-500 text-xs md:text-sm">
                Gerencie todos os lancamentos musicais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleAddRelease('scheduled')}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Lancamento
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Buscar por titulo ou artista..."
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value || undefined })}
              className="bg-[#111] border-[#2a2a2a] text-white pl-9 text-sm"
            />
          </div>
          <Select
            value={filters.releaseType || 'all'}
            onValueChange={(v) => setFilters({ ...filters, releaseType: v === 'all' ? undefined : v as any })}
          >
            <SelectTrigger className="w-[140px] bg-[#111] border-[#2a2a2a] text-white text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-[#2a2a2a]">
              <SelectItem value="all" className="text-white">Todos</SelectItem>
              <SelectItem value="single" className="text-white">Single</SelectItem>
              <SelectItem value="ep" className="text-white">EP</SelectItem>
              <SelectItem value="album" className="text-white">Album</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs: Dashboard + Kanban */}
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-3 border-b border-[#2a2a2a]">
          <TabsList className="bg-[#111] border border-[#2a2a2a]">
            <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-gray-400">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5 data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-gray-400">
              <Columns3 className="w-3.5 h-3.5" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-sm">Carregando lancamentos...</div>
            </div>
          ) : (
            <ReleasesDashboard releases={filteredReleases} />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-sm">Carregando lancamentos...</div>
            </div>
          ) : (
            <ReleasesKanbanBoard
              columns={columns}
              onReleaseMove={handleReleaseMove}
              onAddRelease={handleAddRelease}
              onReleaseClick={handleReleaseClick}
              onDeleteRelease={(release) => handleDeleteRelease(release)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <ReleaseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateRelease}
        initialStatus={initialStatus}
      />

      {/* Edit Modal */}
      <ReleaseModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateRelease}
        release={selectedRelease}
      />

      {/* Details Modal */}
      <ReleaseDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        release={selectedRelease}
        onEdit={handleEditRelease}
        onDuplicate={handleDuplicateRelease}
        onDelete={handleDeleteRelease}
      />
    </div>
  )
}
