'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function MfaSettings() {
  const supabase = createClient()
  const [factor, setFactor] = useState<string>()
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string }>()
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  useEffect(() => { supabase.auth.mfa.listFactors().then(({ data }) => setFactor(data?.totp.find(f => f.status === 'verified')?.id)) }, [supabase])
  async function run(action: () => Promise<void>) { setBusy(true); try { await action() } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro na autenticação') } finally { setBusy(false) } }
  async function enroll() {
    const factors = await supabase.auth.mfa.listFactors()
    for (const old of factors.data?.totp.filter(f => f.status !== 'verified') || []) await supabase.auth.mfa.unenroll({ factorId: old.id })
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'VIBEDISTRO', issuer: 'VIBEDISTRO' })
    if (error) throw error
    setEnrollment({ id: data.id, qr: data.totp.qr_code })
  }
  async function verify() {
    if (!enrollment) return
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code })
    if (error) throw error
    setFactor(enrollment.id); setEnrollment(undefined); setCode(''); toast.success('Autenticação em duas etapas ativada')
  }
  return <div className="space-y-3">
    <h2 className="font-semibold">Autenticação em duas etapas</h2>
    <p className="text-sm text-muted-foreground">{factor ? 'Ativada. Um código do aplicativo autenticador será solicitado no login.' : 'Proteja sua conta com um aplicativo autenticador.'}</p>
    {!factor && !enrollment && <Button disabled={busy} onClick={() => run(enroll)}>Configurar autenticador</Button>}
    {enrollment && <div className="space-y-3"><img src={enrollment.qr} alt="QR para configurar seu autenticador" className="w-48 bg-white p-2" /><Input aria-label="Código do autenticador" value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" maxLength={6} /><Button disabled={busy || code.length !== 6} onClick={() => run(verify)}>Confirmar e ativar</Button></div>}
    {factor && <Button variant="outline" disabled={busy} onClick={() => run(async () => { const { error } = await supabase.auth.mfa.unenroll({ factorId: factor }); if (error) throw error; setFactor(undefined); toast.success('Autenticador removido') })}>Remover autenticador</Button>}
  </div>
}
