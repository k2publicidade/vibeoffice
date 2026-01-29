'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { Release, ReleaseStatus, CreateReleaseInput, ReleaseFilters } from '@/types/releases'
import type { CreateEventInput } from './useCalendar'

function mapDbToRelease(row: any): Release {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    releaseType: row.release_type,
    genre: row.genre || undefined,
    releaseDate: row.release_date ? new Date(row.release_date) : undefined,
    status: row.status as ReleaseStatus,
    coverUrl: row.cover_url || undefined,
    spotifyUrl: row.spotify_url || undefined,
    appleMusicUrl: row.apple_music_url || undefined,
    youtubeUrl: row.youtube_url || undefined,
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

interface UseReleasesOptions {
  createCalendarEvent?: (event: CreateEventInput) => Promise<void>
}

export function useReleases(options?: UseReleasesOptions) {
  const [releases, setReleases] = useState<Release[]>([])
  const [filters, setFilters] = useState<ReleaseFilters>({})
  const [isLoading, setIsLoading] = useState(true)
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
            setReleases(prev => [...prev, mapDbToRelease(payload.new)])
          } else if (payload.eventType === 'UPDATE') {
            setReleases(prev =>
              prev.map(r => r.id === payload.new.id ? mapDbToRelease(payload.new) : r)
            )
          } else if (payload.eventType === 'DELETE') {
            setReleases(prev => prev.filter(r => r.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function fetchReleases() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setReleases(data.map(mapDbToRelease))
    } catch (error) {
      console.error('Error fetching releases:', error)
    } finally {
      setIsLoading(false)
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

    const maxPosition = releases
      .filter(r => r.status === (input.status || 'scheduled'))
      .reduce((max, r) => Math.max(max, r.position), -1)

    const { data, error } = await supabase
      .from('releases')
      .insert({
        title: input.title,
        artist: input.artist,
        release_type: input.releaseType,
        genre: input.genre || null,
        release_date: input.releaseDate?.toISOString().split('T')[0] || null,
        status: input.status || 'scheduled',
        cover_url: input.coverUrl || null,
        spotify_url: input.spotifyUrl || null,
        apple_music_url: input.appleMusicUrl || null,
        youtube_url: input.youtubeUrl || null,
        isrc: input.isrc || null,
        upc: input.upc || null,
        label: input.label || null,
        distributor: input.distributor || null,
        notes: input.notes || null,
        sector: input.sector || null,
        created_by: user.id,
        position: maxPosition + 1,
      })
      .select()
      .single()

    if (error) throw error

    const newRelease = mapDbToRelease(data)
    setReleases(prev => [...prev, newRelease])

    // Auto-create calendar event if release has a date
    if (input.releaseDate && options?.createCalendarEvent) {
      try {
        const startTime = new Date(input.releaseDate)
        if (input.releaseTime) {
          const [hours, minutes] = input.releaseTime.split(':').map(Number)
          startTime.setHours(hours, minutes, 0, 0)
        }
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // +1h

        await options.createCalendarEvent({
          title: `${input.artist} - ${input.title}`,
          description: `Lançamento: ${input.releaseType?.toUpperCase() || 'SINGLE'}${input.genre ? ` | ${input.genre}` : ''}`,
          startTime,
          endTime,
          type: 'company',
          sector: input.sector,
          linkedReleaseId: newRelease.id,
        })
      } catch (calError) {
        console.error('Error creating calendar event for release:', calError)
        // Don't throw - release was created successfully
      }
    }

    return newRelease
  }, [user, releases, options?.createCalendarEvent])

  const updateRelease = useCallback(async (id: string, updates: Partial<Release>) => {
    const updateData: Record<string, any> = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.artist !== undefined) updateData.artist = updates.artist
    if (updates.releaseType !== undefined) updateData.release_type = updates.releaseType
    if (updates.genre !== undefined) updateData.genre = updates.genre || null
    if (updates.releaseDate !== undefined) updateData.release_date = updates.releaseDate?.toISOString().split('T')[0] || null
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.coverUrl !== undefined) updateData.cover_url = updates.coverUrl || null
    if (updates.spotifyUrl !== undefined) updateData.spotify_url = updates.spotifyUrl || null
    if (updates.appleMusicUrl !== undefined) updateData.apple_music_url = updates.appleMusicUrl || null
    if (updates.youtubeUrl !== undefined) updateData.youtube_url = updates.youtubeUrl || null
    if (updates.isrc !== undefined) updateData.isrc = updates.isrc || null
    if (updates.upc !== undefined) updateData.upc = updates.upc || null
    if (updates.label !== undefined) updateData.label = updates.label || null
    if (updates.distributor !== undefined) updateData.distributor = updates.distributor || null
    if (updates.notes !== undefined) updateData.notes = updates.notes || null
    if (updates.sector !== undefined) updateData.sector = updates.sector || null
    if (updates.position !== undefined) updateData.position = updates.position

    const { data, error } = await supabase
      .from('releases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updated = mapDbToRelease(data)
    setReleases(prev => prev.map(r => r.id === id ? updated : r))

    // Sync calendar event if date changed
    if (updates.releaseDate !== undefined && options?.createCalendarEvent) {
      try {
        const { data: existingEvents } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('linked_release_id', id)
          .limit(1)

        if (updates.releaseDate && existingEvents && existingEvents.length > 0) {
          const startTime = new Date(updates.releaseDate)
          startTime.setHours(12, 0, 0, 0)
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

          await supabase
            .from('calendar_events')
            .update({
              title: `${updated.artist} - ${updated.title}`,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
            })
            .eq('id', existingEvents[0].id)
        } else if (updates.releaseDate && (!existingEvents || existingEvents.length === 0)) {
          const startTime = new Date(updates.releaseDate)
          startTime.setHours(12, 0, 0, 0)
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

          await options.createCalendarEvent({
            title: `${updated.artist} - ${updated.title}`,
            description: `Lançamento: ${updated.releaseType?.toUpperCase() || 'SINGLE'}`,
            startTime,
            endTime,
            type: 'company',
            sector: updated.sector,
            linkedReleaseId: id,
          })
        } else if (!updates.releaseDate && existingEvents && existingEvents.length > 0) {
          await supabase
            .from('calendar_events')
            .delete()
            .eq('id', existingEvents[0].id)
        }
      } catch (calError) {
        console.error('Error syncing calendar event for release:', calError)
      }
    }

    return updated
  }, [options?.createCalendarEvent])

  const deleteRelease = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('releases')
      .delete()
      .eq('id', id)

    if (error) throw error
    setReleases(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateReleaseStatus = useCallback(async (id: string, status: ReleaseStatus, position?: number) => {
    const updateData: Record<string, any> = { status }
    if (position !== undefined) updateData.position = position

    const { data, error } = await supabase
      .from('releases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updated = mapDbToRelease(data)
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
