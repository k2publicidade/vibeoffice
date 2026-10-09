import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { z } from 'zod'

export async function resolveDriveShare(id: string) {
  if (!z.uuid().safeParse(id).success) return { status: 'missing' as const }
  const service = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const found = await service.from('drive_items').select('*').eq('id', id).maybeSingle()
  if (found.error) throw found.error
  if (!found.data) return { status: 'missing' as const }
  const published = await service.rpc('drive_is_public', { i: id })
  if (published.error) throw published.error
  let reader = service
  if (!published.data) {
    reader = await createServerSupabaseClient()
    const { data: { user } } = await reader.auth.getUser()
    if (!user) return { status: 'login' as const }
    const assurance = await reader.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assurance.error) throw assurance.error
    if (assurance.data.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2') return { status: 'mfa' as const }
    const allowed = await reader.from('drive_items').select('id').eq('id', id).maybeSingle()
    if (allowed.error) throw allowed.error
    if (!allowed.data) return { status: 'missing' as const }
  }
  const children = found.data.type === 'folder'
    ? await reader.from('drive_items').select('id,name,type,size').eq('parent_id', id).order('name')
    : { data: [], error: null }
  if (children.error) throw children.error
  return { status: 'ok' as const, item: found.data, children: children.data || [], publicAccess: published.data, reader }
}
