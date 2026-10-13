import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './supabase/database.types'
import { DriveUploadPendingError } from '@/types/drive'

type DriveRow = Database['public']['Tables']['drive_items']['Row']
export type DriveUploadAttempt = { id: string; ownerId: string; parentId: string | null; registered?: boolean; confirmed?: DriveRow }
type Receipt = { state: 'pending' | 'committed' | 'aborted'; path: string; item: DriveRow | null }
class UploadUnavailableError extends Error {}

async function bounded<T>(request: PromiseLike<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([Promise.resolve(request), new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('O tempo de espera do envio foi excedido.')), milliseconds)
    })])
  } finally { if (timer !== undefined) clearTimeout(timer) }
}

async function repeatRequest(call: () => PromiseLike<{ data: Json | null; error: unknown }>) {
  let last: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { const response = await bounded(call(), 15000); if (!response.error) return response.data; last = response.error }
    catch (error) { last = error }
  }
  throw last
}

function receipt(data: Json | null, attempt: DriveUploadAttempt): Receipt {
  const value = data as { upload_id?: unknown; storage_path?: unknown; state?: unknown; item?: unknown } | null
  const path = `drive-uploads/${attempt.ownerId}/${attempt.id}`
  if (!value || value.upload_id !== attempt.id || value.storage_path !== path || !['pending', 'committed', 'aborted'].includes(String(value.state))) throw new DriveUploadPendingError()
  let item: DriveRow | null = null
  if (value.state === 'committed') {
    if (value.item === null) throw new UploadUnavailableError('O arquivo desse envio não está mais disponível.')
    const row = value.item as DriveRow | undefined
    if (!row || row.id !== attempt.id || row.uploaded_by !== attempt.ownerId || row.storage_path !== path || row.type !== 'file'
      || typeof row.name !== 'string' || typeof row.created_at !== 'string' || typeof row.updated_at !== 'string'
      || !Number.isFinite(new Date(row.created_at).getTime()) || !Number.isFinite(new Date(row.updated_at).getTime())) throw new DriveUploadPendingError()
    item = row
  }
  return { state: value.state as Receipt['state'], path, item }
}

function knownFailure(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && /^(22|23|42|P000)/.test(String(error.code)))
}
function failure(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Não foi possível concluir o envio.')
}

/** The durable attempt exists before bytes are sent; no uncertain write deletes a blob. */
export async function uploadDriveFile(client: SupabaseClient<Database>, file: File, attempt: DriveUploadAttempt, requestedParent = attempt.parentId): Promise<DriveRow> {
  try {
    let begun!: Receipt
    for (let reset = 0; reset < 2; reset += 1) {
      try {
        begun = receipt(await repeatRequest(() => client.rpc('begin_office_drive_upload', {
          upload_id: attempt.id, file_name: file.name, file_size: file.size,
          file_mime: file.type || 'application/octet-stream', target_parent: attempt.parentId,
        })), attempt)
      } catch (error) {
        if (error instanceof UploadUnavailableError) throw error
        if (!attempt.registered && knownFailure(error)) throw failure(error)
        throw error instanceof DriveUploadPendingError ? error : new DriveUploadPendingError()
      }
      if (begun.state !== 'aborted') break
      // A confirmed cancellation can start a fresh attempt on an explicit retry.
      attempt.id = crypto.randomUUID(); attempt.parentId = requestedParent; attempt.registered = false
    }
    if (begun.state === 'committed' && begun.item) { attempt.confirmed = begun.item; return begun.item }
    if (begun.state !== 'pending') throw new Error('O envio anterior foi cancelado. Tente novamente.')
    attempt.registered = true
    let uploadError: unknown
    try {
      const result = await bounded(client.storage.from('drive-files').upload(begun.path, file, { cacheControl: '0', contentType: file.type || 'application/octet-stream', upsert: false }), 30 * 60 * 1000)
      uploadError = result.error
    } catch (error) { uploadError = error }
    let commitError: unknown = uploadError
    try {
      const result = receipt(await repeatRequest(() => client.rpc('complete_office_drive_upload', { upload_id: attempt.id })), attempt)
      if (result.state === 'committed' && result.item) { attempt.confirmed = result.item; return result.item }
      commitError ||= new Error(result.state === 'aborted' ? 'O envio foi cancelado ou expirou.' : 'O arquivo não foi confirmado pelo armazenamento.')
    } catch (error) { commitError ||= error }
    try {
      const result = receipt(await repeatRequest(() => client.rpc('abort_office_drive_upload', { upload_id: attempt.id })), attempt)
      if (result.state === 'committed' && result.item) { attempt.confirmed = result.item; return result.item }
      if (result.state !== 'aborted') throw new DriveUploadPendingError()
      // Physical cleanup is durable even if this immediate request fails/offline.
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000)
      try { await bounded(fetch('/api/drive/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletionId: attempt.id }), signal: controller.signal }), 10000) }
      catch { /* Cron retries the queued request. */ }
      finally { clearTimeout(timeout) }
    } catch (error) { if (error instanceof UploadUnavailableError) throw error; throw new DriveUploadPendingError() }
    throw failure(commitError)
  } catch (error) {
    // Two simultaneous callers for the same File can share a confirmed receipt.
    if (attempt.confirmed) return attempt.confirmed
    if (error instanceof DriveUploadPendingError && attempt.registered) {
      try {
        const found = await bounded(client.from('drive_items').select().eq('id', attempt.id).single(), 15000)
        if (!found.error) {
          const verified = receipt({ upload_id: attempt.id, storage_path: `drive-uploads/${attempt.ownerId}/${attempt.id}`, state: 'committed', item: found.data }, attempt)
          if (verified.item) { attempt.confirmed = verified.item; return verified.item }
        }
      } catch { /* An unavailable read leaves the result explicitly unconfirmed. */ }
    }
    throw error
  }
}
