import { serveDriveContent } from '@/lib/drive-content-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return serveDriveContent(request, (await params).id, true)
}
export const HEAD = GET
