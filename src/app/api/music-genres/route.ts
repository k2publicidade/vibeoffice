import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { OfficePreferencesDatabase } from '@/lib/office-preferences'
import { z } from 'zod'

async function authorize(request: Request, writing: boolean) {
 if (writing && request.headers.get('origin') !== new URL(request.url).origin) return { error: NextResponse.json({ error: 'Origem inválida' }, { status: 403 }) }
 const client = await createServerSupabaseClient()
 const { data: { user } } = await client.auth.getUser()
 if (!user) return { error: NextResponse.json({ error: 'Faça login' }, { status: 401 }) }
 const { data: profile } = await client.from('users').select('active, role').eq('id', user.id).single()
 if (!profile?.active || (writing && profile.role !== 'Admin')) return { error: NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 }) }
 return { client: client as unknown as SupabaseClient<OfficePreferencesDatabase> }
}
export async function GET(request: Request) {
 const auth = await authorize(request, false)
 if (auth.error) return auth.error
 const { data, error } = await auth.client!.from('music_genres').select('*').order('name')
 return error ? NextResponse.json({ error: 'Não foi possível carregar os estilos musicais' }, { status: 500 }) : NextResponse.json(data)
}
export async function POST(request: Request) {
 const auth = await authorize(request, true)
 if (auth.error) return auth.error
 const parsed = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(await request.json().catch(() => null))
 if (!parsed.success) return NextResponse.json({ error: 'Informe um estilo de até 80 caracteres' }, { status: 400 })
 const { data, error } = await auth.client!.from('music_genres').insert(parsed.data).select('*').single()
 return error ? NextResponse.json({ error: error.code === '23505' ? 'Este estilo já existe' : 'Não foi possível cadastrar o estilo' }, { status: 400 }) : NextResponse.json(data, { status: 201 })
}
export async function DELETE(request: Request) {
 const auth = await authorize(request, true)
 if (auth.error) return auth.error
 const parsed = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null))
 if (!parsed.success) return NextResponse.json({ error: 'Estilo inválido' }, { status: 400 })
 const { data, error } = await auth.client!.from('music_genres').delete().eq('id', parsed.data.id).select('id').single()
 return error || !data ? NextResponse.json({ error: 'Não foi possível remover o estilo' }, { status: 400 }) : NextResponse.json({ deleted: true })
}
