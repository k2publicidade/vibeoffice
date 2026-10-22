'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
 const [password,setPassword]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [checking,setChecking]=useState(true)
 const [authenticated,setAuthenticated]=useState(false)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [success,setSuccess]=useState(false)
 const invalidRecovery=useRef(false)
 const router=useRouter()
 const supabase=useMemo(()=>createClient(),[])
 useEffect(()=>{
  let active=true
  const fragment=new URLSearchParams(window.location.hash.slice(1))
  if(fragment.has('error')||fragment.has('error_code')||invalidRecovery.current) {
   invalidRecovery.current=true
   setError('Este link de recuperação expirou ou é inválido. Abra um novo link de recuperação.');setChecking(false)
   window.history.replaceState(null,'',window.location.pathname)
   return
  }
  supabase.auth.getUser().then(({data,error})=>{
   if(!active)return
   if(error||!data.user)setError('Não há uma sessão de recuperação válida. Abra o link de recuperação para continuar.')
   else setAuthenticated(true)
  }).catch(()=>{if(active)setError('Não foi possível validar sua sessão. Abra o link de recuperação novamente.')})
  .finally(()=>{if(active)setChecking(false)})
  return()=>{active=false}
 },[supabase])
 async function handleUpdate(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if(!authenticated||loading||password.length<12||password!==confirmation)return
  setLoading(true);setError('')
  try {
   const {data,error:sessionError}=await supabase.auth.getUser()
   if(sessionError||!data.user){setAuthenticated(false);throw new Error('Sua sessão expirou. Abra um novo link de recuperação.')}
   const {error:updateError}=await supabase.auth.updateUser({password})
   if(updateError)throw new Error(updateError.code==='same_password'?'Escolha uma senha diferente da anterior.':'Não foi possível salvar a senha. Confira a conexão e tente novamente.')
   setPassword('');setConfirmation('');setSuccess(true)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a senha.')}
  finally{setLoading(false)}
 }
 const inputClass='w-full px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-[#fd6e5b] outline-none'
 return <div className="min-h-screen flex items-center justify-center bg-black p-5">
  <div className="w-full max-w-md border border-white/10 rounded-3xl bg-[#101010] p-8 space-y-5">
   <h1 className="text-3xl font-bold text-white">Nova senha</h1>
   {checking?<p role="status" className="text-gray-400">Validando recuperação…</p>:<>
    {error&&<p role="alert" className="text-orange-300">{error}</p>}
    {success?<div className="space-y-4"><p role="status" className="text-green-300">Senha salva com sucesso.</p><button onClick={()=>{router.replace('/');router.refresh()}} className="w-full rounded-xl bg-[#fc7a67] text-black p-3 font-semibold">Entrar no sistema</button></div>:authenticated?<>
     <p className="text-sm text-gray-400">Use pelo menos 12 caracteres e repita a mesma senha nos dois campos.</p>
     <form onSubmit={handleUpdate} className="space-y-4">
      <label className="block text-sm text-gray-300">Nova senha<input type="password" aria-label="Nova senha" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required disabled={loading} className={inputClass+' mt-2'} aria-describedby="password-requirements" /></label>
      <p id="password-requirements" className="text-xs text-gray-400" aria-live="polite">{password.length<12?`Faltam ${12-password.length} caracteres para o mínimo de 12.`:'Tamanho mínimo atendido.'}</p>
      <label className="block text-sm text-gray-300">Confirmar nova senha<input type="password" aria-label="Confirmar nova senha" autoComplete="new-password" minLength={12} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={loading} className={inputClass+' mt-2'} aria-describedby="password-match" /></label>
      <p id="password-match" className="text-xs text-gray-400" aria-live="polite">{confirmation?(password===confirmation?'As senhas coincidem.':'As senhas ainda não coincidem.'):'Repita a nova senha para habilitar o botão.'}</p>
      <button type="submit" disabled={loading||password.length<12||password!==confirmation} className="w-full rounded-xl bg-[#fc7a67] text-black p-3 font-semibold disabled:opacity-40">{loading?'Salvando…':'Salvar senha'}</button>
     </form>
    </>:<Link href="/login" className="inline-block text-[#fc7a67] underline">Voltar ao login</Link>}
   </>}
  </div>
 </div>
}
