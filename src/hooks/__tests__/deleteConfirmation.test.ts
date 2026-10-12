import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useTasks } from '../useTasks'
import { useTickets } from '../useTickets'
import { useAnnouncements } from '../useAnnouncements'
import { useReleases } from '../useReleases'
import { useCourses } from '../useCourses'
import { toast } from 'sonner'

jest.mock('../useAuth')
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('@/lib/notifications/eventBus', () => ({ EventBus: { emit: jest.fn() } }))
jest.mock('@/lib/supabase/storage', () => ({
  resolveStorageUrl: jest.fn(async (value: unknown) => value),
  storageReference: jest.fn((value: unknown) => value),
}))

const user = { id: 'owner', role: 'Admin', sector: 'Marketing', name: 'Admin' }
const date = '2026-10-10T12:00:00Z'
const unavailable = { code: 'PGRST116', message: 'The result contains 0 rows' }

function fixtures(): Record<string, Record<string, unknown>[]> {
  return {
    tasks: [{ id: 'task', title: 'Tarefa', status: 'todo', priority: 'medium', sector: 'Marketing', created_by: user.id, task_assignees: [], created_at: date, updated_at: date }],
    tickets: [{ id: 'ticket', title: 'Ticket', status: 'open', priority: 'medium', category: 'Marketing', requester: user.id, created_by: user.id, created_at: date, updated_at: date }],
    ticket_comments: [{ id: 'comment', ticket_id: 'ticket', user_id: user.id, content: 'Preservar comentário', created_at: date }],
    company_announcements: [{ id: 'announcement', title: 'Aviso', message: 'Mensagem', active: true, target_sectors: [], created_by: user.id, created_at: date, updated_at: date }],
    releases: [{ id: 'release', title: 'Single', artist: 'Artista', release_type: 'single', status: 'draft', created_by: user.id, created_at: date, updated_at: date }],
    courses: [{ id: 'course', title: 'Curso', created_at: date }],
    modules: [{ id: 'module', course_id: 'course', title: 'Módulo', order: 0 }],
    lessons: [{ id: 'lesson', course_id: 'course', module_id: 'module', title: 'Aula', order: 0 }],
    user_course_progress: [],
    notifications: [{ id: 'notification', entity_id: 'task' }],
  }
}

// PostgREST can report no error for a DELETE that affects zero rows.
// Requesting one returned row distinguishes that response from a confirmed deletion.
function mockDatabase(confirmed: boolean, confirmation?: Promise<void>) {
  const rows = fixtures()
  const notificationDeletes = jest.fn()
  ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
    let deleting = false
    let id: unknown
    const query = {
      select: jest.fn(() => query),
      order: jest.fn(() => query),
      eq: jest.fn((column: string, value: unknown) => { if (column === 'id') id = value; return query }),
      match: jest.fn(() => query),
      delete: jest.fn(() => { deleting = true; if (table === 'notifications') notificationDeletes(); return query }),
      single: jest.fn(async () => {
        if (confirmation) await confirmation
        if (!confirmed) return { data: null, error: unavailable }
        rows[table] = rows[table].filter(row => row.id !== id)
        if (table === 'tickets') rows.ticket_comments = []
        if (table === 'modules') rows.lessons = []
        return { data: { id }, error: null }
      }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: deleting ? null : rows[table], error: null }).then(resolve),
    }
    return query
  })
  return { notificationDeletes }
}

function useDeletionCases() {
  const tasks = useTasks()
  const tickets = useTickets()
  const announcements = useAnnouncements()
  const releases = useReleases()
  const courses = useCourses()
  return { tasks, tickets, announcements, releases, courses }
}

const cases = [
  { name: 'task', remove: (state: ReturnType<typeof useDeletionCases>) => state.tasks.deleteTask('task') },
  { name: 'ticket', remove: (state: ReturnType<typeof useDeletionCases>) => state.tickets.deleteTicket('ticket') },
  { name: 'comment', remove: (state: ReturnType<typeof useDeletionCases>) => state.tickets.deleteComment('comment') },
  { name: 'announcement', remove: (state: ReturnType<typeof useDeletionCases>) => state.announcements.deleteAnnouncement('announcement') },
  { name: 'release', remove: (state: ReturnType<typeof useDeletionCases>) => state.releases.deleteRelease('release') },
  { name: 'course', remove: (state: ReturnType<typeof useDeletionCases>) => state.courses.deleteCourse('course') },
  { name: 'module', remove: (state: ReturnType<typeof useDeletionCases>) => state.courses.deleteModule('module') },
  { name: 'lesson', remove: (state: ReturnType<typeof useDeletionCases>) => state.courses.deleteLesson('lesson') },
]

