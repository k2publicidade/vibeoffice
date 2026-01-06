import { render, screen } from '@testing-library/react'
import { QuickStats } from '../QuickStats'

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [
      { id: '1', title: 'Task 1', status: 'done' },
      { id: '2', title: 'Task 2', status: 'in_progress' },
      { id: '3', title: 'Task 3', status: 'done' },
      { id: '4', title: 'Task 4', status: 'todo' },
    ],
  }),
}))

jest.mock('@/hooks/useTickets', () => ({
  useTickets: () => ({
    tickets: [
      { id: '1', title: 'Ticket 1', status: 'open' },
      { id: '2', title: 'Ticket 2', status: 'open' },
      { id: '3', title: 'Ticket 3', status: 'completed' },
    ],
  }),
}))

jest.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({
    users: [
      { id: '1', name: 'User 1' },
      { id: '2', name: 'User 2' },
      { id: '3', name: 'User 3' },
      { id: '4', name: 'User 4' },
      { id: '5', name: 'User 5' },
    ],
  }),
}))

describe('QuickStats', () => {
  it('should render all stat cards', () => {
    render(<QuickStats />)

    // Deve renderizar cards com estatísticas
    expect(screen.getByText(/Tarefas Concluídas|Concluídas/i)).toBeInTheDocument()
    expect(screen.getByText(/Tickets Abertos|Abertos/i)).toBeInTheDocument()
    expect(screen.getByText(/Usuários Ativos|Ativos/i)).toBeInTheDocument()
  })

  it('should display correct number of completed tasks', () => {
    render(<QuickStats />)

    // 2 tarefas concluídas (status 'done')
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should display correct task completion rate', () => {
    render(<QuickStats />)

    // 2 de 4 tarefas = 50%
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('should display correct number of open tickets', () => {
    render(<QuickStats />)

    // 2 tickets com status 'open'
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should display correct number of active users', () => {
    render(<QuickStats />)

    // 5 usuários mockados
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show trend indicators', () => {
    render(<QuickStats />)

    // Deve ter ícones de tendência (TrendingUp ou TrendingDown)
    const trendIcons = document.querySelectorAll('svg')
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('should handle zero tasks gracefully', () => {
    jest.mock('@/hooks/useTasks', () => ({
      useTasks: () => ({ tasks: [] }),
    }))

    render(<QuickStats />)

    // Não deve quebrar, deve mostrar 0%
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should handle zero tickets gracefully', () => {
    jest.mock('@/hooks/useTickets', () => ({
      useTickets: () => ({ tickets: [] }),
    }))

    render(<QuickStats />)

    // Não deve quebrar
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should handle null data from hooks', () => {
    jest.mock('@/hooks/useTasks', () => ({
      useTasks: () => ({ tasks: null }),
    }))
    jest.mock('@/hooks/useTickets', () => ({
      useTickets: () => ({ tickets: null }),
    }))
    jest.mock('@/hooks/useUsers', () => ({
      useUsers: () => ({ users: null }),
    }))

    render(<QuickStats />)

    // Deve renderizar sem erros
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
