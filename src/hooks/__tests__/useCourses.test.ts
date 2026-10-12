import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useCourses } from '../useCourses'
import { toast } from 'sonner'

jest.mock('../useAuth')
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const user = { id: 'admin', name: 'Admin', role: 'Admin' }
const base = 'https://courses-test.supabase.co'
const signed = (path: string) => `${base}/storage/v1/object/sign/course-assets/${path}?token=test-signature`
const date = '2026-10-12T12:00:00Z'
const courseRow = { id: 'course', title: 'Curso', subtitle: 'Subtítulo antigo', description: 'Descrição antiga', thumbnail: 'storage://course-assets/old.png', instructor: 'Equipe', duration: 10, difficulty: 'beginner', tags: ['tag'], is_published: true, created_at: date, updated_at: date }
type Row = Record<string, unknown>
type Response = { data: unknown; error: unknown }

function database() {
  const rows: Record<string, Row[]> = {
    courses: [{ ...courseRow }],
    modules: [{ id: 'module', course_id: 'course', title: 'Módulo', order: 0 }],
    lessons: [{ id: 'lesson', course_id: 'course', module_id: 'module', title: 'Aula', type: 'html', content: 'Texto', order: 0 }],
    user_course_progress: [],
  }
  const state = { rows, response: { data: null, error: null } as Response, afterWrite: () => {}, fetchErrors: {} as Record<string, unknown> }
  const writes = jest.fn()
  ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
    let mutation = false
    const query = {
      select: jest.fn(() => query), order: jest.fn(() => query), eq: jest.fn(() => query), match: jest.fn(() => query),
      insert: jest.fn((payload: unknown) => { mutation = true; writes(table, 'insert', payload); return query }),
      update: jest.fn((payload: unknown) => { mutation = true; writes(table, 'update', payload); return query }),
      delete: jest.fn(() => { mutation = true; writes(table, 'delete'); return query }),
      upsert: jest.fn((payload: unknown) => { mutation = true; writes(table, 'upsert', payload); return query }),
      single: jest.fn(async () => { if (!state.response.error) state.afterWrite(); return state.response }),
      then: (resolve: (response: Response) => unknown) => Promise.resolve(mutation ? state.response : { data: rows[table].map(row => ({ ...row })), error: state.fetchErrors[table] ?? null }).then(resolve),
    }
    return query
  })
  const signUrl = jest.fn(async (path: string): Promise<Response> => ({ data: { signedUrl: signed(path) }, error: null }))
  ;(supabase.storage.from as jest.Mock).mockReturnValue({ createSignedUrl: signUrl })
  return { state, writes, signUrl }
}

async function loaded() {
  const hook = renderHook(useCourses)
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  expect(hook.result.current.courses).toHaveLength(1)
  return hook
}

