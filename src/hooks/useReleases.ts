'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { resolveStorageUrl, storageReference } from '@/lib/supabase/storage'
import type { Release, ReleaseStatus, CreateReleaseInput, UpdateReleaseInput, ReleaseFilters } from '@/types/releases'

function parseJsonb<T>(value: any, fallback: T[]): T[] {
  if (!value) return fallback
  if (Array.isArray(value)) return value
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function mapDbToRelease(row: any): Release {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    artists: parseJsonb(row.artists, []),
    releaseType: row.release_type,
    genre: row.genre || undefined,
    releaseDate: row.release_at ? new Date(row.release_at) : row.release_date ? new Date(row.release_date + 'T12:00:00') : undefined,
    status: row.status as ReleaseStatus,
    coverUrl: row.cover_url || undefined,
    fileReferences: { cover: row.cover_url || undefined, wav: row.wav_url || undefined },
    wavUrl: row.wav_url || undefined,
    composers: parseJsonb(row.composers, []),
    tracks: parseJsonb(row.tracks, []),
    platformLinks: parseJsonb(row.platform_links, []),
    isrc: row.isrc || undefined,
    upc: row.upc || undefined,
    label: row.label || undefined,
    distributor: row.distributor || undefined,
    notes: row.notes || undefined,
    sector: row.sector || undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    position: row.position ?? 0,
  }
}

async function mapReleaseWithFiles(row: any): Promise<Release> {
  async function resolveFile(url: string | null | undefined, label: string) {
    try {
      return await resolveStorageUrl(url)
    } catch (error) {
      console.error('Error loading release file:', error)
      toast.error(`Não foi possível carregar ${label} do lançamento.`)
      return undefined
    }
  }
  const [coverUrl, wavUrl] = await Promise.all([
    resolveFile(row.cover_url, 'a capa'),
    resolveFile(row.wav_url, 'o áudio'),
  ])
  return { ...mapDbToRelease(row), coverUrl, wavUrl }
}

function releaseClock(date: Date | null, time?: string) {
  if (!date) return { release_date: null, release_at: null }
  const chosen = new Date(date)
  if (time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Horário inválido')
    const [hours, minutes] = time.split(':').map(Number)
    chosen.setHours(hours, minutes, 0, 0)
  }
  return {
    release_date: `${chosen.getFullYear()}-${String(chosen.getMonth() + 1).padStart(2, '0')}-${String(chosen.getDate()).padStart(2, '0')}`,
    release_at: chosen.toISOString(),
  }
}

