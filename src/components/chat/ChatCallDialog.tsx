'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ChatCallDialog({ kind, onClose, onSendMessage }: { kind: 'audio' | 'video' | null; onClose: () => void; onSendMessage: (message: string) => Promise<void> | void }) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setLink('') }, [kind])
  async function send(event: React.FormEvent) {
    event.preventDefault()
    let url: URL
    try { url = new URL(link.trim()); if (url.protocol !== 'https:' || url.username || url.password) throw new Error() }
    catch { toast.error('Informe um link HTTPS válido de reunião'); return }
    setBusy(true)
    try { await onSendMessage(`Convite para chamada de ${kind === 'audio' ? 'áudio' : 'vídeo'}:\n${url.href}`); onClose(); toast.success('Convite enviado. Abra o link da mensagem para entrar na chamada.') }
    catch { toast.error('Não foi possível enviar o convite. Tente novamente.') }
    finally { setBusy(false) }
  }
  return <Dialog open={!!kind} onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent><DialogHeader><DialogTitle>Chamada de {kind === 'audio' ? 'áudio' : 'vídeo'}</DialogTitle><DialogDescription>Compartilhe o link da reunião com os participantes desta conversa.</DialogDescription></DialogHeader><form onSubmit={send} className="space-y-4"><Label htmlFor="chat-call-link">Link do Google Meet, Zoom ou Teams</Label><Input id="chat-call-link" type="url" placeholder="https://…" value={link} onChange={event => setLink(event.target.value)} maxLength={2048} required /><Button disabled={busy || !link.trim()} type="submit">{busy ? 'Enviando…' : 'Enviar convite'}</Button></form></DialogContent></Dialog>
}
