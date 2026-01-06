import { render, screen } from '@testing-library/react'
import { ManagerDashboard } from '../ManagerDashboard'

jest.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({
    users: [
      { id: '1', name: 'Manager User', sector: 'Marketing', role: 'gerente' },
      { id: '2', name: 'Team Member 1', sector: 'Marketing', role: 'colaborador' },
      { id: '3', name: 'Team Member 2', sector: 'Marketing', role: 'colaborador' },
      { id: '4', name: 'Other Sector User', sector: 'TI/Suporte', role: 'colaborador' },
    ],
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [
      { id: '1', title: 'Task 1', status: 'done', sector: 'Marketing', assignedTo: '2', dueDate: new Date() },
      { id: '2', title: 'Task 2', status: 'in_progress', sector: 'Marketing', assignedTo: '3', dueDate: new Date() },
      { id: '3', title: 'Task 3', status: 'todo', sector: 'TI/Suporte', assignedTo: '4', dueDate: null },
    ],
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useTickets', () => ({
  useTickets: () => ({
    tickets: [
      { id: '1', title: 'Ticket 1', status: 'open', category: 'Marketing', requester: '2' },
      { id: '2', title: 'Ticket 2', status: 'in_progress', category: 'Marketing', requester: '3' },
      { id: '3', title: 'Ticket 3', status: 'completed', category: 'TI/Suporte', requester: '4' },
    ],
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useCalendar', () => ({
  useCalendar: () => ({
    events: [
      {
        id: '1',
        title: 'Sector Event',
        startTime: new Date(),
        type: 'sector',
        attendees: ['1', '2', '3']
      },
      {
        id: '2',
        title: 'Company Event',
        startTime: new Date(Date.now() + 86400000),
        type: 'company',
        attendees: ['1']
      },
    ],
    isLoading: false,
  }),
}))

describe('ManagerDashboard', () => {
  const defaultProps = {
    userName: 'Manager User',
    userSector: 'Marketing' as const,
  }

  it('should render dashboard title for manager', () => {
    render(<ManagerDashboard {...defaultProps} />)

    expect(screen.getByText(/Dashboard - Marketing/i)).toBeInTheDocument()
  })

  it('should display manager greeting', () => {
    render(<ManagerDashboard {...defaultProps} />)

    expect(screen.getByText(/Olá, Manager User/i)).toBeInTheDocument()
  })

  it('should show only team members from the same sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 3 membros do setor Marketing (incluindo o gerente)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should display sector-specific task statistics', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 2 tarefas do setor Marketing
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should show completed tasks for the sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 1 tarefa concluída no setor Marketing
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('should display open tickets for the sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 2 tickets abertos (open + in_progress) do Marketing
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should show task completion rate for the sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 1 de 2 tarefas concluídas = 50%
    expect(screen.getByText(/50%/i)).toBeInTheDocument()
  })

  it('should display upcoming sector events', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // Pelo menos 1 evento upcoming
    expect(screen.getByText(/Próximos Eventos|Eventos/i)).toBeInTheDocument()
  })

  it('should render team performance section', () => {
    render(<ManagerDashboard {...defaultProps} />)

    expect(screen.getByText(/Performance da Equipe|Equipe/i)).toBeInTheDocument()
  })

  it('should display loading state when data is loading', () => {
    jest.mock('@/hooks/useUsers', () => ({
      useUsers: () => ({ users: null, isLoading: true }),
    }))

    render(<ManagerDashboard {...defaultProps} />)

    const loader = document.querySelector('.animate-spin')
    expect(loader).toBeInTheDocument()
  })
})
