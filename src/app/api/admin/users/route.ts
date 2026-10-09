import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(12).max(128),
  role: z.enum(['Admin', 'Gerente', 'Colaborador']),
  sector: z.enum(['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']),
})

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 })
  }
  const session = await createServerSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
  const { data: profile } = await session.from('users').select('role, active').eq('id', user.id).single()
  if (profile?.role !== 'Admin' || !profile.active) return NextResponse.json({ error: 'Apenas o ADMIN pode cadastrar funcionários' }, { status: 403 })
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Confira nome, e-mail, setor, cargo e senha (mínimo 12 caracteres)' }, { status: 400 })
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return NextResponse.json({ error: 'Cadastro indisponível: configuração administrativa ausente' }, { status: 503 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { name, email, password, role, sector } = parsed.data
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { office_enabled: true }, user_metadata: { name } })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const { error: profileError } = await admin.from('users').update({ name, role, sector, active: true } as never).eq('id', data.user.id)
  if (profileError) return NextResponse.json({ error: 'Conta criada, mas o perfil exige revisão do administrador' }, { status: 500 })
  return NextResponse.json({ id: data.user.id, email }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Origem inválida' }, { status: 403 })
  const client = await createServerSupabaseClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
  const { data: profile } = await client.from('users').select('role, active').eq('id', user.id).single()
  if (profile?.role !== 'Admin' || !profile.active) return NextResponse.json({ error: 'Apenas o ADMIN pode gerenciar funcionários' }, { status: 403 })
  const parsed = input.pick({ role: true, sector: true }).extend({ id: z.uuid(), active: z.boolean() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  if (parsed.data.id === user.id && (!parsed.data.active || parsed.data.role !== 'Admin')) return NextResponse.json({ error: 'Você não pode remover seu próprio acesso de ADMIN' }, { status: 400 })
  const { id, ...values } = parsed.data
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { error } = await admin.from('users').update(values).eq('id', id)
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar o funcionário' }, { status: 400 })
  return NextResponse.json({ updated: true })
}
