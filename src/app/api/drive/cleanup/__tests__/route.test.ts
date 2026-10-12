/** @jest-environment node */
import { POST } from '../route'

const id = '11111111-1111-4111-8111-111111111111'
const mockProcess = jest.fn()
const mockAuth = jest.fn()
const mockRole = jest.fn()
const mockLookup = jest.fn()
jest.mock('@/lib/drive-cleanup', () => ({ processDriveCleanup: (...args: unknown[]) => mockProcess(...args) }))
jest.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: () => mockAuth() }, rpc: () => mockRole() }) }))
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => {
  const query = { select: () => query, eq: () => query, limit: () => mockLookup() }
  return query
} }) }))
const env = process.env
beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...env, NOTIFICATION_WEBHOOK_SECRET: 'test-worker' }
  mockProcess.mockResolvedValue({ processed: 1, pending: false })
  mockAuth.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null })
  mockRole.mockResolvedValue({ data: 'Colaborador', error: null })
  mockLookup.mockResolvedValue({ data: [{ id }], error: null })
})
afterEach(() => { process.env = env })
function request(body: unknown = { deletionId: id }, authorization?: string) {
  return new Request('https://office.vibedistro.com/api/drive/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization } : {}) }, body: JSON.stringify(body) })
}
it('allows a worker to process durable jobs without a user cookie', async () => {
  expect((await POST(request({}, 'Bearer test-worker'))).status).toBe(200)
  expect(mockAuth).not.toHaveBeenCalled()
  expect(mockProcess).toHaveBeenCalledWith(expect.anything(), null)
})
it('rejects an incorrect worker credential', async () => {
  expect((await POST(request({}, 'Bearer incorrect'))).status).toBe(401)
  expect(mockProcess).not.toHaveBeenCalled()
})
it('rejects requests supplying arbitrary storage paths', async () => {
  expect((await POST(request({ deletionId: id, paths: ['other/file'] }, 'Bearer test-worker'))).status).toBe(400)
  expect(mockProcess).not.toHaveBeenCalled()
})
it('rejects an unauthenticated caller', async () => {
  mockAuth.mockResolvedValue({ data: { user: null }, error: null })
  expect((await POST(request())).status).toBe(401)
  expect(mockProcess).not.toHaveBeenCalled()
})
it('rejects an inactive user or MFA-restricted session', async () => {
  mockRole.mockResolvedValue({ data: null, error: null })
  expect((await POST(request())).status).toBe(403)
  expect(mockProcess).not.toHaveBeenCalled()
})
it('requires a specific deletion group for ordinary users', async () => {
  expect((await POST(request({}))).status).toBe(403)
  expect(mockProcess).not.toHaveBeenCalled()
})
it('rejects a deletion group that does not belong to the requester', async () => {
  mockLookup.mockResolvedValue({ data: [], error: null })
  expect((await POST(request())).status).toBe(403)
  expect(mockProcess).not.toHaveBeenCalled()
})
it('processes an authorized deletion group and acknowledges queued retries', async () => {
  mockProcess.mockResolvedValue({ processed: 0, pending: true })
  const response = await POST(request())
  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({ processed: 0, pending: true })
  expect(mockProcess).toHaveBeenCalledWith(expect.anything(), id)
})
it.each(['lookup','worker'])('returns a retryable status after a %s failure', async failure => {
  if(failure==='lookup') mockLookup.mockResolvedValue({data:null,error:new Error('Unavailable')})
  else mockProcess.mockRejectedValue(new Error('Unavailable'))
  expect((await POST(request())).status).toBe(503)
})
