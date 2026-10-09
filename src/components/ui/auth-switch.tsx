'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthSwitch() {
  const { signIn, resetPassword } = useAuth()
  const [recovering, setRecovering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setNotice(''); setBusy(true)
    try {
      if (recovering) { await resetPassword(String(form.get('email'))); setNotice('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.') }
      else await signIn(String(form.get('email')), String(form.get('password')))
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível entrar') }
    finally { setBusy(false) }
  }
  return <div className="mx-auto max-w-md w-full rounded-3xl border border-white/10 bg-black/90 p-8 sm:p-12 shadow-xl">
    <h1 className="text-3xl font-bold text-white">{recovering ? 'Recuperar acesso' : 'Entrar no office'}</h1>
    <p className="text-sm text-zinc-400 mt-3 mb-8">VIBEDISTRO · Distribuição, estúdio e equipe</p>
    <form onSubmit={submit} className="space-y-5">
      <div><Label htmlFor="login-email">E-mail</Label><Input id="login-email" name="email" type="email" autoComplete="username" required className="mt-2" /></div>
      {!recovering && <div><Label htmlFor="login-password">Senha</Label><Input id="login-password" name="password" type="password" autoComplete="current-password" required className="mt-2" /></div>}
      {notice && <p role="alert" className="text-sm text-orange-300">{notice}</p>}
      <Button type="submit" disabled={busy} className="w-full bg-[#fc7a67] text-black hover:bg-[#fd9889]">{busy ? 'Aguarde…' : recovering ? 'Enviar recuperação' : 'Entrar'}</Button>
      <button type="button" onClick={() => { setRecovering(!recovering); setNotice('') }} className="text-sm text-zinc-300 underline">{recovering ? 'Voltar ao login' : 'Esqueci minha senha'}</button>
    </form>
    <p className="text-xs text-zinc-500 mt-8">Novos acessos são cadastrados pelo ADMIN master.</p>
  </div>
}
export default AuthSwitch
