import { renderHook, waitFor, act } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useAnnouncements } from '../useAnnouncements'

jest.mock('../useAuth')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('useAnnouncements', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@vibedistro.com',
    name: 'Admin User',
    avatar: null,
    sector: 'TI/Suporte' as const,
    role: 'Admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const announcementRow = {
    id: 'ann-1',
    title: 'Manutenção programada',
    message: 'Sistema ficará indisponível às 22h.',
    priority: 'urgent',
    created_by: user.id,
    target_sectors: [],
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    metadata: { link: '/agenda' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: user.id,
      name: 'Admin User',
      avatar: null,
      sector: 'TI/Suporte',
    },
  }

  function mockFetch(data: unknown[] = [announcementRow], error: unknown = null) {
    const query = {
      select: jest.fn(() => query),
      order: jest.fn().mockResolvedValue({ data, error }),
    }
    ;(supabase.from as jest.Mock).mockReturnValueOnce(query)
    return query
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user })
    ;(supabase.channel as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })
  })

  it('fetches announcements from Supabase instead of returning the disabled empty state', async () => {
    mockFetch([announcementRow])

    const { result } = renderHook(() => useAnnouncements())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(supabase.from).toHaveBeenCalledWith('company_announcements')
    expect(result.current.allAnnouncements).toHaveLength(1)
    expect(result.current.allAnnouncements[0]).toMatchObject({
      id: 'ann-1',
      title: 'Manutenção programada',
      author: { name: 'Admin User' },
    })
    expect(result.current.announcements).toHaveLength(1)
  })

  it('creates announcements and refreshes the list', async () => {
    mockFetch([])
    const { result } = renderHook(() => useAnnouncements())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const insertQuery = {
      insert: jest.fn(() => insertQuery),
      select: jest.fn(() => insertQuery),
      single: jest.fn().mockResolvedValue({ data: announcementRow, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValueOnce(insertQuery)
    mockFetch([announcementRow])
    mockFetch([announcementRow])

    await act(async () => {
      const created = await result.current.createAnnouncement({
        title: 'Manutenção programada',
        message: 'Sistema ficará indisponível às 22h.',
        priority: 'urgent',
        target_sectors: [],
        expires_at: announcementRow.expires_at,
        active: true,
        metadata: { link: '/agenda' },
      })

      expect(created).toMatchObject({ id: 'ann-1' })
    })

    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Manutenção programada',
      created_by: user.id,
    }))
    await waitFor(() => expect(result.current.allAnnouncements).toHaveLength(1))
  })

  it('archives announcements without the temporary disabled toast', async () => {
    mockFetch([announcementRow])
    const { result } = renderHook(() => useAnnouncements())
    await waitFor(() => expect(result.current.allAnnouncements).toHaveLength(1))

    const updateQuery = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValueOnce(updateQuery)
    mockFetch([{ ...announcementRow, active: false }])

    await act(async () => {
      const archived = await result.current.archiveAnnouncement('ann-1')
      expect(archived).toBe(true)
    })

    expect(updateQuery.update).toHaveBeenCalledWith({ active: false })
    expect(result.current.allAnnouncements[0].active).toBe(false)
  })
})
