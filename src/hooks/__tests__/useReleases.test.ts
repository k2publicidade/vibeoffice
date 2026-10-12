import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useReleases } from '../useReleases'
import { toast } from 'sonner'

jest.mock('../useAuth')
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const user = { id: 'owner', name: 'Admin', role: 'Admin' }
const base = 'https://releases-test.supabase.co'
const signed = (path: string) => `${base}/storage/v1/object/sign/release-assets/${path}?token=test`
const row = { id: 'release', title: 'Single', artist: 'Artista', release_type: 'single', release_date: '2030-10-20', status: 'scheduled', position: 0, created_by: user.id, created_at: '2026-10-12T12:00:00Z', updated_at: '2026-10-12T12:00:00Z', cover_url: 'storage://release-assets/cover.png', wav_url: 'storage://release-assets/audio.wav', composers: [], tracks: [], artists: [], platform_links: [] }
type Row = Record<string, unknown>
function database() {
  const state = { rows: [{ ...row }] as Row[], response: { data: { ...row }, error: null } as { data: unknown; error: unknown }, fetchError: null as unknown, fetchResponse: undefined as Promise<{ data: Row[]; error: unknown }> | undefined, afterWrite: () => {} }
  const writes = jest.fn()
  ;(supabase.from as jest.Mock).mockImplementation(() => {
    const query = {
      select: jest.fn(() => query), order: jest.fn(() => query), eq: jest.fn(() => query),
      insert: jest.fn((value: unknown) => { writes('insert', value); return query }),
      update: jest.fn((value: unknown) => { writes('update', value); return query }),
      delete: jest.fn(() => query),
      single: jest.fn(async () => { if (!state.response.error) state.afterWrite(); return state.response }),
      then: (resolve: (value: unknown) => unknown) => (state.fetchResponse || Promise.resolve({ data: state.rows, error: state.fetchError })).then(resolve),
    }
    return query
  })
  ;(supabase.rpc as jest.Mock).mockImplementation(async (name, args) => {
    expect(name).toBe('save_office_release')
    writes(args.release_id === null ? 'insert' : 'update', args.changes)
    if (!state.response.error) state.afterWrite()
    return state.response
  })
  const signUrl = jest.fn(async (path: string): Promise<{ data: unknown; error: unknown }> => ({ data: { signedUrl: signed(path) }, error: null }))
  ;(supabase.storage.from as jest.Mock).mockReturnValue({ createSignedUrl: signUrl })
  let receive!: (payload: { eventType: string; old?: { id: string } }) => void
  const channel = { on: jest.fn((_event, _filter, handler) => { receive = handler; return channel }), subscribe: jest.fn(() => channel) }
  ;(supabase.channel as jest.Mock).mockReturnValue(channel)
  return { state, writes, signUrl, channel, realtime: (payload: Parameters<typeof receive>[0]) => receive(payload) }
}
async function loaded() {
  const hook = renderHook(useReleases)
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  expect(hook.result.current.releases).toHaveLength(1)
  return hook
}
describe('useReleases data integrity', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = base })
  afterAll(() => { if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl })
  beforeEach(() => { jest.clearAllMocks(); (useAuth as jest.Mock).mockReturnValue({ user }); jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => jest.restoreAllMocks())

  it('returns usable signed files after creation and stores stable references', async () => {
    const { state, writes } = database()
    const { result } = await loaded()
    state.response = { data: { ...row, id: 'new' }, error: null }
    state.afterWrite = () => { state.rows.push({ ...row, id: 'new' }) }
    let created
    await act(async () => { created = await result.current.createRelease({ title: 'Single', artist: 'Artista', releaseType: 'single', coverUrl: signed('cover.png'), wavUrl: signed('audio.wav') }) })
    expect(created).toMatchObject({ coverUrl: signed('cover.png'), wavUrl: signed('audio.wav') })
    expect(writes).toHaveBeenCalledWith('insert', expect.objectContaining({ cover_url: row.cover_url, wav_url: row.wav_url }))
    expect(result.current.releases).toHaveLength(2)
  })

  it('still loads metadata and other files when one private file is unavailable', async () => {
    const { signUrl } = database()
    signUrl.mockResolvedValueOnce({ data: null, error: { message: 'Capa indisponível' } })
    const { result } = await loaded()
    expect(result.current.releases[0]).toMatchObject({ title: 'Single', coverUrl: undefined, wavUrl: signed('audio.wav') })
  })

  it('retains a confirmed metadata update when only file signing fails', async () => {
    const { state, signUrl } = database()
    const { result } = await loaded()
    state.response = { data: { ...row, title: 'Atualizado' }, error: null }
    signUrl.mockResolvedValueOnce({ data: null, error: { message: 'Falha da imagem' } })
    await act(async () => { await expect(result.current.updateRelease('release', { title: 'Atualizado' })).resolves.toMatchObject({ title: 'Atualizado' }) })
    expect(result.current.releases[0].title).toBe('Atualizado')
  })

  it('preserves the existing release when its update is rejected', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: null, error: { code: '42501', message: 'Sem permissão' } }
    await expect(result.current.updateRelease('release', { title: 'Indevido' })).rejects.toMatchObject({ code: '42501' })
    expect(result.current.releases[0].title).toBe('Single')
  })

  it('persists the chosen time atomically and restores it on reload', async () => {
    const { state, writes } = database()
    const date = new Date(2030, 9, 20, 18, 35)
    state.rows = [{ ...row, release_at: date.toISOString() }]
    state.response = { data: state.rows[0], error: null }
    const { result } = await loaded()
    expect(result.current.releases[0].releaseDate?.getTime()).toBe(date.getTime())
    await act(async () => { await result.current.updateRelease('release', { releaseDate: new Date(2030, 9, 20), releaseTime: '18:35' }) })
    expect(writes).toHaveBeenCalledWith('update', { release_date: '2030-10-20', release_at: date.toISOString() })
    expect(supabase.rpc).toHaveBeenCalledWith('save_office_release', { release_id: 'release', changes: expect.any(Object) })
  })

  it('reports a failed calendar transaction without confirming the release edit', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: null, error: { message: 'Falha na agenda', code: '23514' } }
    await expect(result.current.updateRelease('release', { title: 'Mudança atômica' })).rejects.toMatchObject({ code: '23514' })
    expect(result.current.releases[0].title).toBe('Single')
    expect(supabase.rpc).toHaveBeenCalledWith('save_office_release', { release_id: 'release', changes: { title: 'Mudança atômica' } })
  })

  it('removes optional files and notes with explicit empty values', async () => {
    const { state, writes } = database()
    const { result } = await loaded()
    state.response = { data: { ...row, cover_url: null, wav_url: null, notes: null }, error: null }
    await act(async () => { await result.current.updateRelease('release', { coverUrl: '', wavUrl: '', notes: '' }) })
    expect(writes).toHaveBeenCalledWith('update', { cover_url: null, wav_url: null, notes: null })
    expect(result.current.releases[0]).toMatchObject({ coverUrl: undefined, wavUrl: undefined, notes: undefined })
  })

  it('reports a rejected creation without adding any release', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: null, error: { message: 'Falha de gravação' } }
    await expect(result.current.createRelease({ title: 'Novo', artist: 'Artista', releaseType: 'single' })).rejects.toMatchObject({ message: 'Falha de gravação' })
    expect(result.current.releases).toHaveLength(1)
  })

  it('removes a date explicitly and leaves omitted fields untouched in partial edits', async () => {
    const { state, writes } = database()
    const { result } = await loaded()
    state.response = { data: { ...row, release_date: null, composers: [], platform_links: [] }, error: null }
    await act(async () => { await result.current.updateRelease('release', { releaseDate: null, composers: [], platformLinks: [] }) })
    expect(writes).toHaveBeenCalledWith('update', { release_date: null, release_at: null, composers: [], platform_links: [] })
    expect(result.current.releases[0].releaseDate).toBeUndefined()
  })

  it('keeps the list after a failed refresh and recovers on a later realtime update', async () => {
    const { state, realtime } = database()
    const { result } = await loaded()
    state.fetchError = { message: 'Falha da rede' }
    await act(async () => { realtime({ eventType: 'UPDATE' }); await Promise.resolve() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.releases[0].title).toBe('Single')
    state.fetchError = null; state.rows = [{ ...row, title: 'Atualização remota' }]
    await act(async () => { realtime({ eventType: 'UPDATE' }) })
    await waitFor(() => expect(result.current.releases[0].title).toBe('Atualização remota'))
  })

  it('does not duplicate a release when realtime delivers its insert during creation', async () => {
    const { state, realtime } = database()
    const { result } = await loaded()
    state.response = { data: { ...row, id: 'new' }, error: null }
    state.afterWrite = () => { state.rows.push({ ...row, id: 'new' }); realtime({ eventType: 'INSERT' }) }
    await act(async () => { await result.current.createRelease({ title: 'Single', artist: 'Artista', releaseType: 'single' }) })
    expect(result.current.releases.filter(release => release.id === 'new')).toHaveLength(1)
  })

  it('does not let an older realtime read remove a newly confirmed release', async () => {
    const { state, realtime } = database()
    const { result } = await loaded()
    let completeRead!: (value: { data: Row[]; error: unknown }) => void
    state.fetchResponse = new Promise(resolve => { completeRead = resolve })
    await act(async () => { realtime({ eventType: 'UPDATE' }); await Promise.resolve() })
    state.response = { data: { ...row, id: 'new' }, error: null }
    await act(async () => { await result.current.createRelease({ title: 'Single', artist: 'Artista', releaseType: 'single' }) })
    expect(result.current.releases.some(release => release.id === 'new')).toBe(true)
    await act(async () => { completeRead({ data: [{ ...row }], error: null }) })
    expect(result.current.releases.some(release => release.id === 'new')).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('removes a remote deletion and releases its realtime channel on unmount', async () => {
    const { realtime, channel } = database()
    const { result, unmount } = await loaded()
    await act(async () => { realtime({ eventType: 'DELETE', old: { id: 'release' } }) })
    expect(result.current.releases).toHaveLength(0)
    unmount()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })

  it('filters by artist and text and sorts a status column by position', async () => {
    const { state } = database()
    state.rows = [{ ...row, id: 'later', position: 2 }, { ...row, id: 'first', position: 0 }, { ...row, id: 'other', artist: 'Outro', release_type: 'album', status: 'released' }]
    const { result } = renderHook(useReleases)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { result.current.setFilters({ artist: 'ARTISTA', searchQuery: 'single', releaseType: 'single' }) })
    expect(result.current.filteredReleases).toHaveLength(2)
    expect(result.current.getReleasesByStatus('scheduled').map(release => release.id)).toEqual(['first', 'later'])
    await act(async () => { result.current.setFilters({ status: 'released' }) })
    expect(result.current.filteredReleases.map(release => release.id)).toEqual(['other'])
  })

  it('updates status and position without losing signed assets', async () => {
    const { state, writes } = database()
    const { result } = await loaded()
    state.response = { data: { ...row, status: 'released', position: 3 }, error: null }
    await act(async () => { await result.current.updateReleaseStatus('release', 'released', 3) })
    expect(writes).toHaveBeenCalledWith('update', { status: 'released', position: 3 })
    expect(result.current.releases[0]).toMatchObject({ status: 'released', position: 3, coverUrl: signed('cover.png') })
  })

  it('preserves status after a rejected move', async () => {
    const { state } = database()
    const { result } = await loaded()
    state.response = { data: null, error: { message: 'Sem permissão' } }
    await expect(result.current.updateReleaseStatus('release', 'released')).rejects.toMatchObject({ message: 'Sem permissão' })
    expect(result.current.releases[0].status).toBe('scheduled')
  })

  it('normalizes legacy JSON strings and malformed lists without dropping the release', async () => {
    const { state } = database()
    state.rows = [{ ...row, artists: '[{"name":"Artista","role":"main"}]', tracks: 'malformed', composers: {}, platform_links: null }]
    const { result } = await loaded()
    expect(result.current.releases[0]).toMatchObject({ artists: [{ name: 'Artista', role: 'main' }], tracks: [], composers: [], platformLinks: [] })
  })

  it('denies creation without a current authenticated user', async () => {
    const { writes } = database()
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })
    const { result } = renderHook(useReleases)
    await expect(result.current.createRelease({ title: 'Single', artist: 'Artista', releaseType: 'single' })).rejects.toThrow('User not authenticated')
    expect(writes).not.toHaveBeenCalled()
  })
})
