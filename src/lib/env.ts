/**
 * Environment Variables Validation
 * Valida que todas as variáveis de ambiente necessárias estão configuradas
 */

export function validateEnvironmentVariables() {
  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`
    console.error('❌ ENVIRONMENT CONFIGURATION ERROR')
    console.error(errorMessage)
    console.error('')
    console.error('Please ensure the following variables are set in your deployment platform:')
    missingVars.forEach((varName) => {
      console.error(`  - ${varName}`)
    })
    console.error('')
    console.error('For Vercel: https://vercel.com/docs/projects/environment-variables')
    console.error('For development: Copy .env.example to .env.local and fill in your values')
    throw new Error(errorMessage)
  }

  // Validate Supabase URL format
  const url = requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!
  if (!url.startsWith('https://')) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: must start with https://\nGot: ${url}`
    )
  }
  if (!url.includes('.supabase.co')) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: must be a valid Supabase URL\nGot: ${url}`
    )
  }

  console.log('✅ Environment variables validated successfully')
}

/**
 * Get validated environment variables
 * Use this to safely access env vars with type safety
 */
export const env = {
  get supabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
    }
    return url
  },

  get supabaseAnonKey(): string {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
    }
    return key
  },

  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  },

  get appName(): string {
    return process.env.NEXT_PUBLIC_APP_NAME || 'VIBEDISTRO'
  },
}
