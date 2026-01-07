'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type {
  Announcement,
  AnnouncementWithAuthor,
  CreateAnnouncementData,
  UpdateAnnouncementData,
  AnnouncementPriority,
} from '@/types/announcements'
import { toast } from 'sonner'

export interface UseAnnouncementsReturn {
  /** Avisos ativos e não expirados (filtrados por setor do usuário) */
  announcements: AnnouncementWithAuthor[]
  /** Todos os avisos (para página admin) */
  allAnnouncements: AnnouncementWithAuthor[]
  /** Estado de carregamento */
  isLoading: boolean
  /** Criar novo aviso */
  createAnnouncement: (data: CreateAnnouncementData) => Promise<Announcement | null>
  /** Atualizar aviso existente */
  updateAnnouncement: (id: string, data: UpdateAnnouncementData) => Promise<Announcement | null>
  /** Arquivar aviso (active = false) */
  archiveAnnouncement: (id: string) => Promise<boolean>
  /** Deletar aviso permanentemente */
  deleteAnnouncement: (id: string) => Promise<boolean>
  /** Buscar aviso por ID */
  getAnnouncementById: (id: string) => AnnouncementWithAuthor | null
  /** Recarregar avisos */
  refetch: () => Promise<void>
}

export function useAnnouncements(): UseAnnouncementsReturn {
  const [allAnnouncements, setAllAnnouncements] = useState<AnnouncementWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Fetch inicial de avisos + Realtime subscription
  useEffect(() => {
    if (!user) return

    fetchAnnouncements()

    // Setup Realtime subscription
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'company_announcements',
        },
        (payload) => {
          console.log('[useAnnouncements] Realtime event:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch completo para pegar dados do autor
            // (Realtime só traz os dados da tabela, não joins)
            fetchAnnouncements()
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted announcement
            setAllAnnouncements((prev) => prev.filter(a => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [user])

  async function fetchAnnouncements() {
    setIsLoading(true)
    try {
      // Buscar avisos com informações do autor (JOIN)
      const { data, error } = await supabase
        .from('company_announcements')
        .select(`
          *,
          author:users!created_by (
            id,
            name,
            avatar,
            sector
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Mapear para AnnouncementWithAuthor
      const mapped: AnnouncementWithAuthor[] = data.map((a: any) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        priority: a.priority as AnnouncementPriority,
        created_by: a.created_by,
        target_sectors: a.target_sectors || [],
        expires_at: a.expires_at,
        active: a.active,
        metadata: a.metadata || {},
        created_at: a.created_at,
        updated_at: a.updated_at,
        author: a.author || {
          id: a.created_by,
          name: 'Usuário Desconhecido',
          avatar: null,
          sector: 'Administrativo' as any,
        },
      }))

      setAllAnnouncements(mapped)
    } catch (error) {
      console.error('[useAnnouncements] Error fetching:', error)
      toast.error('Erro ao carregar avisos')
    } finally {
      setIsLoading(false)
    }
  }

  // Avisos filtrados para o usuário atual
  // Mostra apenas avisos ativos, não expirados, do setor do usuário ou gerais
  const announcements = useMemo(() => {
    if (!user) return []

    const now = new Date().toISOString()

    return allAnnouncements.filter((announcement) => {
      // Filtrar apenas ativos
      if (!announcement.active) return false

      // Filtrar apenas não expirados
      if (announcement.expires_at <= now) return false

      // Filtrar por setor (avisos gerais ou do setor do usuário)
      const isGeneral = announcement.target_sectors.length === 0
      const isForUserSector = announcement.target_sectors.includes(user.sector)

      return isGeneral || isForUserSector
    })
    // Ordenar por prioridade (urgent → warning → info) + created_at DESC
    .sort((a, b) => {
      // Ordenação por prioridade
      const priorityOrder: Record<AnnouncementPriority, number> = {
        urgent: 3,
        warning: 2,
        info: 1,
      }

      const aPriority = priorityOrder[a.priority] || 0
      const bPriority = priorityOrder[b.priority] || 0

      if (aPriority !== bPriority) {
        return bPriority - aPriority // Maior prioridade primeiro
      }

      // Se mesma prioridade, ordenar por data de criação (mais recente primeiro)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [allAnnouncements, user])

  // Criar novo aviso
  const createAnnouncement = useCallback(
    async (data: CreateAnnouncementData): Promise<Announcement | null> => {
      if (!user) {
        toast.error('Você precisa estar autenticado')
        return null
      }

      try {
        // Validar permissões no client (RLS também valida no servidor)
        if (user.role !== 'Admin' && user.role !== 'Gerente') {
          toast.error('Apenas Admin ou Gerente podem criar avisos')
          return null
        }

        // Se Gerente, garantir que está criando para seu setor
        if (user.role === 'Gerente') {
          const isGeneral = data.target_sectors.length === 0
          const includesOwnSector = data.target_sectors.includes(user.sector)

          if (!isGeneral && !includesOwnSector) {
            toast.error('Gerentes só podem criar avisos para seu setor')
            return null
          }
        }

        // Preparar dados para insert
        const insertData = {
          title: data.title.trim(),
          message: data.message.trim(),
          priority: data.priority,
          created_by: user.id,
          target_sectors: data.target_sectors,
          expires_at: typeof data.expires_at === 'string'
            ? data.expires_at
            : data.expires_at.toISOString(),
          active: data.active !== undefined ? data.active : true,
          metadata: data.metadata || {},
        }

        const { data: newAnnouncement, error } = await supabase
          .from('company_announcements')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error

        toast.success('Aviso criado com sucesso!')

        // Fetch completo para atualizar lista com autor
        await fetchAnnouncements()

        return newAnnouncement as Announcement
      } catch (error) {
        console.error('[useAnnouncements] Error creating:', error)
        toast.error('Erro ao criar aviso')
        return null
      }
    },
    [user]
  )

  // Atualizar aviso
  const updateAnnouncement = useCallback(
    async (id: string, data: UpdateAnnouncementData): Promise<Announcement | null> => {
      if (!user) {
        toast.error('Você precisa estar autenticado')
        return null
      }

      try {
        // Preparar apenas campos fornecidos
        const updateData: any = {}

        if (data.title !== undefined) updateData.title = data.title.trim()
        if (data.message !== undefined) updateData.message = data.message.trim()
        if (data.priority !== undefined) updateData.priority = data.priority
        if (data.target_sectors !== undefined) updateData.target_sectors = data.target_sectors
        if (data.expires_at !== undefined) {
          updateData.expires_at = typeof data.expires_at === 'string'
            ? data.expires_at
            : data.expires_at.toISOString()
        }
        if (data.active !== undefined) updateData.active = data.active
        if (data.metadata !== undefined) updateData.metadata = data.metadata

        const { data: updatedAnnouncement, error } = await supabase
          .from('company_announcements')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        toast.success('Aviso atualizado com sucesso!')

        // Fetch completo para atualizar lista
        await fetchAnnouncements()

        return updatedAnnouncement as Announcement
      } catch (error) {
        console.error('[useAnnouncements] Error updating:', error)
        toast.error('Erro ao atualizar aviso')
        return null
      }
    },
    [user]
  )

  // Arquivar aviso (active = false)
  const archiveAnnouncement = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado')
        return false
      }

      try {
        const { error } = await supabase
          .from('company_announcements')
          .update({ active: false })
          .eq('id', id)

        if (error) throw error

        toast.success('Aviso arquivado com sucesso!')

        // Atualizar estado local
        setAllAnnouncements((prev) =>
          prev.map(a => a.id === id ? { ...a, active: false } : a)
        )

        return true
      } catch (error) {
        console.error('[useAnnouncements] Error archiving:', error)
        toast.error('Erro ao arquivar aviso')
        return false
      }
    },
    [user]
  )

  // Deletar aviso permanentemente
  const deleteAnnouncement = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado')
        return false
      }

      try {
        const { error } = await supabase
          .from('company_announcements')
          .delete()
          .eq('id', id)

        if (error) throw error

        toast.success('Aviso deletado com sucesso!')

        // Atualizar estado local
        setAllAnnouncements((prev) => prev.filter(a => a.id !== id))

        return true
      } catch (error) {
        console.error('[useAnnouncements] Error deleting:', error)
        toast.error('Erro ao deletar aviso')
        return false
      }
    },
    [user]
  )

  // Buscar aviso por ID
  const getAnnouncementById = useCallback(
    (id: string): AnnouncementWithAuthor | null => {
      return allAnnouncements.find(a => a.id === id) || null
    },
    [allAnnouncements]
  )

  // Refetch manual
  const refetch = useCallback(async () => {
    await fetchAnnouncements()
  }, [])

  return {
    announcements,
    allAnnouncements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    archiveAnnouncement,
    deleteAnnouncement,
    getAnnouncementById,
    refetch,
  }
}
