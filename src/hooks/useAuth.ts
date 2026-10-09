/**
 * useAuth Hook - Acesso à sessão do usuário com Supabase Auth
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Role, Sector, User } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'
import { safeAuthRedirect } from '@/lib/auth-redirect'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Erro desconhecido'
}

export interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<boolean>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: { name: string; sector?: Sector; avatar?: string | null }) => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let active = true
    let authTimer: ReturnType<typeof setTimeout> | undefined
    let currentUserId: string | null = null

    async function loadProfile(userId: string | null) {
      currentUserId = userId
      if (!userId) {
        if (active) { setUser(null); setIsLoading(false) }
        return
      }
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
        if (!active || currentUserId !== userId) return
        setUser(!error && data ? {
          id: data.id, email: data.email, name: data.name, avatar: data.avatar,
          sector: data.sector, role: data.role,
          createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at),
        } : null)
      } catch {
        if (active && currentUserId === userId) setUser(null)
      } finally {
        if (active && currentUserId === userId) setIsLoading(false)
      }
    }
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) void loadProfile(session?.user.id ?? null)
    }).catch(() => { if (active) { setUser(null); setIsLoading(false) } })

    // Escutar mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls until the auth callback has released its session lock.
      if (authTimer) clearTimeout(authTimer)
      currentUserId = session?.user.id ?? null
      authTimer = setTimeout(() => { if (active) void loadProfile(session?.user.id ?? null) }, 0)
    })

    return () => {
      active = false
      if (authTimer) clearTimeout(authTimer)
      subscription.unsubscribe()
    }
  }, [supabase])

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        sector: data.sector,
        role: data.role,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      })
    }
    setIsLoading(false)
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Buscar perfil do usuário para obter a role
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, active')
          .eq('id', authData.user.id)
          .single()

        if (profileError || !profile || (profile as { active?: boolean }).active === false) {
          await supabase.auth.signOut()
          throw new Error('Acesso não autorizado. Solicite seu cadastro ao ADMIN master.')
        }
        const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        const destination = new URLSearchParams(window.location.search).get('next')
        const safeDestination = destination ? safeAuthRedirect(destination) : null
        if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
          router.push(safeDestination ? `/auth/mfa?next=${encodeURIComponent(safeDestination)}` : '/auth/mfa')
          return
        }
        // Redirecionar baseado na role
        if (profile?.role) {
          const dashboardRoute = safeDestination || getDashboardRoute(profile.role)
          router.push(dashboardRoute)
          router.refresh()
        } else {
          router.push('/')
        }
      }
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function signUp(email: string, password: string, name: string) {
    setIsLoading(true)
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Falha ao criar usuário')

      // O trigger do banco cria o perfil; inserir novamente causa conflito de PK/RLS.
      if (!authData.session) return false
      await fetchUserProfile(authData.user.id)
      router.push('/')
      router.refresh()
      return true

    } catch (error: unknown) {
      throw new Error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      router.push('/login')
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function resetPassword(email: string) {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })
      if (error) throw error
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function updateProfile(updates: { name: string; sector?: Sector; avatar?: string | null }) {
    if (!user) throw new Error('Usuário não autenticado')

    const normalizedName = updates.name.trim()
    if (!normalizedName) throw new Error('Nome é obrigatório')

    setIsLoading(true)
    try {
      const payload = {
        name: normalizedName,
        sector: updates.sector,
        ...(updates.avatar !== undefined ? { avatar: updates.avatar?.trim() || null } : {}),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', user.id)
        .select('*')
        .single()

      if (error) throw error
      if (!data) throw new Error('Perfil não encontrado no banco de dados')

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        sector: data.sector as Sector,
        role: data.role as Role,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  }
}