export function useReleases() {
  const [releases, setReleases] = useState<Release[]>([])
  const [filters, setFilters] = useState<ReleaseFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const readVersion = useRef(0)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    fetchReleases()

    const channel = supabase
      .channel('releases-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'releases' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchReleases()
          } else if (payload.eventType === 'UPDATE') {
            void fetchReleases()
          } else if (payload.eventType === 'DELETE') {
            invalidateReads()
            setReleases(prev => prev.filter(r => r.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  function invalidateReads() {
    readVersion.current += 1
    setIsLoading(false)
  }

  async function fetchReleases() {
    const version = ++readVersion.current
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      const mapped = await Promise.all((data || []).map(mapReleaseWithFiles))
      if (version === readVersion.current) setReleases(mapped)
    } catch (error) {
      console.error('Error fetching releases:', error)
    } finally {
      if (version === readVersion.current) setIsLoading(false)
    }
  }

  const filteredReleases = useMemo(() => {
    return releases.filter(r => {
      if (filters.status && r.status !== filters.status) return false
      if (filters.releaseType && r.releaseType !== filters.releaseType) return false
      if (filters.artist && !r.artist.toLowerCase().includes(filters.artist.toLowerCase())) return false
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        if (!r.title.toLowerCase().includes(q) && !r.artist.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [releases, filters])

  const createRelease = useCallback(async (input: CreateReleaseInput) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.rpc('save_office_release', {
      release_id: null,
      changes: {
        title: input.title,
        artist: input.artist,
        artists: (input.artists || []) as never,
        release_type: input.releaseType,
        genre: input.genre || null,
        ...releaseClock(input.releaseDate ?? null, input.releaseTime),
        status: input.status || 'scheduled',
        cover_url: input.coverUrl ? storageReference(input.coverUrl) : null,
        wav_url: input.wavUrl ? storageReference(input.wavUrl) : null,
        composers: (input.composers || []) as never,
        tracks: (input.tracks || []) as never,
        platform_links: (input.platformLinks || []) as never,
        isrc: input.isrc || null,
        upc: input.upc || null,
        label: input.label || null,
        distributor: input.distributor || null,
        notes: input.notes || null,
        sector: input.sector || null,
      },
    })

    if (error) throw error

    invalidateReads()
    const newRelease = await mapReleaseWithFiles(data)
    setReleases(prev => [...prev.filter(r => r.id !== newRelease.id), newRelease])

    return newRelease
  }, [user])

  const updateRelease = useCallback(async (id: string, updates: UpdateReleaseInput) => {
    const updateData: Record<string, any> = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.artist !== undefined) updateData.artist = updates.artist
    if (updates.artists !== undefined) updateData.artists = updates.artists || []
    if (updates.releaseType !== undefined) updateData.release_type = updates.releaseType
    if (updates.genre !== undefined) updateData.genre = updates.genre || null
    if (updates.releaseDate !== undefined) Object.assign(updateData, releaseClock(updates.releaseDate, updates.releaseTime))
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.coverUrl !== undefined) updateData.cover_url = updates.coverUrl ? storageReference(updates.coverUrl) : null
    if (updates.wavUrl !== undefined) updateData.wav_url = updates.wavUrl ? storageReference(updates.wavUrl) : null
    if (updates.composers !== undefined) updateData.composers = updates.composers || []
    if (updates.tracks !== undefined) updateData.tracks = updates.tracks || []
    if (updates.platformLinks !== undefined) updateData.platform_links = updates.platformLinks || []
    if (updates.isrc !== undefined) updateData.isrc = updates.isrc || null
    if (updates.upc !== undefined) updateData.upc = updates.upc || null
    if (updates.label !== undefined) updateData.label = updates.label || null
    if (updates.distributor !== undefined) updateData.distributor = updates.distributor || null
    if (updates.notes !== undefined) updateData.notes = updates.notes || null
    if (updates.sector !== undefined) updateData.sector = updates.sector || null
    if (updates.position !== undefined) updateData.position = updates.position

    const { data, error } = await supabase.rpc('save_office_release', { release_id: id, changes: updateData })

    if (error) throw error

    invalidateReads()
    const updated = await mapReleaseWithFiles(data)
    setReleases(prev => prev.map(r => r.id === id ? updated : r))

    return updated
  }, [])

  const deleteRelease = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('releases')
      .delete()
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw error
    invalidateReads()
    setReleases(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateReleaseStatus = useCallback(async (id: string, status: ReleaseStatus, position?: number) => {
    const updateData: Record<string, any> = { status }
    if (position !== undefined) updateData.position = position

    const { data, error } = await supabase.rpc('save_office_release', { release_id: id, changes: updateData })

    if (error) throw error

    invalidateReads()
    const updated = await mapReleaseWithFiles(data)
    setReleases(prev => prev.map(r => r.id === id ? updated : r))
    return updated
  }, [])

  const getReleasesByStatus = useCallback((status: ReleaseStatus) => {
    return filteredReleases
      .filter(r => r.status === status)
      .sort((a, b) => a.position - b.position)
  }, [filteredReleases])

  return {
    releases,
    filteredReleases,
    filters,
    setFilters,
    isLoading,
    createRelease,
    updateRelease,
    deleteRelease,
    updateReleaseStatus,
    getReleasesByStatus,
  }
}
