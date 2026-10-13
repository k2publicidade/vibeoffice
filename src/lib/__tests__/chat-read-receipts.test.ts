/** @jest-environment node */
import { markChatReadBatch } from '../chat-read-receipts'

let client: any
const originalFetch = global.fetch
beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://storage.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test'
  client = { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token-a' } }, error: null }), getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null }) } }
  global.fetch = jest.fn().mockImplementation(async () => Response.json(['message-a']))
})
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); jest.restoreAllMocks() })

it('binds the RPC to the verified token even if the shared session changes during verification', async () => {
  client.auth.getUser.mockImplementation(async (token: string) => {
    expect(token).toBe('token-a')
    client.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-b' } }, error: null })
    return { data: { user: { id: 'user-a' } }, error: null }
  })
  await expect(markChatReadBatch(client, 'user-a', ['message-a'], { keepalive: true })).resolves.toEqual({ status: 'sent', messageIds: ['message-a'] })
  expect(global.fetch).toHaveBeenCalledWith('https://storage.test/rest/v1/rpc/mark_office_messages_read', expect.objectContaining({ body: '{"message_ids":["message-a"]}', keepalive: true, cache: 'no-store', headers: expect.objectContaining({ Authorization: 'Bearer token-a' }) }))
})

it.each(['missing', 'other'])('does not send a batch with a %s account', async kind => {
  if (kind === 'missing') client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  else client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-b' } }, error: null })
  await expect(markChatReadBatch(client, 'user-a', ['message-a'])).resolves.toBe('session-changed')
  expect(global.fetch).not.toHaveBeenCalled()
})

it('rejects provider and authentication failures so the hook can retry the same IDs', async () => {
  global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 503 }))
  await expect(markChatReadBatch(client, 'user-a', ['message-a'])).rejects.toThrow('confirmar a leitura')
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Offline') })
  await expect(markChatReadBatch(client, 'user-a', ['message-a'])).rejects.toThrow('validar a sessão')
})

it('bounds an unresponsive provider and aborts its request', async () => {
  jest.useFakeTimers()
  let signal!: AbortSignal
  global.fetch = jest.fn().mockImplementation((_url, options) => { signal = options.signal; return new Promise(() => {}) })
  const pending = markChatReadBatch(client, 'user-a', ['message-a'])
  const rejected = expect(pending).rejects.toThrow('timed out')
  await jest.advanceTimersByTimeAsync(10001)
  await rejected
  expect(signal.aborted).toBe(true)
  expect(jest.getTimerCount()).toBe(0)
})

it('confirms only the IDs in a valid receipt and rejects a void or foreign receipt', async () => {
  global.fetch = jest.fn().mockResolvedValue(Response.json([]))
  await expect(markChatReadBatch(client, 'user-a', ['message-a'])).resolves.toEqual({ status: 'sent', messageIds: [] })
  global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }))
  await expect(markChatReadBatch(client, 'user-a', ['message-a'])).rejects.toThrow()
  global.fetch = jest.fn().mockResolvedValue(Response.json(['not-requested']))
  await expect(markChatReadBatch(client, 'user-a', ['message-a'])).rejects.toThrow('Recibo')
})
