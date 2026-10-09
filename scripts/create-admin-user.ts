/** Explicit provisioning only. Existing accounts and passwords are never replaced. */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })

async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_NAME: name, ADMIN_PASSWORD: password } = process.env
  if (!url || !key || !email || !name || !password || password.length < 12) throw new Error('Defina URL, service role, ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD (mínimo 12 caracteres) no ambiente local.')
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })
  if (error) throw error
  const result = await admin.from('users').update({ role: 'Admin', active: true, sector: 'Administrativo' }).eq('id', data.user.id)
  if (result.error) throw result.error
  console.log(`ADMIN criado: ${email}. A senha não será exibida.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
