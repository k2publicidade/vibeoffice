'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'

export default function RecoveryPage() {
 const [token,setToken]=useState<string|null>(null)
 const [checking,setChecking]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const initialized=useRef(false)
 const router=useRouter()
 const client=useMemo(()=>createClient(),[])
 useEffect(()=>{
  if(initialized.current)return
  initialized.current=true
  const fragment=new URLSearchParams(window.location.hash.slice(1))
  const value=fragment.get('token_hash')
  if(value&&value.length<=256)setToken(value)
  else setError('Link de recuperação ausente ou inválido. Abra o link completo recebido.')
  window.history.replaceState(null,'',window.location.pathname)
  setChecking(false)
 },[])
 async function continueRecovery() {
  if(!token||busy)return
  setBusy(true);setError('')
  try {
   const {data,error}=await client.auth.verifyOtp({type:'recovery',token_hash:token})
   if(error||!data.session){setToken(null);setError('Este link de recuperação expirou ou é inválido. Solicite um novo link.');return}
   setToken(null);router.replace('/update-password')
  }catch{setError('Falha de conexão. Tente continuar a recuperação novamente.')}
  finally{setBusy(false)}
 }
 return <div className="min-h-screen flex items-center justify-center bg-black p-5">
  <div className="w-full max-w-md border border-white/10 rounded-3xl bg-[#101010] p-8 space-y-5">
   <h1 className="text-2xl font-bold text-white">Recuperar acesso</h1>
   <p className="text-sm text-gray-400">Confirme abaixo para abrir a página onde você definirá sua nova senha. O link só será usado após essa confirmação.</p>
   {checking?<p role="status" className="text-gray-400">Preparando recuperação…</p>:<>
    {error&&<p role="alert" className="text-orange-300">{error}</p>}
    {token&&<button onClick={continueRecovery} disabled={busy} className="w-full rounded-xl bg-[#fc7a67] text-black p-3 font-semibold disabled:opacity-40">{busy?'Validando…':'Continuar recuperação'}</button>}
    {!token&&!busy&&<Link href="/login" className="text-[#fc7a67] underline">Voltar ao login</Link>}
   </>}
  </div>
 </div>
}
