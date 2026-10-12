'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationType, NotificationPreference } from '@/types/notifications'
import { toast } from 'sonner'

export type ChannelType = 'inApp' | 'push' | 'email'
type PreferenceState = Record<string, { inApp: boolean; push: boolean; email: boolean }>
const columnMap = { inApp: 'enable_in_app', push: 'enable_push', email: 'enable_email' } as const
function preferenceMap(rows: NotificationPreference[]): PreferenceState {
  return Object.fromEntries(rows.map(row => [row.notification_type, {
    inApp: row.enable_in_app, push: row.enable_push, email: row.enable_email,
  }]))
}

export function useNotificationPreferences(userId: string, initialPreferences: NotificationPreference[]) {
  const initial = preferenceMap(initialPreferences)
  const signature = JSON.stringify(initial)
  const [preferences, setPreferences] = useState<PreferenceState>(initial)
  const [saving, setSaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const confirmed = useRef(initial)
  const generation = useRef(0)
  const pending = useRef(0)
  const fieldPending = useRef(new Map<string, number>())
  const versions = useRef(new Map<string, number>())
  const queues = useRef(new Map<NotificationType, Promise<void>>())
  const serverState = useRef({ userId, signature })

  useEffect(() => {
    const changedUser = serverState.current.userId !== userId
    if (!changedUser && serverState.current.signature === signature) return
    serverState.current = { userId, signature }
    if (changedUser) {
      generation.current += 1
      pending.current = 0
      versions.current.clear()
      fieldPending.current.clear()
      queues.current.clear()
      setSaving(false)
    }
    // A server refresh during a write may still contain the old value.
    if (!pending.current) {
      const next: PreferenceState = JSON.parse(signature)
      confirmed.current = next
      setPreferences(next)
    }
  }, [userId, signature])

  useEffect(() => () => { generation.current += 1 }, [])

  const updatePreference = useCallback((type: NotificationType, channel: ChannelType, value: boolean): Promise<void> => {
    if (!confirmed.current[type]) {
      toast.error('Preferência indisponível. Atualize a página e tente novamente.')
      return Promise.resolve()
    }
    const context = generation.current
    const key = `${type}:${channel}`
    const version = (versions.current.get(key) || 0) + 1
    versions.current.set(key, version)
    pending.current += 1
    fieldPending.current.set(key, (fieldPending.current.get(key) || 0) + 1)
    setSaving(true)
    setPreferences(prev => ({ ...prev, [type]: { ...prev[type], [channel]: value } }))

    // Serialize changes to each row so rapid toggles cannot persist out of order.
    const work = (queues.current.get(type) || Promise.resolve()).then(async () => {
      if (generation.current !== context) return
      try {
        const { data, error } = await supabase.from('notification_preferences')
          .update({ [columnMap[channel]]: value })
          .eq('user_id', userId).eq('notification_type', type)
          .select('notification_type, enable_in_app, enable_push, enable_email').single()
        if (error) throw error
        if (!data || typeof data[columnMap[channel]] !== 'boolean') throw new Error('Preferência não confirmada')
        if (generation.current !== context) return
        const saved = { inApp: data.enable_in_app, push: data.enable_push, email: data.enable_email }
        confirmed.current = { ...confirmed.current, [type]: saved }
        setPreferences(prev => {
          const next = { ...prev[type] }
          for (const field of Object.keys(columnMap) as ChannelType[]) {
            if (!fieldPending.current.get(`${type}:${field}`) || (field === channel && versions.current.get(key) === version)) next[field] = saved[field]
          }
          return { ...prev, [type]: next }
        })
        if (versions.current.get(key) === version) {
          toast.success('Preferência atualizada', { description: 'Suas configurações foram salvas com sucesso', duration: 2000 })
        }
      } catch (error) {
        if (generation.current !== context) return
        console.error('[useNotificationPreferences] Error saving:', error)
        if (versions.current.get(key) === version) {
          const previous = confirmed.current[type][channel]
          setPreferences(prev => ({ ...prev, [type]: { ...prev[type], [channel]: previous } }))
          toast.error('Erro ao salvar preferência', { description: 'Suas alterações não foram salvas. Tente novamente.', duration: 4000 })
        }
      } finally {
        if (generation.current === context) {
          pending.current -= 1
          fieldPending.current.set(key, (fieldPending.current.get(key) || 1) - 1)
          setSaving(pending.current > 0)
        }
      }
    }).finally(() => {
      if (queues.current.get(type) === work) queues.current.delete(type)
    })
    queues.current.set(type, work)
    return work
  }, [userId, supabase])

  return { preferences, updatePreference, saving }
}
