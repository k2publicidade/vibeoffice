'use client'

import { useEffect, useState } from 'react'
import { resolveStorageUrl } from '@/lib/supabase/storage'

export function MessageAttachment({ content }: { content: string }) {
  const [url, setUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  let attachment: { name?: string; url?: string; mime?: string } = {}
  try { attachment = JSON.parse(content) } catch { /* Legacy attachment. */ }
  const reference = attachment.url?.startsWith('storage://message-assets/') ? attachment.url : undefined
  useEffect(() => {
    let mounted = true
    setUrl(undefined); setFailed(false)
    if (reference) resolveStorageUrl(reference).then(value => { if (mounted) setUrl(value) }).catch(() => { if (mounted) setFailed(true) })
    return () => { mounted = false }
  }, [reference])
  if (!reference || failed) return <span>Anexo indisponível</span>
  if (!url) return <span>Carregando anexo…</span>
  return <div className="space-y-2">
    {attachment.mime?.startsWith('image/') && <img src={url} alt={attachment.name || 'Imagem'} className="max-h-64 max-w-full rounded" />}
    {attachment.mime?.startsWith('audio/') && <audio src={url} controls preload="metadata" className="max-w-full" />}
    <a href={url} target="_blank" rel="noopener noreferrer" className="underline break-all">{attachment.name || 'Abrir arquivo'}</a>
  </div>
}
