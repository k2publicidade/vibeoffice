'use client'

import { useEffect, useCallback } from 'react'
import { createSharedResource, useSharedStore } from '@/lib/shared-resource'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { Role, Sector } from '@/types/auth'

export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  sector: Sector
  role: Role
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UseUsersReturn {
  users: User[] | null
  isLoading: boolean
  getUserById: (userId: string) => User | null
  getUsersByRole: (role: string) => User[]
  getUsersBySector: (sector: Sector) => User[]
  /** Rebusca o diretório (ex.: após cadastrar/editar funcionário) */
  refresh: () => Promise<void>
}

type UsersState = { users: User[] | null; isLoading: boolean }

/**
 * Diretório compartilhado: useUsers é chamado em cada card de tarefa/ticket/mensagem.
 * Antes cada instância buscava a tabela inteira e abria um canal realtime próprio;
 * agora existe uma busca e um canal para o app inteiro.
 */
const usersResource = createSharedResource<UsersState, { userId: string }>(
  { users: null, isLoading: true },
  ({ userId }, store, isCurrent) => {
    const supabase = createClient()
    let active = true
    const alive = () => active && isCurrent()

    async function fetchUsers() {
      if (!alive()) return
      store.set(prev => prev.isLoading ? prev : { ...prev, isLoading: true })
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name')

        if (!alive()) return
        if (error) {
          console.error('Error fetching users:', error)
          store.set({ users: null, isLoading: false })
          return
        }

        store.set({
          users: data.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            avatar: u.avatar,
            sector: u.sector,
            // [M13] Mantido PascalCase como definido em types/auth.ts (removido .toLowerCase())
            role: u.role,
            active: (u as unknown as { active: boolean }).active,
            createdAt: new Date(u.created_at),
            updatedAt: new Date(u.updated_at),
          })),
          isLoading: false,
        })
      } catch (error) {
        console.error('Error fetching users:', error)
        if (alive()) store.set({ users: null, isLoading: false })
      }
    }

    void fetchUsers()
    const channel = supabase.channel(`directory:${userId}:${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => void fetchUsers()).subscribe()
    return {
      cleanup: () => { active = false; void supabase.removeChannel(channel) },
      refresh: fetchUsers,
    }
  }
)

export function useUsers(): UseUsersReturn {
  const { user } = useAuth()
  const shared = useSharedStore(usersResource.store)
  const users = user ? shared.users : null
  const isLoading = user ? shared.isLoading : false
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    return usersResource.acquire(userId, { userId })
  }, [userId])

  const getUserById = useCallback((userId: string): User | null => {
    return users?.find(u => u.id === userId) || null
  }, [users])

  const getUsersByRole = useCallback((role: string): User[] => {
    return users?.filter(u => u.role === role) || []
  }, [users])

  const getUsersBySector = useCallback((sector: Sector): User[] => {
    return users?.filter(u => u.sector === sector) || []
  }, [users])

  return {
    users,
    isLoading,
    getUserById,
    getUsersByRole,
    getUsersBySector,
    refresh: usersResource.refresh,
  }
}
