/**
 * Script para verificar se usuário existe no banco
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function checkUser() {
  const email = 'jotaalves907@gmail.com'

  console.log(`🔍 Verificando usuário: ${email}\n`)

  // Verificar na tabela public.users
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao buscar:', error)
    return
  }

  if (user) {
    console.log('✅ Usuário encontrado na tabela public.users:')
    console.log(JSON.stringify(user, null, 2))
  } else {
    console.log('❌ Usuário NÃO encontrado na tabela public.users')
  }

  // Verificar na tabela auth.users via admin API
  console.log('\n🔍 Verificando auth.users via Admin API...')
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Erro ao listar usuários do Auth:', authError)
    return
  }

  const authUser = authUsers.users.find(u => u.email === email)

  if (authUser) {
    console.log('✅ Usuário encontrado no Auth:')
    console.log(`   ID: ${authUser.id}`)
    console.log(`   Email: ${authUser.email}`)
    console.log(`   Email confirmado: ${authUser.email_confirmed_at ? 'Sim' : 'Não'}`)
    console.log(`   Criado em: ${authUser.created_at}`)
  } else {
    console.log('❌ Usuário NÃO encontrado no Auth')
  }
}

checkUser()
