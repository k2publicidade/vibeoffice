import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { processDriveCleanup } from '@/lib/drive-cleanup'

export const maxDuration = 60
export async function POST(request: Request) {
  const header = request.headers.get('authorization') || ''
  const expected = process.env.NOTIFICATION_WEBHOOK_SECRET || ''
  const received = header.replace(/^Bearer /, '')
  const trusted = Boolean(expected && Buffer.byteLength(received) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(received), Buffer.from(expected)))
  if (header && !trusted) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = z.object({ deletionId: z.uuid().optional() }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const timeout = AbortSignal.timeout(45000)
  const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([timeout, AbortSignal.timeout(10000), ...(init?.signal ? [init.signal] : [])]) }) },
  })
  if (!trusted) {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = await supabase.rpc('office_role')
    if (role.error || !role.data || !parsed.data.deletionId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const permitted = await admin.from('drive_cleanup_jobs').select('id').eq('deletion_id', parsed.data.deletionId).eq('requested_by', user.id).limit(1)
    if (permitted.error) return NextResponse.json({ error: 'Cleanup unavailable' }, { status: 503 })
    if (!permitted.data?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const result = await processDriveCleanup(admin, parsed.data.deletionId ?? null)
    return NextResponse.json(result, { status: result.pending ? 202 : 200 })
  } catch {
    return NextResponse.json({ error: 'Cleanup remains queued' }, { status: 503 })
  }
}
