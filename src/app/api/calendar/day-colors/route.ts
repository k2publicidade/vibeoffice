import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DAY_COLORS, type OfficePreferencesDatabase } from '@/lib/office-preferences'
import { z } from 'zod'

export async function GET() {
 const client = await createServerSupabaseClient()
 const { data: { user } } = await client.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Faça login' }, { status: 401 })
 const { data, error } = await (client as unknown as SupabaseClient<OfficePreferencesDatabase>).from('calendar_day_colors').select('day,color').eq('user_id', user.id)
 return error ? NextResponse.json({ error: 'Não foi possível carregar as cores' }, { status: 500 }) : NextResponse.json(data)
}
export async function PUT(request: Request) {
 if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Origem inválida' }, { status: 403 })
 const session = await createServerSupabaseClient()
 const { data: { user } } = await session.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Faça login' }, { status: 401 })
 const parsed = z.object({ day: z.iso.date(), color: z.string().nullable().refine(value => value === null || DAY_COLORS.some(c => c.value === value)) }).safeParse(await request.json().catch(() => null))
 if (!parsed.success) return NextResponse.json({ error: 'Data ou cor inválida' }, { status: 400 })
 const client = session as unknown as SupabaseClient<OfficePreferencesDatabase>
 const { day, color } = parsed.data
 const { error } = color === null
 ? await client.from('calendar_day_colors').delete().eq('user_id', user.id).eq('day', day)
 : await client.from('calendar_day_colors').upsert({ user_id: user.id, day, color })
 return error ? NextResponse.json({ error: 'Não foi possível salvar a cor' }, { status: 400 }) : NextResponse.json({ saved: true })
}
