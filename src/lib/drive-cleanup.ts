import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

/** Claim durable jobs; a failed provider call leaves them eligible for retry. */
export async function processDriveCleanup(admin: SupabaseClient<Database>, deletionId: string | null = null) {
  let processed = 0
  const deadline = Date.now() + 40000
  for (let batch = 0; batch < 3 && Date.now() < deadline; batch += 1) {
    const { data: jobs, error } = await admin.rpc('claim_drive_cleanup', { deletion_id: deletionId })
    if (error) throw new Error('Could not claim cleanup jobs')
    if (!jobs?.length) break
    let succeeded = false
    try {
      const result = await admin.storage.from('drive-files').remove(jobs.map(job => job.storage_path))
      succeeded = !result.error
    } catch { /* Leave the durable request pending after network errors. */ }
    const { data: finished, error: finishError } = await admin.rpc('finish_drive_cleanup', {
      claims: jobs.map(job => ({ id: job.id, claim_token: job.claim_token })), succeeded,
    })
    if (finishError || finished !== jobs.length) throw new Error('Could not confirm cleanup jobs')
    if (!succeeded) return { processed, pending: true }
    processed += jobs.length
  }
  let query = admin.from('drive_cleanup_jobs').select('id', { count: 'exact', head: true }).is('completed_at', null)
  if (deletionId) query = query.eq('deletion_id', deletionId)
  const { count, error } = await query
  if (error) throw new Error('Could not check pending cleanup')
  return { processed, pending: (count || 0) > 0 }
}
