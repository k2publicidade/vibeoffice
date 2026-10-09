'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PushSettings({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false)
  async function enable() {
    setBusy(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este navegador não suporta notificações push')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permita as notificações nas configurações do navegador')
      const registration = await navigator.serviceWorker.register('/office-sw.js')
      await navigator.serviceWorker.ready
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const normalized = key.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
      const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0))
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes })
      const json = subscription.toJSON()
      const { error } = await createClient().from('push_subscriptions' as never).upsert({ user_id: userId, endpoint: subscription.endpoint, keys: json.keys } as never, { onConflict: 'endpoint' })
      if (error) throw error
      toast.success('Este navegador está habilitado. Escolha abaixo quais notificações deseja receber.')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao ativar notificações') } finally { setBusy(false) }
  }
  return <div className="border rounded-xl p-4 space-y-2"><p>Receba notificações neste navegador mesmo com o office fechado.</p><Button disabled={busy || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} onClick={enable}>Ativar notificações neste navegador</Button></div>
}