describe('useCourses persistence', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = base })
  afterAll(() => { if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl })
  beforeEach(() => { jest.clearAllMocks(); (useAuth as jest.Mock).mockReturnValue({ user }); jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => jest.restoreAllMocks())

  it('clears description after a confirmed update instead of restoring its old value', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: { ...courseRow, description: '' }, error: null }
    await act(async () => { await result.current.updateCourse('course', { description: '' }) })
    expect(result.current.courses[0].description).toBe('')
    expect(result.current.courses[0].modules?.[0].lessons).toHaveLength(1)
  })

  it('respects nullable fields returned by the database when an image or subtitle is removed', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: { ...courseRow, thumbnail: null, subtitle: null }, error: null }
    await act(async () => { await result.current.updateCourse('course', { thumbnail: '', subtitle: '' }) })
    expect(result.current.courses[0].thumbnail).toBeUndefined()
    expect(result.current.courses[0].subtitle).toBeUndefined()
  })

  it('shows a usable private image immediately after editing while persisting a stable reference', async () => {
    const { state, writes } = database()
    const { result } = await loaded()
    state.response = { data: { ...courseRow, thumbnail: 'storage://course-assets/new.png' }, error: null }
    await act(async () => { await result.current.updateCourse('course', { thumbnail: signed('new.png') }) })
    expect(writes).toHaveBeenCalledWith('courses', 'update', expect.objectContaining({ thumbnail: 'storage://course-assets/new.png' }))
    expect(result.current.courses[0].thumbnail).toBe(signed('new.png'))
  })

  it('shows a usable private image immediately after creating a course', async () => {
    const { state, writes } = database()
    const { result } = await loaded()
    state.response = { data: { ...courseRow, id: 'new', thumbnail: 'storage://course-assets/new.png' }, error: null }
    await act(async () => { await result.current.createCourse({ title: 'Novo Curso', thumbnail: signed('new.png') }) })
    expect(writes).toHaveBeenCalledWith('courses', 'insert', [expect.objectContaining({ thumbnail: 'storage://course-assets/new.png', author_id: user.id })])
    expect(result.current.getCourseById('new')?.thumbnail).toBe(signed('new.png'))
  })

  it('preserves the complete course when its update is rejected', async () => {
    const { state } = database()
    const { result } = await loaded()
    const before = result.current.courses
    const failure = { code: '42501', message: 'Sem permissão' }
    state.response = { data: null, error: failure }
    await expect(result.current.updateCourse('course', { title: 'Alterado' })).rejects.toEqual(failure)
    expect(result.current.courses).toEqual(before)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('rejects an empty title before writing', async () => {
    const { writes } = database()
    const { result } = await loaded()
    await expect(result.current.createCourse({ title: '  ' })).rejects.toThrow('Título é obrigatório')
    expect(writes).not.toHaveBeenCalled()
    expect(result.current.courses).toHaveLength(1)
  })

  it('reports a rejected creation once and retains the existing courses', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: null, error: { code: '23505', message: 'Slug já existente' } }
    await expect(result.current.createCourse({ title: 'Duplicado', slug: 'existing' })).rejects.toMatchObject({ code: '23505' })
    expect(result.current.courses).toHaveLength(1)
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('keeps a successfully created course when only image signing fails', async () => {
    const { state, signUrl } = database()
    const { result } = await loaded()
    state.response = { data: { ...courseRow, id: 'new' }, error: null }
    signUrl.mockResolvedValueOnce({ data: null, error: { message: 'Arquivo indisponível' } })
    await act(async () => { await expect(result.current.createCourse({ title: 'Novo' })).resolves.toMatchObject({ id: 'new', thumbnail: undefined }) })
    expect(result.current.getCourseById('new')).toBeDefined()
    expect(toast.success).toHaveBeenCalledWith('Curso criado com sucesso!')
  })

  it('preserves course data during a failed refresh and recovers on retry', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.fetchErrors.modules = { message: 'Rede indisponível' }
    await act(async () => { await result.current.refresh() })
    expect(result.current.courses[0].modules?.[0].lessons).toHaveLength(1)
    expect(result.current.loading).toBe(false)
    delete state.fetchErrors.modules
    state.rows.courses[0].title = 'Atualizado remotamente'
    await act(async () => { await result.current.refresh() })
    expect(result.current.courses[0].title).toBe('Atualizado remotamente')
  })

  it('restores persisted progress after a rejected optimistic update', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: null, error: { message: 'Falha ao gravar' } }
    await act(async () => { await result.current.toggleLessonComplete('course', 'lesson', true) })
    await waitFor(() => expect(result.current.isLessonCompleted('course', 'lesson')).toBe(false))
    expect(result.current.getProgressStats('course').percentage).toBe(0)
    expect(toast.error).toHaveBeenCalledWith('Não consegui salvar seu progresso. Tente novamente.')
  })

  it('counts repeated completion only once', async () => {
    database()
    const { result } = await loaded()
    await act(async () => { await result.current.toggleLessonComplete('course', 'lesson', true); await result.current.toggleLessonComplete('course', 'lesson', true) })
    expect(result.current.getProgressStats('course')).toMatchObject({ completed_lessons_count: 1, percentage: 100 })
  })

  it('does not count progress belonging to a lesson removed from the course', async () => {
    const { state } = database()
    state.rows.user_course_progress = [{ course_id: 'course', lesson_id: 'lesson' }]
    const { result } = await loaded()
    await waitFor(() => expect(result.current.getProgressStats('course').percentage).toBe(100))
    state.response = { data: { id: 'lesson' }, error: null }
    state.afterWrite = () => { state.rows.lessons = [] }
    await act(async () => { await result.current.deleteLesson('lesson') })
    expect(result.current.getProgressStats('course')).toMatchObject({ completed_lessons_count: 0, total_lessons_count: 0, percentage: 0 })
  })

  it.each(['module', 'lesson'] as const)('refreshes the course structure after adding a %s', async (kind) => {
    const { state } = database()
    const { result } = await loaded()
    const row = kind === 'module' ? { id: 'new', course_id: 'course', title: 'Módulo novo', order: 1 } : { ...state.rows.lessons[0], id: 'new', title: 'Aula nova', order: 1 }
    state.response = { data: row, error: null }
    state.afterWrite = () => { state.rows[kind === 'module' ? 'modules' : 'lessons'].push(row) }
    await act(async () => { if (kind === 'module') await result.current.createModule('course', 'Módulo novo', 1); else await result.current.createLesson({ title: 'Aula nova', course_id: 'course', module_id: 'module', order: 1 }) })
    if (kind === 'module') expect(result.current.courses[0].modules).toHaveLength(2)
    else expect(result.current.courses[0].lessons_count).toBe(2)
  })

  it('refreshes an edited lesson and resolves its private video and material URLs', async () => {
    const { state } = database()
    const { result } = await loaded()
    const edited = { ...state.rows.lessons[0], title: 'Aula editada', content_url: 'storage://course-assets/video.mp4', materials: [{ kind: 'file', name: 'PDF', url: 'storage://course-assets/material.pdf' }] }
    state.response = { data: edited, error: null }
    state.afterWrite = () => { state.rows.lessons = [edited] }
    await act(async () => { await result.current.updateLesson('lesson', { title: 'Aula editada', content_url: 'storage://course-assets/video.mp4' }) })
    expect(result.current.courses[0].modules?.[0].lessons[0]).toMatchObject({ title: 'Aula editada', content_url: signed('video.mp4'), materials: [{ name: 'PDF', url: signed('material.pdf') }] })
  })

  it('preserves the lesson when an edit is rejected', async () => {
    const { state } = database()
    const { result } = await loaded()
    const before = result.current.courses
    state.response = { data: null, error: { message: 'Acesso negado' } }
    await expect(result.current.updateLesson('lesson', { title: 'Alterada' })).rejects.toMatchObject({ message: 'Acesso negado' })
    expect(result.current.courses).toEqual(before)
  })

  it('still loads course content if its image cannot be signed', async () => {
    const { signUrl } = database()
    signUrl.mockResolvedValueOnce({ data: null, error: { message: 'Capa indisponível' } })
    const { result } = await loaded()
    expect(result.current.courses[0]).toMatchObject({ title: 'Curso', thumbnail: undefined, lessons_count: 1 })
    expect(result.current.courses[0].modules?.[0].lessons).toHaveLength(1)
    expect(toast.error).toHaveBeenCalledWith('Não foi possível carregar a capa do curso.')
  })
})
