'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function VerifyMfaPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const supabase = createClient()
    try {
      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) throw factors.error
      const factor = factors.data.totp.find(f => f.status === 'verified')
      if (!factor) throw new Error('Autenticador não encontrado. Entre novamente.')
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
      if (error) throw error
      router.push('/'); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Código inválido') } finally { setBusy(false) }
  }
  return <form onSubmit={verify} className="max-w-md mx-auto mt-20 space-y-4 p-8 border rounded-xl"><h1 className="text-2xl font-bold">Verificar acesso</h1><p>Digite o código de seis dígitos do seu autenticador.</p><Input value={code} onChange={e => setCode(e.target.value)} aria-label="Código do autenticador" autoComplete="one-time-code" inputMode="numeric" maxLength={6} required />{error && <p role="alert">{error}</p>}<Button disabled={busy || code.length !== 6}>Verificar</Button><Button type="button" variant="outline" onClick={async () => { await createClient().auth.signOut(); router.push('/login'); router.refresh() }}>Sair</Button></form>
}
