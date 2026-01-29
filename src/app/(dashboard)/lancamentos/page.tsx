'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReleases } from '@/hooks/useReleases'
import { ReleasesKanbanBoard, ReleaseColumnData } from '@/components/releases/ReleasesKanbanBoard'
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
  released: 'Lançado',
}

export default function LancamentosPage() {
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
  } = useReleases()

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
      toast.success('Lançamento movido com sucesso!')
    } catch (error) {
      console.error('Error moving release:', error)
      toast.error('Erro ao mover lançamento')
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
      toast.success('Lançamento criado com sucesso!')
    } catch (error) {
      console.error('Error creating release:', error)
      toast.error('Erro ao criar lançamento')
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
      toast.success('Lançamento atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating release:', error)
      toast.error('Erro ao atualizar lançamento')
      throw error
    }
  }

  const handleDuplicateRelease = async (id: string) => {
    const original = filteredReleases.find(r => r.id === id)
    if (!original) return
    try {
      await createRelease({
        title: `${original.title} (Cópia)`,
        artist: original.artist,
        releaseType: original.releaseType,
        genre: original.genre,
        releaseDate: original.releaseDate,
        status: original.status,
        coverUrl: original.coverUrl,
        spotifyUrl: original.spotifyUrl,
        appleMusicUrl: original.appleMusicUrl,
        youtubeUrl: original.youtubeUrl,
        isrc: original.isrc,
        upc: original.upc,
        label: original.label,
        distributor: original.distributor,
        notes: original.notes,
        sector: original.sector,
      })
      toast.success('Lançamento duplicado com sucesso!')
      setDetailsModalOpen(false)
    } catch (error) {
      console.error('Error duplicating release:', error)
      toast.error('Erro ao duplicar lançamento')
    }
  }

  const handleDeleteRelease = async (releaseOrId: Release | string) => {
    const id = typeof releaseOrId === 'string' ? releaseOrId : releaseOrId.id
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return
    try {
      await deleteRelease(id)
      toast.success('Lançamento excluído com sucesso!')
      setDetailsModalOpen(false)
    } catch (error) {
      console.error('Error deleting release:', error)
      toast.error('Erro ao excluir lançamento')
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
              <h1 className="text-xl md:text-2xl font-bold text-white">Lançamentos</h1>
              <p className="text-gray-500 text-xs md:text-sm">
                Gerencie todos os lançamentos musicais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleAddRelease('scheduled')}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Buscar por título ou artista..."
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
              <SelectItem value="album" className="text-white">Álbum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 text-sm">Carregando lançamentos...</div>
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
      </div>

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
