/** @jest-environment node */
import { POST } from '../route'

const id = '11111111-1111-4111-8111-111111111111'
let mockPreferences = { enable_email: true, enable_push: false }
let mockSubscriptions: { id: string; endpoint: string; keys: { p256dh: string; auth: string } }[] = []
const mockUpdate = jest.fn()
const mockSendPush = jest.fn()
const mockVapid = jest.fn()
jest.mock('web-push', () => ({
  __esModule: true, default: { sendNotification: (...args: unknown[]) => mockSendPush(...args), setVapidDetails: (...args: unknown[]) => mockVapid(...args) },
}))
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const data = table === 'notifications'
        ? { id, entity_type: 'task', entity_id: id, user_id: id, title: 'Tarefa', message: 'Teste', type: 'task_assigned', archived: false }
        : table === 'users' ? { email: 'audit@example.invalid', active: true }
          : table === 'notification_preferences' ? mockPreferences : mockSubscriptions
      const query = {
        select: () => query, eq: () => query, delete: () => query,
        update: (values: unknown) => { mockUpdate(values); return query },
        single: async () => ({ data, error: null }), maybeSingle: async () => ({ data, error: null }),
        then: (resolve: (value: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve),
      }
      return query
    },
  }),
}))

describe('notification delivery failure recovery', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NOTIFICATION_WEBHOOK_SECRET: 'audit-secret', RESEND_API_KEY: 'audit-key', EMAIL_FROM: 'VibeOffice <audit@example.invalid>' }
    delete process.env.VAPID_PRIVATE_KEY
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    mockPreferences = { enable_email: true, enable_push: false }
    mockSubscriptions = []
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    mockSendPush.mockResolvedValue(undefined)
  })
  afterEach(() => { process.env = originalEnv; global.fetch = originalFetch })
  function deliver() {
    return POST(new Request('https://office.vibedistro.com/api/notifications/deliver', {
      method: 'POST', headers: { authorization: 'Bearer audit-secret', 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    }))
  }

  it('sends the individual record link through Resend with an idempotency key', async () => {
    expect((await deliver()).status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'office-' + id }),
      body: expect.stringContaining('https://office.vibedistro.com/tasks?open=' + id),
    }))
    expect(mockUpdate).toHaveBeenCalledWith({ email_sent_at: expect.any(String) })
  })

  it('returns a retryable channel failure when the Resend network request rejects', async () => {
    jest.mocked(global.fetch).mockRejectedValue(new Error('network unavailable'))
    const response = await deliver()
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ delivered: false, failedChannels: ['email'] })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does not claim push delivery when VAPID configuration is missing', async () => {
    mockPreferences = { enable_email: false, enable_push: true }
    const response = await deliver()
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ delivered: false, failedChannels: ['push_unconfigured'] })
    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('continues delivering to valid devices after a malformed subscription', async () => {
    mockPreferences = { enable_email: false, enable_push: true }
    process.env.VAPID_PRIVATE_KEY = 'test-private'
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public'
    mockSubscriptions = [
      { id: 'broken', endpoint: 'not a URL', keys: { p256dh: 'test', auth: 'test' } },
      { id: 'valid', endpoint: 'https://fcm.googleapis.com/audit', keys: { p256dh: 'test', auth: 'test' } },
    ]
    const response = await deliver()
    expect(response.status).toBe(502)
    expect(mockSendPush).toHaveBeenCalledTimes(1)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
