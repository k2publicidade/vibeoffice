'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { MfaSettings } from '@/components/settings/MfaSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (user) setName(user.name) }, [user])
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await updateProfile({ name }); toast.success('Perfil salvo') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar') } finally { setBusy(false) }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return
    const form = event.currentTarget
    const values = new FormData(form)
    if (values.get('newPassword') !== values.get('confirmPassword')) { toast.error('As senhas não coincidem'); return }
    setBusy(true)
    try {
      const client = createClient()
      const verification = await client.auth.signInWithPassword({ email: user.email, password: String(values.get('currentPassword')) })
      if (verification.error) throw new Error('Senha atual incorreta')
      const { data: level } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (level?.nextLevel === 'aal2' && level.currentLevel !== 'aal2') { window.location.assign('/auth/mfa'); return }
      const { error } = await client.auth.updateUser({ password: String(values.get('newPassword')) })
      if (error) throw error
      form.reset(); toast.success('Senha atualizada')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao atualizar senha') } finally { setBusy(false) }
  }
  return <div className="max-w-3xl mx-auto p-6 space-y-8">
    <h1 className="text-3xl font-bold">Configurações</h1>
    <form onSubmit={saveProfile} className="border rounded-xl p-6 space-y-4"><h2 className="text-xl font-semibold">Conta</h2><Label htmlFor="account-name">Nome</Label><Input id="account-name" value={name} onChange={e => setName(e.target.value)} minLength={2} required /><Label>E-mail</Label><Input aria-label="E-mail da conta" value={user?.email || ''} readOnly /><p className="text-sm text-muted-foreground">{user?.role} · {user?.sector}</p><Button disabled={busy}>Salvar alterações</Button></form>
    <form onSubmit={changePassword} className="border rounded-xl p-6 space-y-4"><h2 className="text-xl font-semibold">Alterar senha</h2>{[['currentPassword','Senha atual'],['newPassword','Nova senha (mínimo 12 caracteres)'],['confirmPassword','Confirmar nova senha']].map(([id,label]) => <div key={id}><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type="password" required minLength={id === 'currentPassword' ? 1 : 12} autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'} /></div>)}<Button disabled={busy}>Atualizar senha</Button></form>
    <div className="border rounded-xl p-6"><MfaSettings /></div>
    <div className="border rounded-xl p-6 space-y-4"><h2 className="text-xl font-semibold">Aparência</h2><Label htmlFor="theme">Tema</Label><select id="theme" value={theme || 'dark'} onChange={e => setTheme(e.target.value)} className="border rounded-md bg-background p-2"><option value="dark">Escuro</option><option value="light">Claro</option></select></div>
    <Button asChild variant="outline"><Link href="/settings/notifications">Preferências de notificações</Link></Button>
    {user?.role === 'Admin' && <Button asChild><Link href="/admin/usuarios">Gerenciar funcionários</Link></Button>}
  </div>
}
