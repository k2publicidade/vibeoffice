'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { Sector } from '@/types/auth'

export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  sector: Sector
  role: 'admin' | 'gerente' | 'colaborador'
  createdAt: Date
  updatedAt: Date
}

export interface UseUsersReturn {
  users: User[] | null
  isLoading: boolean
  getUserById: (userId: string) => User | null
  getUsersByRole: (role: string) => User[]
  getUsersBySector: (sector: Sector) => User[]
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setUsers(null)
      setIsLoading(false)
      return
    }

    fetchUsers()
  }, [user])

  async function fetchUsers() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching users:', error)
        setUsers(null)
        return
      }

      setUsers(data.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        sector: u.sector,
        // [M13] Mantido PascalCase como definido em types/auth.ts (removido .toLowerCase())
        role: u.role as 'admin' | 'gerente' | 'colaborador',
        createdAt: new Date(u.created_at),
        updatedAt: new Date(u.updated_at),
      })))
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers(null)
    } finally {
      setIsLoading(false)
    }
  }

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
  }
}
