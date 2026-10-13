import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveDriveShare } from '@/lib/drive-sharing-server'

const cacheHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
}

async function resolve(id: string, shared: boolean) {
  if (!z.uuid().safeParse(id).success) return { status: 'missing' as const }
  if (shared) return resolveDriveShare(id)
  const reader = await createServerSupabaseClient()
  const { data: { user }, error } = await reader.auth.getUser()
  if (error || !user) return { status: 'login' as const }
  const assurance = await reader.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance.error) throw assurance.error
  if (assurance.data.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2') return { status: 'mfa' as const }
  // RLS includes active account, MFA, ownership and inherited sharing checks.
  const found = await reader.from('drive_items').select('*').eq('id', id).maybeSingle()
  if (found.error) throw found.error
  return found.data ? { status: 'ok' as const, item: found.data, publicAccess: false, reader } : { status: 'missing' as const }
}

function unavailable(status: number) {
  return Response.json({ error: 'Arquivo indisponível' }, { status, headers: cacheHeaders })
}

export async function serveDriveContent(request: Request, id: string, shared = false) {
  let upstream: Response | undefined
  try {
    const access = await resolve(id, shared)
    if (access.status !== 'ok') return unavailable(access.status === 'login' ? 401 : access.status === 'mfa' ? 403 : 404)
    const { item } = access
    const path = item.storage_path
    if (item.type !== 'file' || !path || path.split('/').some(segment => !segment || segment === '.' || segment === '..') || /[\\\x00-\x1f]/.test(path)) return unavailable(404)
    const range = request.headers.get('range')
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return unavailable(416)
    const session = access.publicAccess ? null : await access.reader.auth.getSession()
    const token = access.publicAccess ? process.env.SUPABASE_SERVICE_ROLE_KEY : session?.data.session?.access_token
    if (!token) return unavailable(401)
    const url = new URL(`/storage/v1/object/authenticated/drive-files/${path.split('/').map(encodeURIComponent).join('/')}`, process.env.NEXT_PUBLIC_SUPABASE_URL!)
    // A unique query also avoids previously cached Storage bytes after deletion.
    url.searchParams.set('cacheNonce', randomUUID())
    const headers = new Headers({ Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! })
    if (range) headers.set('Range', range)
    upstream = await fetch(url, { headers, cache: 'no-store', redirect: 'error', signal: request.signal, method: request.method === 'HEAD' ? 'HEAD' : 'GET' })
    if (upstream.status !== 200 && upstream.status !== 206) {
      const status = upstream.status === 416 ? 416 : upstream.status === 404 || upstream.status === 400 ? 404 : 503
      await upstream.body?.cancel()
      return unavailable(status)
    }
    // Permission or metadata may have changed while Storage was responding.
    const current = await resolve(id, shared)
    if (current.status !== 'ok' || current.item.storage_path !== path) {
      await upstream.body?.cancel()
      return unavailable(404)
    }
    const output = new Headers(cacheHeaders)
    for (const name of ['content-length', 'content-range', 'accept-ranges']) {
      const value = upstream.headers.get(name)
      if (value) output.set(name, value)
    }
    const mime = (upstream.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase()
    const inline = !shared && new URL(request.url).searchParams.get('download') !== '1' && /^(image\/(png|jpeg|gif|webp|avif|bmp|svg\+xml)|application\/pdf)$/.test(mime)
    output.set('Content-Type', mime)
    output.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="download"; filename*=UTF-8''${encodeURIComponent(current.item.name).replace(/['()*]/g, value => '%' + value.charCodeAt(0).toString(16).toUpperCase())}`)
    output.set('Content-Security-Policy', `${mime === 'image/svg+xml' ? 'sandbox; ' : ''}default-src 'none'; frame-ancestors 'self'`)
    // Stream without buffering: large files and Range requests retain backpressure.
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: output })
  } catch {
    await upstream?.body?.cancel().catch(() => {})
    return unavailable(503)
  }
}
