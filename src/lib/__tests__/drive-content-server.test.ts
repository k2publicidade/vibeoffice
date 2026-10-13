/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: jest.fn() }))
jest.mock('@/lib/drive-sharing-server', () => ({ resolveDriveShare: jest.fn() }))

import { serveDriveContent } from '../drive-content-server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveDriveShare } from '../drive-sharing-server'

const id = '11111111-1111-4111-8111-111111111111'
const item = { id, type: 'file', name: "ação';.pdf", storage_path: 'private/document.pdf' }
const request = (headers?: HeadersInit, method = 'GET') => new Request(`https://office.test/api/drive/files/${id}/content`, { headers, method })
let client: any, select: jest.Mock, storage: jest.Mock
beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://storage.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test'
  select = jest.fn().mockResolvedValue({ data: item, error: null })
  client = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user' } }, error: null }), mfa: { getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: { nextLevel: 'aal1', currentLevel: 'aal1' }, error: null }) }, getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'user-test' } } }) }, from: jest.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: select }) }) })) }
  ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(client)
  storage = jest.fn().mockImplementation(() => Promise.resolve(new Response('PDF bytes', { headers: { 'content-type': 'application/pdf', 'content-length': '9', 'accept-ranges': 'bytes' } })))
  global.fetch = storage
})

it.each(['anonymous', 'mfa', 'missing'])('denies %s access before contacting Storage', async mode => {
  if (mode === 'anonymous') client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
  if (mode === 'mfa') client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { nextLevel: 'aal2', currentLevel: 'aal1' } })
  if (mode === 'missing') select.mockResolvedValue({ data: null, error: null })
  const result = await serveDriveContent(request(), id)
  expect(result.status).toBe(mode === 'anonymous' ? 401 : mode === 'mfa' ? 403 : 404)
  expect(result.headers.get('cache-control')).toContain('no-store')
  expect(storage).not.toHaveBeenCalled()
})

it('streams authorized bytes without bearer redirects or cacheable responses', async () => {
  const result = await serveDriveContent(request(), id)
  expect(await result.text()).toBe('PDF bytes')
  expect(result.status).toBe(200)
  expect(result.headers.get('location')).toBeNull()
  expect(result.headers.get('vercel-cdn-cache-control')).toBe('no-store')
  expect(result.headers.get('vary')).toBe('Cookie')
  expect(result.headers.get('x-frame-options')).toBe('SAMEORIGIN')
  expect(result.headers.get('content-disposition')).toContain("filename*=UTF-8''a%C3%A7%C3%A3o%27%3B.pdf")
  const [url, options] = storage.mock.calls[0]
  expect(url.pathname).toBe('/storage/v1/object/authenticated/drive-files/private/document.pdf')
  expect(url.searchParams.get('cacheNonce')).toBeTruthy()
  expect(options.cache).toBe('no-store')
  expect(options.redirect).toBe('error')
  expect(options.headers.get('authorization')).toBe('Bearer user-test')
})

it('forwards a single byte range and preserves partial content headers', async () => {
  storage.mockResolvedValue(new Response('bytes', { status: 206, headers: { 'content-type': 'application/pdf', 'content-range': 'bytes 0-4/9', 'content-length': '5' } }))
  const result = await serveDriveContent(request({ Range: 'bytes=0-4' }), id)
  expect(result.status).toBe(206)
  expect(result.headers.get('content-range')).toBe('bytes 0-4/9')
  expect(storage.mock.calls[0][1].headers.get('range')).toBe('bytes=0-4')
})

it('rejects multiple ranges and malformed IDs before fetching bytes', async () => {
  expect((await serveDriveContent(request({ Range: 'bytes=0-4,6-8' }), id)).status).toBe(416)
  expect((await serveDriveContent(request(), '../secret')).status).toBe(404)
  expect(storage).not.toHaveBeenCalled()
})

it.each(['../secret', 'private/../secret', '/private/secret', 'private\\secret', 'private//secret'])('rejects an unsafe stored path %s', async storage_path => {
  select.mockResolvedValue({ data: { ...item, storage_path }, error: null })
  expect((await serveDriveContent(request(), id)).status).toBe(404)
  expect(storage).not.toHaveBeenCalled()
})

it('cancels already fetched bytes when access is revoked during the upstream request', async () => {
  select.mockResolvedValueOnce({ data: item, error: null }).mockResolvedValueOnce({ data: null, error: null })
  const upstream = new Response('secret')
  const cancel = jest.spyOn(upstream.body!, 'cancel')
  storage.mockResolvedValue(upstream)
  expect((await serveDriveContent(request(), id)).status).toBe(404)
  expect(cancel).toHaveBeenCalled()
})

it('never renders active HTML content inline on the application origin', async () => {
  storage.mockResolvedValue(new Response('<script>bad()</script>', { headers: { 'content-type': 'text/html' } }))
  const result = await serveDriveContent(request(), id)
  expect(result.headers.get('content-disposition')).toMatch(/^attachment/)
  expect(result.headers.get('x-content-type-options')).toBe('nosniff')
  expect(result.headers.get('content-security-policy')).toContain("default-src 'none'")
})

it('cancels the upstream body if permission revalidation fails', async () => {
  select.mockResolvedValueOnce({ data: item, error: null }).mockResolvedValueOnce({ data: null, error: new Error('Database unavailable') })
  const upstream = new Response('secret')
  const cancel = jest.spyOn(upstream.body!, 'cancel')
  storage.mockResolvedValue(upstream)
  expect((await serveDriveContent(request(), id)).status).toBe(503)
  expect(cancel).toHaveBeenCalled()
})

it('uses the public reader only while the sharing resolver confirms publication', async () => {
  ;(resolveDriveShare as jest.Mock).mockResolvedValue({ status: 'ok', item, publicAccess: true, reader: client })
  const result = await serveDriveContent(request(), id, true)
  expect(result.status).toBe(200)
  expect(storage.mock.calls[0][1].headers.get('authorization')).toBe('Bearer service-test')
  expect(result.headers.get('content-disposition')).toMatch(/^attachment/)
  expect(client.auth.getSession).not.toHaveBeenCalled()
  ;(resolveDriveShare as jest.Mock).mockResolvedValue({ status: 'login' })
  expect((await serveDriveContent(request(), id, true)).status).toBe(401)
})

it('handles Storage failure without returning its body or caching the error', async () => {
  storage.mockResolvedValue(new Response('internal secret', { status: 500 }))
  const result = await serveDriveContent(request(), id)
  expect(result.status).toBe(503)
  expect(await result.text()).not.toContain('secret')
  storage.mockRejectedValue(new Error('network secret'))
  expect((await serveDriveContent(request(), id)).status).toBe(503)
})

it('forwards HEAD without returning a body', async () => {
  const result = await serveDriveContent(request(undefined, 'HEAD'), id)
  expect(storage.mock.calls[0][1].method).toBe('HEAD')
  expect(result.body).toBeNull()
})
