'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
export function useCalendarDayColors() {
 const [colors, setColors] = useState<Record<string, string>>({})
 const [saving, setSaving] = useState(false)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 async function load() {
  setLoading(true); setError('')
  try {
   const response = await fetch('/api/calendar/day-colors', { cache: 'no-store' })
   const data = await response.json()
   if (!response.ok) throw new Error(data.error)
   setColors(Object.fromEntries(data.map((row: { day: string; color: string }) => [row.day, row.color])))
  } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar cores') }
  finally { setLoading(false) }
 }
 useEffect(() => { void load() }, [])
 async function save(day: string, color: string | null) {
  setSaving(true)
  try {
   const response = await fetch('/api/calendar/day-colors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day, color }) })
   const data = await response.json()
   if (!response.ok) throw new Error(data.error)
   setColors(previous => { const next = { ...previous }; if (color) next[day] = color; else delete next[day]; return next })
   toast.success(color ? 'Cor do dia salva' : 'Cor do dia removida')
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar cor') }
  finally { setSaving(false) }
 }
 return { colors, saving, loading, error, save, reload: load }
}
