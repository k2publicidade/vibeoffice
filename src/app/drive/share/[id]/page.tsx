import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { resolveDriveShare } from '@/lib/drive-sharing-server'
import { FileText, Folder, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'
export default async function DriveSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const share = await resolveDriveShare(id)
  if (share.status === 'login') redirect(`/login?next=${encodeURIComponent(`/drive/share/${id}`)}`)
  if (share.status === 'mfa') redirect(`/auth/mfa?next=${encodeURIComponent(`/drive/share/${id}`)}`)
  if (share.status !== 'ok') notFound()
  const { item, children, publicAccess } = share
  return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12"><div className="max-w-3xl mx-auto space-y-8"><Link href="/" className="text-orange-400 font-bold">VIBEDISTRO Office</Link><div><p className="text-sm text-zinc-400 mb-2">{publicAccess ? 'Compartilhamento público' : 'Compartilhamento restrito'}</p><h1 className="text-3xl font-bold break-words">{item.name}</h1></div>
    {item.type === 'file' ? <a href={`/drive/share/${id}/download`} className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 rounded-xl text-black font-semibold"><Download size={18} />Baixar arquivo</a> : <div className="space-y-3">{children.length ? children.map(child => <Link href={`/drive/share/${child.id}`} key={child.id} className="flex items-center gap-3 border border-zinc-800 p-4 rounded-xl hover:bg-zinc-900">{child.type === 'folder' ? <Folder size={20} /> : <FileText size={20} />}<span className="break-words">{child.name}</span></Link>) : <p className="text-zinc-400">Esta pasta está vazia.</p>}</div>}
  </div></main>
}
