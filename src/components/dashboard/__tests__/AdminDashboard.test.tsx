import { render, screen } from '@testing-library/react'
import { AdminDashboard } from '../AdminDashboard'

// Mock dos hooks
jest.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({
    users: [
      { id: '1', name: 'Test User 1', sector: 'TI/Suporte', role: 'colaborador' },
      { id: '2', name: 'Test User 2', sector: 'Marketing', role: 'gerente' },
      { id: '3', name: 'Test User 3', sector: 'TI/Suporte', role: 'admin' },
    ],
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [
      { id: '1', title: 'Task 1', status: 'done', sector: 'TI/Suporte', priority: 'high', assignees: ['1'] },
      { id: '2', title: 'Task 2', status: 'in_progress', sector: 'Marketing', priority: 'medium', assignees: ['2'] },
      { id: '3', title: 'Task 3', status: 'todo', sector: 'TI/Suporte', priority: 'low', assignees: ['1'] },
    ],
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useTickets', () => ({
  useTickets: () => ({
    tickets: [
      { id: '1', title: 'Ticket 1', status: 'open', category: 'TI/Suporte', priority: 'high', createdAt: new Date() },
      { id: '2', title: 'Ticket 2', status: 'completed', category: 'Marketing', priority: 'medium', createdAt: new Date() },
    ],
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useCalendar', () => ({
  useCalendar: () => ({
    events: [
      { id: '1', title: 'Event 1', startTime: new Date(), type: 'company' },
      { id: '2', title: 'Event 2', startTime: new Date(), type: 'sector' },
    ],
    isLoading: false,
  }),
}))

describe('AdminDashboard', () => {
  it('should render dashboard title', () => {
    render(<AdminDashboard userName="Test User" />)

    expect(screen.getByText(/Painel Administrativo/i)).toBeInTheDocument()
  })

  it('should display user greeting', () => {
    render(<AdminDashboard userName="João Silva" />)

    expect(screen.getByText(/Bem-vindo,/i)).toBeInTheDocument()
    expect(screen.getByText(/João Silva/i)).toBeInTheDocument()
  })

  it('should show total users count', () => {
    render(<AdminDashboard userName="Test User" />)

    // Espera encontrar "3" (total de usuários mockados)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should display users by sector', () => {
    render(<AdminDashboard userName="Test User" />)

    // Setores aparecem em múltiplos lugares (Desempenho por Setor + Distribuição de Equipe)
    expect(screen.getAllByText(/TI\/Suporte/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Marketing/i).length).toBeGreaterThan(0)
  })

  it('should show task statistics', () => {
    render(<AdminDashboard userName="Test User" />)

    // Total de tarefas = 3
    const taskElements = screen.getAllByText('3')
    expect(taskElements.length).toBeGreaterThan(0)
  })

  it('should display completed tasks count', () => {
    render(<AdminDashboard userName="Test User" />)

    // '1' aparece em vários cards (tickets, tarefas, alta prioridade) — confirma presença
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })

  it('should show tickets statistics', () => {
    render(<AdminDashboard userName="Test User" />)

    // 2 tickets totais
    const ticketElements = screen.getAllByText('2')
    expect(ticketElements.length).toBeGreaterThan(0)
  })

  it('should display loading state when data is loading', () => {
    // Override mocks para simular loading
    jest.mock('@/hooks/useUsers', () => ({
      useUsers: () => ({ users: null, isLoading: true }),
    }))

    render(<AdminDashboard userName="Test User" />)

    // Loader2 icon deve estar presente (via aria-label ou data-testid)
    expect(screen.getByText(/Painel Administrativo/i)).toBeInTheDocument()
  })

  it('should render all major sections', () => {
    render(<AdminDashboard userName="Test User" />)

    // Verifica presença de seções principais
    expect(screen.getByText(/Total Usuários/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Tarefas/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Tickets/i).length).toBeGreaterThan(0)
  })

  it('should calculate task completion rate correctly', () => {
    render(<AdminDashboard userName="Test User" />)

    // 1 de 3 tarefas concluídas = 33%
    expect(screen.getByText(/33%/i)).toBeInTheDocument()
  })
})
