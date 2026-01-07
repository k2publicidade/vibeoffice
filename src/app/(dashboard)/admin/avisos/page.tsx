'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ArrowLeft } from 'lucide-react'
import { AnnouncementStats } from '@/components/announcements/AnnouncementStats'
import { AnnouncementFilters } from '@/components/announcements/AnnouncementFilters'
import { AnnouncementsTable } from '@/components/announcements/AnnouncementsTable'
import { CreateAnnouncementModal } from '@/components/announcements/CreateAnnouncementModal'
import { toast } from 'sonner'
import type { AnnouncementPriority, CreateAnnouncementData } from '@/types/announcements'
import type { Sector } from '@/types/auth'

export default function AnnouncementsAdminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const {
    allAnnouncements,
    isLoading: announcementsLoading,
    archiveAnnouncement,
    deleteAnnouncement,
    createAnnouncement,
    getAnnouncementById,
  } = useAnnouncements()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<AnnouncementPriority | 'all'>('all')
  const [selectedSector, setSelectedSector] = useState<Sector | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'expired' | 'archived'>(
    'all'
  )

  // Redirect se não for Admin ou Gerente
  if (!authLoading && user && user.role !== 'Admin' && user.role !== 'Gerente') {
    router.push('/')
    return null
  }

  // Filtrar avisos
  const filteredAnnouncements = useMemo(() => {
    const now = new Date().toISOString()

    return allAnnouncements.filter((announcement) => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = announcement.title.toLowerCase().includes(query)
        const matchesMessage = announcement.message.toLowerCase().includes(query)
        if (!matchesTitle && !matchesMessage) return false
      }

      // Filtro de prioridade
      if (selectedPriority !== 'all' && announcement.priority !== selectedPriority) {
        return false
      }

      // Filtro de setor
      if (selectedSector !== 'all') {
        const hasAllSectors = announcement.target_sectors.length === 0
        const hasSector = announcement.target_sectors.includes(selectedSector)
        if (!hasAllSectors && !hasSector) return false
      }

      // Filtro de status
      if (selectedStatus !== 'all') {
        const isArchived = !announcement.active
        const isExpired = announcement.active && announcement.expires_at <= now
        const isActive = announcement.active && announcement.expires_at > now

        if (selectedStatus === 'archived' && !isArchived) return false
        if (selectedStatus === 'expired' && !isExpired) return false
        if (selectedStatus === 'active' && !isActive) return false
      }

      // Se Gerente, filtrar apenas avisos do seu setor
      if (user?.role === 'Gerente') {
        const isGeneral = announcement.target_sectors.length === 0
        const isOwnSector = announcement.target_sectors.includes(user.sector)
        if (!isGeneral && !isOwnSector) return false
      }

      return true
    })
  }, [allAnnouncements, searchQuery, selectedPriority, selectedSector, selectedStatus, user])

  // Verificar se há filtros ativos
  const hasActiveFilters = !!(
    searchQuery ||
    selectedPriority !== 'all' ||
    selectedSector !== 'all' ||
    selectedStatus !== 'all'
  )

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedPriority('all')
    setSelectedSector('all')
    setSelectedStatus('all')
  }

  // Handlers
  const handleCreate = () => {
    setEditingId(undefined)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setIsCreateModalOpen(true)
  }

  const handleDuplicate = async (id: string) => {
    const original = getAnnouncementById(id)
    if (!original) return

    // Criar cópia com novo título
    const duplicateData: CreateAnnouncementData = {
      title: `${original.title} (cópia)`,
      message: original.message,
      priority: original.priority,
      target_sectors: original.target_sectors,
      expires_at: original.expires_at,
      active: false, // Criar como rascunho
      metadata: original.metadata,
    }

    await createAnnouncement(duplicateData)
    toast.success('Aviso duplicado como rascunho')
  }

  // Loading state
  if (authLoading || announcementsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Avisos</h1>
          </div>
          <p className="text-muted-foreground">
            {user?.role === 'Admin'
              ? 'Gerencie todos os avisos da empresa'
              : `Gerencie os avisos do setor ${user?.sector}`}
          </p>
        </div>
        <Button onClick={handleCreate} size="default" className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Novo Aviso
        </Button>
      </div>

      {/* Estatísticas */}
      <AnnouncementStats announcements={allAnnouncements} />

      {/* Filtros */}
      <AnnouncementFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        selectedSector={selectedSector}
        onSectorChange={setSelectedSector}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Contador de Resultados */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAnnouncements.length}{' '}
          {filteredAnnouncements.length === 1 ? 'aviso encontrado' : 'avisos encontrados'}
        </p>
      </div>

      {/* Tabela */}
      <AnnouncementsTable
        announcements={filteredAnnouncements}
        onEdit={handleEdit}
        onArchive={archiveAnnouncement}
        onDelete={deleteAnnouncement}
        onDuplicate={handleDuplicate}
      />

      {/* Modal de Criação/Edição */}
      <CreateAnnouncementModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingId(undefined)
        }}
        editingId={editingId}
      />
    </div>
  )
}
