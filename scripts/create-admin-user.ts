/**
 * Script para criar novo usuário ADMIN no Supabase
 *
 * Uso: npx tsx scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Carregar variáveis de ambiente do .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Dados do novo usuário
const NEW_USER = {
  email: 'jotaalves907@gmail.com',
  password: 'Vibedistro@2026',
  name: 'João Alves',
  sector: 'TI/Suporte' as const,
  role: 'Admin' as const,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=jotaalves907`
}

// Supabase Admin Client (usa service_role_key para bypass de RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.error('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createAdminUser() {
  console.log('👤 Criando novo usuário ADMIN...\n')
  console.log(`Email: ${NEW_USER.email}`)
  console.log(`Nome: ${NEW_USER.name}`)
  console.log(`Setor: ${NEW_USER.sector}`)
  console.log(`Role: ${NEW_USER.role}\n`)

  try {
    // 1. Verificar se usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', NEW_USER.email)
      .single()

    if (existingUser) {
      console.log('⚠️  Usuário já existe no banco de dados!')
      console.log('Use o painel do Supabase ou script de reset se precisar recriar.')
      return
    }

    // 2. Criar usuário no Supabase Auth (auth.users)
    // O trigger on_auth_user_created criará automaticamente o perfil em public.users
    console.log('🔐 Criando usuário no Supabase Auth...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: NEW_USER.email,
      password: NEW_USER.password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: NEW_USER.name,
        sector: NEW_USER.sector,
        role: NEW_USER.role,
        avatar: NEW_USER.avatar,
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError)
      return
    }

    console.log(`  ✅ Usuário criado no Auth (ID: ${authUser.user.id})`)
    console.log(`  ✅ Perfil criado automaticamente via trigger\n`)

    // 4. Sucesso!
    console.log('✅ Usuário ADMIN criado com sucesso!\n')
    console.log('📋 Credenciais de acesso:')
    console.log(`   Email: ${NEW_USER.email}`)
    console.log(`   Senha: ${NEW_USER.password}`)
    console.log(`   Role: ${NEW_USER.role}`)
    console.log(`   Setor: ${NEW_USER.sector}\n`)
    console.log('🔗 Faça login em: http://localhost:3000/login')

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    process.exit(1)
  }
}

createAdminUser()
