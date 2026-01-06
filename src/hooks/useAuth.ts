/**
 * useAuth Hook - Acesso à sessão do usuário
 * Simplifica acesso aos dados de autenticação em componentes
 */

'use client'

import { useSession } from 'next-auth/react'
import type { Sector, Role } from '@/types/auth'

// Tipo simplificado para dados da sessão (sem createdAt/updatedAt)
interface SessionUser {
  id: string
  name: string
  email: string
  avatar?: string
  sector: Sector
  role: Role
}

interface UseAuthReturn {
  user: SessionUser | null
  isLoading: boolean
  isAuthenticated: boolean
  sector: Sector | null
  role: Role | null
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()

  const sessionUser = session?.user

  const user: SessionUser | null = sessionUser
    ? {
        id: sessionUser.email || '',
        name: sessionUser.name || '',
        email: sessionUser.email || '',
        avatar: sessionUser.image || undefined,
        sector: (sessionUser.sector as Sector) || 'TI/Suporte',
        role: (sessionUser.role as Role) || 'Colaborador',
      }
    : null

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    sector: (sessionUser?.sector as Sector) || null,
    role: (sessionUser?.role as Role) || null,
  }
}
