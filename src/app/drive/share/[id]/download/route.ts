import { NextResponse } from 'next/server'
import { resolveDriveShare } from '@/lib/drive-sharing-server'

export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const share = await resolveDriveShare(id)
  if (share.status !== 'ok' || share.item.type !== 'file' || !share.item.storage_path) return NextResponse.json({ error: 'Arquivo indisponível' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  const signed = await share.reader.storage.from('drive-files').createSignedUrl(share.item.storage_path, 60, { download: share.item.name })
  if (signed.error || !signed.data) return NextResponse.json({ error: 'Não foi possível baixar o arquivo' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const response = NextResponse.redirect(signed.data.signedUrl)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
