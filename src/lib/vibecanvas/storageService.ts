import { SavedProject, GenerationConfig } from '@/types/vibecanvas'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'

const STORAGE_KEY = 'vibecanvas_projects_v1'

function validConfig(config: unknown): config is GenerationConfig {
  if (!config || typeof config !== 'object') return false
  const candidate = config as Partial<GenerationConfig>
  return !!candidate.textConfig && typeof candidate.textConfig.title === 'string' && typeof candidate.textConfig.artist === 'string' && typeof candidate.musicGenre === 'string' && typeof candidate.visualStyle === 'string'
}

export function getLocalProjects(): SavedProject[] {
  try {
    const projects: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(projects) ? projects.filter(project => project && typeof project.id === 'string' && typeof project.briefing === 'string' && Number.isFinite(project.createdAt) && validConfig(project.config)) : []
  } catch { return [] }
}

export async function getProjects(archived = false): Promise<SavedProject[]> {
  const client = createClient()
  let query = client.from('cover_projects').select('*').order('created_at', { ascending: false })
  query = archived ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  const { data, error } = await query
  if (error) throw error
  return data.filter(row => validConfig(row.config)).map(row => ({ id: row.id, createdAt: new Date(row.created_at).getTime(), deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined, config: row.config as unknown as GenerationConfig, briefing: row.briefing }))
}

export async function saveProject(config: GenerationConfig, briefing: string): Promise<SavedProject> {
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Faça login para salvar o projeto')
  const { data, error } = await client.from('cover_projects').insert({ config: config as unknown as Json, briefing, created_by: user.id }).select('*').single()
  if (error) throw error
  return { id: data.id, createdAt: new Date(data.created_at).getTime(), config, briefing }
}

export async function deleteProject(id: string): Promise<void> {
  const { data, error } = await createClient().from('cover_projects').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single()
  if (error || !data) throw error || new Error('Projeto não encontrado')
}

export async function restoreProject(id: string): Promise<void> {
  const { data, error } = await createClient().from('cover_projects').update({ deleted_at: null }).eq('id', id).select('id').single()
  if (error || !data) throw error || new Error('Projeto não encontrado')
}

export async function updateProject(id: string, config: GenerationConfig, briefing: string): Promise<void> {
  const { data, error } = await createClient().from('cover_projects').update({ config: config as unknown as Json, briefing }).eq('id', id).select('id').single()
  if (error || !data) throw error || new Error('Projeto não encontrado')
}

export async function importLocalProjects(): Promise<number> {
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Faça login para importar os projetos')
  let count = 0
  for (const project of getLocalProjects()) {
    const { error } = await client.from('cover_projects').insert({ id: project.id, config: project.config as unknown as Json, briefing: project.briefing, created_at: new Date(project.createdAt).toISOString(), created_by: user.id })
    if (error && error.code !== '23505') throw error
    if (!error) count++
  }
  return count
}
