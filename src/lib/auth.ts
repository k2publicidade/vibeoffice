/**
 * Authentication Configuration - Supabase Auth
 * Migrado de NextAuth.js para Supabase Auth nativo
 */

import { createServerSupabaseClient } from './supabase/server'
import { User } from '@/types/auth'

export interface Session {
  user: User
  accessToken: string
  expiresAt: number
}

/**
 * Obter sessão atual do servidor
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (userError || !userData) {
    return null
  }

  return {
    user: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      sector: userData.sector,
      role: userData.role,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    },
    accessToken: session.access_token,
    expiresAt: new Date(session.expires_at!).getTime(),
  }
}

/**
 * Login com email e senha
 */
export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Logout
 */
export async function signOut() {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Verificar se usuário está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}
