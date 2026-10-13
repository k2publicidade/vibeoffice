import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'
import { withRequestDeadline } from './request-timeout'

export async function markChatReadBatch(client: SupabaseClient<Database>, actorId: string, messageIds: string[], options: { signal?: AbortSignal; keepalive?: boolean } = {}): Promise<{ status: 'sent'; messageIds: string[] } | 'session-changed'> {
  const session = await withRequestDeadline(() => client.auth.getSession(), { signal: options.signal, timeoutMs: 10000 })
  if (session.error) throw new Error('Não foi possível consultar a sessão.')
  const token = session.data.session?.access_token
  if (!token) return 'session-changed'
  // Validate the exact token that will authenticate this batch, even if the
  // shared browser client changes accounts before the RPC is submitted.
  const verified = await withRequestDeadline(() => client.auth.getUser(token), { signal: options.signal, timeoutMs: 10000 })
  if (verified.error) throw new Error('Não foi possível validar a sessão.')
  if (verified.data.user?.id !== actorId) return 'session-changed'
  const receipt: unknown = await withRequestDeadline(async signal => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/mark_office_messages_read`, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal, keepalive: options.keepalive,
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_ids: messageIds }),
    })
    if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new Error('Não foi possível confirmar a leitura.') }
    return response.json()
  }, { signal: options.signal, timeoutMs: 10000 })
  if (!Array.isArray(receipt) || receipt.some(id => typeof id !== 'string' || !messageIds.includes(id))) throw new Error('Recibo de leitura inválido.')
  return { status: 'sent', messageIds: [...new Set(receipt)] }
}