async function loaded() {
  const hook = renderHook(useDeletionCases)
  await waitFor(() => {
    expect(hook.result.current.tasks.tasks).toHaveLength(1)
    expect(hook.result.current.tickets.comments).toHaveLength(1)
    expect(hook.result.current.announcements.allAnnouncements).toHaveLength(1)
    expect(hook.result.current.releases.releases).toHaveLength(1)
    expect(hook.result.current.courses.courses[0]?.modules[0]?.lessons).toHaveLength(1)
  })
  return hook
}

describe('single-record deletion confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('retains the task and its notifications until deletion is confirmed', async () => {
    let confirm!: () => void
    const confirmation = new Promise<void>(resolve => { confirm = resolve })
    const { notificationDeletes } = mockDatabase(true, confirmation)
    const { result } = await loaded()
    let deletion!: Promise<boolean>
    await act(async () => { deletion = result.current.tasks.deleteTask('task'); await Promise.resolve() })
    expect(result.current.tasks.tasks).toHaveLength(1)
    expect(notificationDeletes).not.toHaveBeenCalled()
    await act(async () => { confirm(); await deletion })
    expect(result.current.tasks.tasks).toHaveLength(0)
    expect(notificationDeletes).toHaveBeenCalledTimes(1)
  })

  it('allows idempotent removal of already absent lesson progress', async () => {
    mockDatabase(false)
    const { result } = await loaded()
    await act(async () => { await result.current.courses.toggleLessonComplete('course', 'lesson', false) })
    expect(result.current.courses.isLessonCompleted('course', 'lesson')).toBe(false)
    expect(result.current.courses.getProgressStats('course')).toMatchObject({ total_lessons_count: 1, completed_lessons_count: 0, percentage: 0 })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it.each(cases)('preserves all records when $name deletion affects zero rows', async ({ name, remove }) => {
    const { notificationDeletes } = mockDatabase(false)
    const { result } = await loaded()
    const before = result.current
    await act(async () => {
      if (name === 'announcement') expect(await remove(result.current)).toBe(false)
      else await expect(remove(result.current)).rejects.toMatchObject(unavailable)
    })
    expect(result.current.tasks.tasks).toEqual(before.tasks.tasks)
    expect(result.current.tickets.tickets).toEqual(before.tickets.tickets)
    expect(result.current.tickets.comments).toEqual(before.tickets.comments)
    expect(result.current.announcements.allAnnouncements).toEqual(before.announcements.allAnnouncements)
    expect(result.current.releases.releases).toEqual(before.releases.releases)
    expect(result.current.courses.courses).toEqual(before.courses.courses)
    expect(notificationDeletes).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it.each(cases)('removes $name after the database confirms deletion', async ({ name, remove }) => {
    const { notificationDeletes } = mockDatabase(true)
    const { result } = await loaded()
    await act(async () => { await remove(result.current) })
    const state = result.current
    if (name === 'task') { expect(state.tasks.tasks).toHaveLength(0); expect(notificationDeletes).toHaveBeenCalledTimes(1) }
    if (name === 'ticket') { expect(state.tickets.tickets).toHaveLength(0); expect(state.tickets.comments).toHaveLength(0) }
    if (name === 'comment') { expect(state.tickets.comments).toHaveLength(0); expect(state.tickets.tickets).toHaveLength(1) }
    if (name === 'announcement') expect(state.announcements.allAnnouncements).toHaveLength(0)
    if (name === 'release') expect(state.releases.releases).toHaveLength(0)
    if (name === 'course') expect(state.courses.courses).toHaveLength(0)
    if (name === 'module') expect(state.courses.courses[0].modules).toHaveLength(0)
    if (name === 'lesson') expect(state.courses.courses[0].modules[0].lessons).toHaveLength(0)
  })
})
