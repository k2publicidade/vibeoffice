'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { GenerationConfig } from '@/types/vibecanvas'
import { toast } from 'sonner'

export function MusicGenrePicker({ config, setConfig }: { config: GenerationConfig; setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>> }) {
 const { user } = useAuth()
 const [genres, setGenres] = useState<{ id: string; name: string }[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [name, setName] = useState('')
 const [busy, setBusy] = useState(false)
 const [managing, setManaging] = useState(false)
 async function load() {
  setLoading(true); setError('')
  try {
   const response = await fetch('/api/music-genres', { cache: 'no-store' })
   const body = await response.json()
   if (!response.ok) throw new Error(body.error)
   setGenres(body)
  } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar estilos') }
  finally { setLoading(false) }
 }
 useEffect(() => { void load() }, [])
 async function mutate(method: 'POST' | 'DELETE', values: object) {
  setBusy(true)
  try {
   const response = await fetch('/api/music-genres', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
   const body = await response.json()
   if (!response.ok) throw new Error(body.error)
   if (method === 'POST') { setGenres(previous => [...previous, body].sort((a,b) => a.name.localeCompare(b.name))); setName('') }
   else { setGenres(previous => previous.filter(genre => genre.id !== (values as { id: string }).id)) }
   toast.success(method === 'POST' ? 'Estilo cadastrado' : 'Estilo removido da seleção')
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar estilo') }
  finally { setBusy(false) }
 }
 const selectClass = 'w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white'
 return <div className="space-y-4">
  <p className="text-sm text-zinc-400">Escolha um estilo principal e, se desejar, um segundo estilo para combinar na capa.</p>
  {loading ? <p role="status">Carregando estilos…</p> : error ? <div role="alert">{error} <button type="button" onClick={load}>Tentar novamente</button></div> : <>
   <label className="block space-y-2"><span>Estilo principal</span><select aria-label="Estilo principal" className={selectClass} value={config.musicGenre} onChange={e => setConfig(previous => ({ ...previous, musicGenre: e.target.value, secondaryMusicGenre: previous.secondaryMusicGenre === e.target.value ? '' : previous.secondaryMusicGenre }))}>
    <option value="">Selecione um estilo</option>
    {config.musicGenre && !genres.some(g => g.name === config.musicGenre) && <option value={config.musicGenre}>{config.musicGenre} (salvo no projeto)</option>}
    {genres.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
   </select></label>
   <label className="block space-y-2"><span>Segundo estilo (opcional)</span><select aria-label="Segundo estilo (opcional)" className={selectClass} value={config.secondaryMusicGenre || ''} onChange={e => setConfig(previous => ({ ...previous, secondaryMusicGenre: e.target.value }))}>
    <option value="">Sem segundo estilo</option>
    {config.secondaryMusicGenre && !genres.some(g => g.name === config.secondaryMusicGenre) && <option value={config.secondaryMusicGenre}>{config.secondaryMusicGenre} (salvo no projeto)</option>}
    {genres.filter(g => g.name !== config.musicGenre).map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
   </select></label>
   {!genres.length && <p>Nenhum estilo disponível. Solicite o cadastro ao administrador.</p>}
  </>}
  {user?.role === 'Admin' && <div className="rounded-xl border border-zinc-700 p-4 space-y-3">
   <button type="button" onClick={() => setManaging(value => !value)} aria-expanded={managing}>Gerenciar estilos musicais</button>
   {managing && <>
    <label className="block">Novo estilo<input aria-label="Novo estilo" className={selectClass} value={name} onChange={e => setName(e.target.value)} maxLength={80} /></label>
    <button type="button" disabled={busy || !name.trim()} onClick={() => mutate('POST', { name })}>Cadastrar estilo</button>
    <ul className="max-h-64 overflow-auto space-y-2">{genres.map(g => <li key={g.id} className="flex justify-between gap-4"><span>{g.name}</span><button type="button" disabled={busy} aria-label={`Remover ${g.name}`} onClick={() => mutate('DELETE', { id: g.id })}>Remover</button></li>)}</ul>
    <p className="text-xs text-zinc-400">A remoção retira o estilo das novas seleções. Projetos salvos preservam seus estilos.</p>
   </>}
  </div>}
 </div>
}
