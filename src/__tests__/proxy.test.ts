/** @jest-environment node */
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

const mockGetUser = jest.fn()
const mockAssurance = jest.fn()
const mockProfile = jest.fn()
jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser, mfa: { getAuthenticatorAssuranceLevel: mockAssurance }, signOut: jest.fn() },
    from: () => ({ select: () => ({ eq: () => ({ single: mockProfile }) }) }),
  }),
}))

describe('protected notification links across authentication', () => {
  const destination = '/tasks?open=11111111-1111-4111-8111-111111111111'
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockAssurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    mockProfile.mockResolvedValue({ data: { role: 'Admin', active: true } })
  })

  it('preserves the requested record when sign-in is required', async () => {
    const response = await proxy(new NextRequest('https://office.vibedistro.com' + destination))
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe(destination)
  })

  it.each(['/api/drive/cleanup', '/api/notifications/deliver'])('lets %s authenticate the worker in its route without a browser session', async path => {
    const response = await proxy(new NextRequest('https://office.vibedistro.com' + path, {
      method: 'POST', headers: { authorization: 'Bearer worker-test' }, body: '{}',
    }))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it.each(['/api/drive/cleanup/other', '/api/drive/other'])('keeps adjacent route %s protected', async path => {
    const response = await proxy(new NextRequest('https://office.vibedistro.com' + path))
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login')
  })

  it('preserves the requested record when MFA is required', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    mockAssurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } })
    const response = await proxy(new NextRequest('https://office.vibedistro.com' + destination))
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/auth/mfa')
    expect(location.searchParams.get('next')).toBe(destination)
  })

  it('honors a safe login destination when a session already exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    const response = await proxy(new NextRequest('https://office.vibedistro.com/login?next=' + encodeURIComponent(destination)))
    expect(new URL(response.headers.get('location')!).pathname + new URL(response.headers.get('location')!).search).toBe(destination)
  })

  it('rejects a login destination outside the application', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    const response = await proxy(new NextRequest('https://office.vibedistro.com/login?next=https://evil.example'))
    expect(response.headers.get('location')).toBe('https://office.vibedistro.com/')
  })
})
