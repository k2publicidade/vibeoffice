/**
 * useAuth Hook - Acesso à sessão do usuário com Supabase Auth
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User } from '@/types/auth'
import { useRouter } from 'next/navigation'

export interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Escutar mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/')
    } catch (error: any) {
      throw new Error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    isLoading,
    signIn,
    signOut,
  }
}
