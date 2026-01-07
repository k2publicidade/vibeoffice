'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { createClient } from '@/lib/supabase/client'
import { NotificationType, NotificationPreference } from '@/types/notifications'
import { toast } from 'sonner'
import { createDefaultPreferences } from '@/lib/notifications/defaults'

export type ChannelType = 'inApp' | 'push' | 'email'

interface PreferenceState {
  [key: string]: {
    inApp: boolean
    push: boolean
    email: boolean
  }
}

export function useNotificationPreferences(userId: string, initialPreferences: NotificationPreference[]) {
  const [preferences, setPreferences] = useState<PreferenceState>(() => {
    // Convert array to map for easier access
    const map: PreferenceState = {}
    initialPreferences.forEach((pref) => {
      map[pref.notification_type] = {
        inApp: pref.enable_in_app,
        push: pref.enable_push,
        email: pref.enable_email,
      }
    })
    return map
  })

  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const updatePreferenceInDB = useCallback(
    async (type: NotificationType, channel: ChannelType, value: boolean) => {
      setSaving(true)
      try {
        const columnMap = {
          inApp: 'enable_in_app',
          push: 'enable_push',
          email: 'enable_email',
        }

        const { error } = await supabase
          .from('notification_preferences')
          .update({ [columnMap[channel]]: value })
          .eq('user_id', userId)
          .eq('notification_type', type)

        if (error) throw error

        toast.success('Preferência atualizada', {
          description: 'Suas configurações foram salvas com sucesso',
          duration: 2000,
        })
      } catch (error) {
        console.error('[useNotificationPreferences] Error saving:', error)

        // Rollback optimistic update
        setPreferences((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            [channel]: !value, // Revert
          },
        }))

        toast.error('Erro ao salvar preferência', {
          description: 'Suas alterações não foram salvas. Tente novamente.',
          duration: 4000,
        })
      } finally {
        setSaving(false)
      }
    },
    [userId, supabase]
  )

  // Debounced version (300ms)
  const debouncedUpdate = useDebouncedCallback(updatePreferenceInDB, 300)

  const updatePreference = useCallback(
    (type: NotificationType, channel: ChannelType, value: boolean) => {
      // Optimistic update
      setPreferences((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          [channel]: value,
        },
      }))

      // Debounced save
      debouncedUpdate(type, channel, value)
    },
    [debouncedUpdate]
  )

  return {
    preferences,
    updatePreference,
    saving,
  }
}
