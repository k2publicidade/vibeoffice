/** @jest-environment node */
import { POST } from '../route'
const mockRole = jest.fn()
const mockAuth = jest.fn()
const mockCreate = jest.fn()
const mockDelete = jest.fn()
const mockUpdate = jest.fn()
const mockProfile = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: mockAuth }, rpc: mockRole }) }))
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { admin: { createUser: mockCreate, deleteUser: mockDelete } }, from: () => ({ update: (values: unknown) => { mockUpdate(values); return { eq: () => ({ select: () => ({ single: mockProfile }) }) } } }) }) }))
function request(body: unknown, origin = 'https://office.test') { return new Request('https://office.test/api/admin/users', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
beforeEach(() => {
 jest.clearAllMocks()
 process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
 mockRole.mockResolvedValue({ data: 'Admin' })
 mockAuth.mockResolvedValue({ data: { user: { id: 'admin' } } })
 mockCreate.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null })
 mockProfile.mockResolvedValue({ data: { id: 'new-user' }, error: null })
 mockDelete.mockResolvedValue({ error: null })
})
it('creates a confirmed collaborator with only email and password', async () => {
 const response = await POST(request({ email: 'TEST@example.com', password: 'secure-password' }))
 expect(response.status).toBe(201)
 expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com', password: 'secure-password', email_confirm: true, app_metadata: { office_enabled: true } }))
 expect(mockUpdate).toHaveBeenCalledWith({ name: 'test', role: 'Colaborador', sector: 'Administrativo', active: true })
 expect(await response.json()).toEqual({ id: 'new-user', email: 'test@example.com' })
})
it.each(['Colaborador', 'Gerente', null])('rejects callers without fully authorized admin access: %s', async role => {
 mockRole.mockResolvedValue({ data: role })
 expect((await POST(request({ email: 'a@example.com', password: 'secure-password' }))).status).toBe(403)
 expect(mockCreate).not.toHaveBeenCalled()
})
it('rejects cross-origin creation', async () => {
 expect((await POST(request({}, 'https://other.test'))).status).toBe(403)
 expect(mockCreate).not.toHaveBeenCalled()
})
it('rejects weak passwords', async () => {
 expect((await POST(request({ email: 'a@example.com', password: '123' }))).status).toBe(400)
 expect(mockCreate).not.toHaveBeenCalled()
})
it('rolls back the auth account when the profile could not be saved', async () => {
 mockProfile.mockResolvedValue({ data: null, error: { message: 'failed' } })
 expect((await POST(request({ email: 'a@example.com', password: 'secure-password' }))).status).toBe(500)
 expect(mockDelete).toHaveBeenCalledWith('new-user')
})
it('reports duplicate accounts without changing profiles', async () => {
 mockCreate.mockResolvedValue({ data: null, error: { message: 'Email already registered' } })
 expect((await POST(request({ email: 'a@example.com', password: 'secure-password' }))).status).toBe(400)
 expect(mockUpdate).not.toHaveBeenCalled()
})
