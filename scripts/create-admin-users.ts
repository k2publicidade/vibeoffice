/**
 * Script para criar usuários administradores no Supabase
 * Executa: npx tsx scripts/create-admin-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const adminUsers = [
  {
    email: 'dotivomaciel@gmail.com',
    password: 'Beto@nininha',
    name: 'Dotivo Rodrigues',
    sector: 'Administrativo' as const,
    role: 'Admin' as const,
  },
  {
    email: 'k2publicidade@yahoo.com.br',
    password: 'Piupiu@212',
    name: 'Cassio Lemos',
    sector: 'Administrativo' as const,
    role: 'Admin' as const,
  }
]

async function deleteAllUsers() {
  console.log('🗑️  Deletando todos os usuários existentes...')

  // Listar todos os usuários
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Erro ao listar usuários:', listError)
    return
  }

  console.log(`  ℹ️  Encontrados ${users?.length || 0} usuários`)

  // Deletar cada usuário
  for (const user of users || []) {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) {
      console.error(`  ❌ Erro ao deletar usuário ${user.email}:`, error)
    } else {
      console.log(`  ✅ Usuário ${user.email} deletado`)
    }
  }
}

async function createAdminUsers() {
  console.log('\n👥 Criando usuários administradores...\n')

  for (const userData of adminUsers) {
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
        }
      })

      if (authError) {
        console.error(`❌ Erro ao criar usuário ${userData.email}:`, authError)
        continue
      }

      if (!authData.user) {
        console.error(`❌ Usuário ${userData.email} não foi criado`)
        continue
      }

      console.log(`✅ Auth criado para ${userData.email} (ID: ${authData.user.id})`)

      // 2. Criar perfil na tabela public.users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          sector: userData.sector,
          role: userData.role,
          avatar: null,
        })

      if (profileError) {
        console.error(`❌ Erro ao criar perfil para ${userData.email}:`, profileError)
        // Deletar o usuário auth se falhou criar o perfil
        await supabase.auth.admin.deleteUser(authData.user.id)
        continue
      }

      console.log(`✅ Perfil criado para ${userData.name}`)
      console.log(`   Email: ${userData.email}`)
      console.log(`   Role: ${userData.role}`)
      console.log(`   Setor: ${userData.sector}\n`)

    } catch (error) {
      console.error(`❌ Erro inesperado ao criar ${userData.email}:`, error)
    }
  }
}

async function main() {
  console.log('🚀 Iniciando criação de usuários administradores...\n')

  await deleteAllUsers()
  await createAdminUsers()

  console.log('✨ Processo concluído!\n')
  console.log('📝 Credenciais de acesso:')
  console.log('   1. dotivomaciel@gmail.com / Beto@nininha')
  console.log('   2. k2publicidade@yahoo.com.br / Piupiu@212\n')
}

main().catch(console.error)
