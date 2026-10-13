// Creates private, harmless fixtures for read-only browser preview verification.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
const env = process.env, opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts)
const owner = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts)
const manifest = '.agent/drive-preview-fixtures.json'
function data(result) { if (result.error || !result.data) throw Error(result.error?.message || 'Missing result'); return result.data }
const fixture = process.argv.includes('--cleanup') ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : { userId: null, ids: [], paths: [] }
async function cleanup() {
  const errors = []
  if (fixture.ids.length) { const r = await admin.from('drive_items').delete().in('id', fixture.ids); if (r.error) errors.push(r.error) }
  if (fixture.paths.length) { const r = await admin.storage.from('drive-files').remove(fixture.paths); if (r.error) errors.push(r.error); const q = await admin.from('drive_cleanup_jobs').delete().in('storage_path', fixture.paths); if (q.error) errors.push(q.error) }
  if (fixture.ids.length) { const r = await admin.from('drive_uploads').delete().in('id', fixture.ids); if (r.error) errors.push(r.error) }
  if (fixture.userId) { const r = await admin.auth.admin.deleteUser(fixture.userId); if (r.error) errors.push(r.error) }
  if (errors.length) throw new AggregateError(errors, 'Preview fixture cleanup failed')
  if (fs.existsSync(manifest)) fs.unlinkSync(manifest)
  console.log('CLEANUP private preview fixtures removed')
}
function pdf() {
  const text = 'BT /F1 18 Tf 40 160 Td (AUDITORIA DRIVE - PREVIA PRIVADA) Tj 0 -35 Td (Arquivo temporario. Nenhum dado real.) Tj ET'
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 520 240] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${text.length} >>\nstream\n${text}\nendstream`]
  let body = '%PDF-1.4\n', offsets = [0]
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(body)); body += `${i + 1} 0 obj\n${object}\nendobj\n` })
  const start = Buffer.byteLength(body)
  body += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(body)
}
async function main() {
  if (process.argv.includes('--cleanup')) return cleanup()
  assert.ok(process.argv.includes('--prepare') && !fs.existsSync(manifest), 'Use --prepare without an existing manifest, or --cleanup')
  try {
    const email = `audit-preview-${randomUUID()}@example.invalid`
    fixture.userId = data(await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA PREVIA' } })).user.id
    fs.writeFileSync(manifest, JSON.stringify(fixture))
    data(await admin.from('users').update({ role: 'Colaborador', active: true }).eq('id', fixture.userId).select().single())
    const link = data(await admin.auth.admin.generateLink({ type: 'magiclink', email }))
    data(await owner.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }))
    for (const [name, mime, bytes] of [
      ['AUDITORIA PREVIA.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="520" height="240"><rect width="520" height="240" fill="#153e2d"/><text x="30" y="105" fill="white" font-size="22">AUDITORIA DRIVE - PREVIA PRIVADA</text><text x="30" y="145" fill="white" font-size="18">Arquivo temporario sem dados reais.</text></svg>')],
      ['AUDITORIA PREVIA.pdf', 'application/pdf', pdf()],
    ]) {
      const id = randomUUID(), path = `drive-uploads/${fixture.userId}/${id}`
      fixture.ids.push(id); fixture.paths.push(path); fs.writeFileSync(manifest, JSON.stringify(fixture))
      data(await owner.rpc('begin_office_drive_upload', { upload_id: id, file_name: name, file_size: bytes.length, file_mime: mime }))
      data(await owner.storage.from('drive-files').upload(path, bytes, { contentType: mime }))
      data(await owner.rpc('complete_office_drive_upload', { upload_id: id }))
      console.log(`PREPARED private ${name}: ${id}`)
    }
  } catch (error) { await cleanup(); throw error }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
