'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { withRequestDeadline } from '@/lib/request-timeout'

type Preference = Pick<Database['public']['Tables']['user_chat_preferences']['Row'], 'room_id' | 'user_id' | 'is_muted' | 'is_blocked' | 'is_archived' | 'archived_at' | 'updated_at'>
type Patch = Partial<Pick<Preference, 'is_muted' | 'is_blocked' | 'is_archived' | 'archived_at'>>
const fields = 'room_id,user_id,is_muted,is_blocked,is_archived,archived_at,updated_at'

export class ChatPreferenceContextChangedError extends Error {
  constructor() { super('A conta ou conversa mudou durante a operação.'); this.name = 'ChatPreferenceContextChangedError' }
}

export function useChatPreferences(userId?: string, roomId?: string) {
  const client = useMemo(() => createClient(), [])
  const scope = useMemo(() => ({ userId, roomId, active: true, generation: 0, readVersion: 0, controller: new AbortController() }), [userId, roomId])
  const [state, setState] = useState({ scope, rows: [] as Preference[], loaded: !userId, loading: Boolean(userId), pending: 0, error: null as string | null })
  const refresh = useCallback(async () => {
    if (!scope.active || !scope.userId) return { ok: false, rows: [] as Preference[] }
    const generation = scope.generation, version = ++scope.readVersion
    setState(previous => previous.scope === scope ? { ...previous, loading: true } : previous)
    try {
      const rows = await withRequestDeadline(async signal => {
        const rows = new Map<string, Preference>()
        let offset = 0
        while (true) {
          let query = client.from('user_chat_preferences').select(fields, { count: 'exact' }).eq('user_id', scope.userId!).order('room_id').range(offset, offset + 499)
          if (scope.roomId) query = query.eq('room_id', scope.roomId)
          const page = await query.abortSignal(signal)
          if (page.error) throw page.error
          if (signal.aborted) throw new Error('Request cancelled')
          const data = (page.data || []) as Preference[]
          data.forEach(row => rows.set(row.room_id, row))
          offset += data.length
          if (!data.length || (page.count !== null && page.count !== undefined && offset >= page.count)) break
        }
        return [...rows.values()]
      }, { signal: scope.controller.signal })
      if (!scope.active || generation !== scope.generation) return { ok: false, rows: [] as Preference[] }
      if (version !== scope.readVersion) return { ok: true, rows }
      setState(previous => previous.scope === scope ? { ...previous, rows, loaded: true, loading: false, error: null } : previous)
      return { ok: true, rows }
    } catch {
      if (scope.active && generation === scope.generation && version === scope.readVersion) setState(previous => previous.scope === scope ? { ...previous, loading: false, error: 'Não foi possível carregar as preferências.' } : previous)
      return { ok: false, rows: [] as Preference[] }
    }
  }, [scope, client])
  useEffect(() => {
    scope.active = true; scope.generation += 1; scope.readVersion += 1
    if (scope.controller.signal.aborted) scope.controller = new AbortController()
    setState({ scope, rows: [], loaded: !userId, loading: Boolean(userId), pending: 0, error: null })
    if (!userId) return () => { scope.active = false; scope.generation += 1; scope.readVersion += 1; scope.controller.abort() }
    void refresh()
    const channel = client.channel(`chat-preferences:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_chat_preferences', filter: `user_id=eq.${userId}` }, () => { if (scope.active) void refresh() })
      .subscribe()
    return () => { scope.active = false; scope.generation += 1; scope.readVersion += 1; scope.controller.abort(); void client.removeChannel(channel) }
  }, [scope, userId, client, refresh])
  const update = useCallback(async (roomId: string, patch: Patch) => {
    if (!scope.userId) throw new Error('Entre na sua conta para alterar a preferência.')
    if (!scope.active) throw new ChatPreferenceContextChangedError()
    if (!roomId) throw new Error('Selecione uma conversa.')
    const generation = scope.generation
    scope.readVersion += 1
    setState(previous => previous.scope === scope ? { ...previous, pending: previous.pending + 1 } : previous)
    let confirmed = false
    try {
      let writeError: unknown
      try {
        const result = await withRequestDeadline(signal => client.from('user_chat_preferences')
          .upsert({ user_id: scope.userId!, room_id: roomId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id,room_id' })
          .select(fields).abortSignal(signal).single(), { signal: scope.controller.signal })
        confirmed = !result.error && Boolean(result.data)
        writeError = result.error || (!result.data ? new Error('Confirmação indisponível') : null)
      } catch (error) { writeError = error }
      if (!scope.active || generation !== scope.generation) throw new ChatPreferenceContextChangedError()
      // Re-read instead of applying a possibly older concurrent receipt.
      const current = await refresh()
      if (!scope.active || generation !== scope.generation) throw new ChatPreferenceContextChangedError()
      const row = current.rows.find(item => item.room_id === roomId && item.user_id === scope.userId)
      const matches = row && Object.entries(patch).every(([key, value]) => key === 'archived_at' && value !== null
        ? Boolean(row.archived_at) && new Date(row.archived_at!).getTime() === new Date(value as string).getTime()
        : row[key as keyof Preference] === value)
      if (writeError && !matches) throw new Error('Não foi possível confirmar a preferência. Tente novamente.')
      if (!current.ok) throw new Error(confirmed ? 'Preferência registrada, mas não foi possível atualizar a conversa. Tente novamente.' : 'Não foi possível confirmar a preferência. Tente novamente.')
    } finally {
      if (scope.active && generation === scope.generation) setState(previous => previous.scope === scope ? { ...previous, pending: Math.max(0, previous.pending - 1) } : previous)
    }
  }, [scope, client, refresh])
  const current = state.scope === scope ? state : { rows: [] as Preference[], loaded: !userId, loading: Boolean(userId), pending: 0, error: null }
  return { rows: current.rows, ready: current.loaded, loading: current.loading, saving: current.pending > 0, error: current.error, refresh, update }
}
