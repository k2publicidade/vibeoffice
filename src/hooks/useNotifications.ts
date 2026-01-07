'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  priority: 'low' | 'normal' | 'high'
  link?: string
  read: boolean
  archived: boolean
  created_at: string
  metadata?: Record<string, any>
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archiveNotification: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Carregar notificações
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      setNotifications(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar notificações'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  // Marcar como lida
  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao marcar como lida'
      toast.error(message)
    }
  }, [supabase])

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      )

      toast.success('Todas as notificações marcadas como lidas')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao marcar todas como lidas'
      toast.error(message)
    }
  }, [user, supabase])

  // Arquivar notificação
  const archiveNotification = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ archived: true })
        .eq('id', id)

      if (updateError) throw updateError

      setNotifications(prev => prev.filter(notif => notif.id !== id))
      toast.success('Notificação arquivada')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao arquivar notificação'
      toast.error(message)
    }
  }, [supabase])

  // Atualizar manualmente
  const refresh = useCallback(async () => {
    setLoading(true)
    await loadNotifications()
  }, [loadNotifications])

  // Carregar notificações inicial
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])

          // Toast para nova notificação
          toast(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedId = payload.old.id
          setNotifications(prev => prev.filter(notif => notif.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    refresh,
  }
}
