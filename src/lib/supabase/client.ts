/**
 * Supabase Client Configuration
 * Browser client para uso em Client Components
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'
import { env } from '@/lib/env'

export const createClient = () => {
  try {
    return createBrowserClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey
    )
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error)
    throw error
  }
}

// Cliente singleton para uso direto
export const supabase = createClient()
