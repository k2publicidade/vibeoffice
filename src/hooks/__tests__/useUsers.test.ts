import { renderHook, waitFor } from '@testing-library/react'
import { useUsers } from '../useUsers'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'

jest.mock('../useAuth')

describe('useUsers', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@vibedistro.com',
    name: 'Test User',
    avatar: null,
    sector: 'TI/Suporte' as const,
    role: 'colaborador' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUsersData = [
    {
      id: 'user-1',
      email: 'test1@vibedistro.com',
      name: 'User 1',
      avatar: null,
      sector: 'TI/Suporte',
      role: 'colaborador',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user-2',
      email: 'test2@vibedistro.com',
      name: 'User 2',
      avatar: null,
      sector: 'Marketing',
      role: 'gerente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user-3',
      email: 'admin@vibedistro.com',
      name: 'Admin User',
      avatar: null,
      sector: 'Administrativo',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  it('should fetch users from Supabase when user is authenticated', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
      expect(result.current.users![0].name).toBe('User 1')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should not fetch users when user is not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })

    const { result } = renderHook(() => useUsers())

    expect(result.current.users).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should get user by ID', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
    })

    const user = result.current.getUserById('user-2')
    expect(user).not.toBeNull()
    expect(user!.name).toBe('User 2')
    expect(user!.sector).toBe('Marketing')
  })

  it('should return null for non-existent user ID', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
    })

    const user = result.current.getUserById('non-existent-id')
    expect(user).toBeNull()
  })

  it('should get users by role', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
    })

    const admins = result.current.getUsersByRole('admin')
    expect(admins).toHaveLength(1)
    expect(admins[0].name).toBe('Admin User')

    const gerentes = result.current.getUsersByRole('gerente')
    expect(gerentes).toHaveLength(1)
    expect(gerentes[0].name).toBe('User 2')

    const colaboradores = result.current.getUsersByRole('colaborador')
    expect(colaboradores).toHaveLength(1)
  })

  it('should get users by sector', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
    })

    const tiUsers = result.current.getUsersBySector('TI/Suporte')
    expect(tiUsers).toHaveLength(1)
    expect(tiUsers[0].sector).toBe('TI/Suporte')

    const marketingUsers = result.current.getUsersBySector('Marketing')
    expect(marketingUsers).toHaveLength(1)
    expect(marketingUsers[0].sector).toBe('Marketing')
  })

  it('should return empty array for sector with no users', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
    })

    const financialUsers = result.current.getUsersBySector('Financeiro')
    expect(financialUsers).toHaveLength(0)
  })

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching users:',
        expect.objectContaining({ message: 'Database error' })
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('should memoize helper functions', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockUsersData,
        error: null,
      }),
    })

    const { result, rerender } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.users).toHaveLength(3)
    })

    const getUserById1 = result.current.getUserById
    const getUsersByRole1 = result.current.getUsersByRole
    const getUsersBySector1 = result.current.getUsersBySector

    rerender()

    // Funções devem manter a mesma referência (memoization)
    expect(result.current.getUserById).toBe(getUserById1)
    expect(result.current.getUsersByRole).toBe(getUsersByRole1)
    expect(result.current.getUsersBySector).toBe(getUsersBySector1)
  })
})
