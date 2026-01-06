import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { supabase } from '@/lib/supabase/client'

// Mock do supabase client já está em jest.setup.js

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null user when not authenticated', () => {
    // Mock: sem usuário autenticado
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(true) // Loading inicial
  })

  it('should fetch user profile from database when authenticated', async () => {
    const mockAuthUser = {
      id: 'user-1',
      email: 'test@vibedistro.com',
    }

    const mockUserProfile = {
      id: 'user-1',
      email: 'test@vibedistro.com',
      name: 'Test User',
      avatar: null,
      sector: 'TI/Suporte',
      role: 'colaborador',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Mock: usuário autenticado
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    })

    // Mock: perfil do usuário no banco
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: 'user-1',
        email: 'test@vibedistro.com',
        name: 'Test User',
        avatar: null,
        sector: 'TI/Suporte',
        role: 'colaborador',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle sign in successfully', async () => {
    const mockCredentials = {
      email: 'test@vibedistro.com',
      password: 'password123',
    }

    const mockAuthUser = {
      id: 'user-1',
      email: 'test@vibedistro.com',
    }

    const mockUserProfile = {
      id: 'user-1',
      email: 'test@vibedistro.com',
      name: 'Test User',
      avatar: null,
      sector: 'TI/Suporte',
      role: 'colaborador',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Mock: login bem sucedido
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockAuthUser, session: {} },
      error: null,
    })

    // Mock: perfil do usuário
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth())

    await result.current.signIn(mockCredentials.email, mockCredentials.password)

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
    })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })
  })

  it('should handle sign in error', async () => {
    const mockError = { message: 'Invalid credentials' }

    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    })

    const { result } = renderHook(() => useAuth())

    await expect(
      result.current.signIn('invalid@test.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials')
  })

  it('should handle sign out successfully', async () => {
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    await result.current.signOut()

    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })

  it('should handle sign out error', async () => {
    const mockError = { message: 'Sign out failed' }

    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: mockError,
    })

    const { result } = renderHook(() => useAuth())

    await expect(result.current.signOut()).rejects.toThrow('Sign out failed')
  })

  it('should handle missing user profile gracefully', async () => {
    const mockAuthUser = {
      id: 'user-1',
      email: 'test@vibedistro.com',
    }

    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    })

    // Mock: perfil não encontrado
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      }),
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should subscribe to auth state changes', async () => {
    const mockCallback = jest.fn()

    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    })

    renderHook(() => useAuth())

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
  })

  it('should clean up subscription on unmount', () => {
    const mockUnsubscribe = jest.fn()

    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    })

    const { unmount } = renderHook(() => useAuth())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
