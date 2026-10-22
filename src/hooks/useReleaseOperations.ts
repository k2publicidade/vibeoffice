'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DistributionAction, ReleaseOperationsSnapshot } from '@/lib/release-operations'
const EMPTY:ReleaseOperationsSnapshot={workflows:[],history:[],metrics:[],canManage:false}
export function useReleaseOperations(reloadKey='') {
 const [snapshot,setSnapshot]=useState(EMPTY)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const version=useRef(0)
 const reload=useCallback(async()=>{
  const current=++version.current
  setLoading(true);setError('')
  try{
   const response=await fetch('/api/release-operations',{cache:'no-store'})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error)
   if(current===version.current)setSnapshot(data)
  }catch(e){if(current===version.current)setError(e instanceof Error?e.message:'Erro ao carregar')}
  finally{if(current===version.current)setLoading(false)}
 },[])
 useEffect(()=>{
  void reload()
  const client=createClient()
  const {data:{subscription}}=client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'||event==='SIGNED_IN'){version.current++;setSnapshot(EMPTY);void reload()}})
  return()=>{version.current++;subscription.unsubscribe()}
 },[reload,reloadKey])
 async function mutate(method:'PATCH'|'POST',payload:object) {
  setSaving(true)
  try{
   const response=await fetch('/api/release-operations',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error)
   await reload()
   return data
  }finally{setSaving(false)}
 }
 const change=(releaseId:string,action:DistributionAction,payload:Record<string,unknown>)=>mutate('PATCH',{releaseId,action,...payload})
 const importReport=(releaseId:string,csv:string,locale:'pt-BR'|'en-US',source:string)=>mutate('POST',{releaseId,csv,locale,source})
 return {...snapshot,loading,error,saving,reload,change,importReport}
}
