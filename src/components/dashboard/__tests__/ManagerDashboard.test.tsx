import { render, screen } from '@testing-library/react'
import { ManagerDashboard } from '../ManagerDashboard'

type Loadable<T> = { data: T; isLoading: boolean }

let mockUsers: Loadable<Array<Record<string, unknown>> | null> = {
  data: [
    { id: '1', name: 'Manager User', sector: 'Marketing', role: 'gerente' },
    { id: '2', name: 'Team Member 1', sector: 'Marketing', role: 'colaborador' },
    { id: '3', name: 'Team Member 2', sector: 'Marketing', role: 'colaborador' },
    { id: '4', name: 'Other Sector User', sector: 'TI/Suporte', role: 'colaborador' },
  ],
  isLoading: false,
}

let mockTasks: Loadable<Array<Record<string, unknown>> | null> = {
  data: [
    { id: '1', title: 'Task 1', status: 'done', sector: 'Marketing', assignees: ['2'], dueDate: new Date() },
    { id: '2', title: 'Task 2', status: 'in_progress', sector: 'Marketing', assignees: ['3'], dueDate: new Date() },
    { id: '3', title: 'Task 3', status: 'todo', sector: 'TI/Suporte', assignees: ['4'], dueDate: null },
  ],
  isLoading: false,
}

let mockTickets: Loadable<Array<Record<string, unknown>> | null> = {
  data: [
    { id: '1', title: 'Ticket 1', status: 'open', category: 'Marketing', requester: '2' },
    { id: '2', title: 'Ticket 2', status: 'in_progress', category: 'Marketing', requester: '3' },
    { id: '3', title: 'Ticket 3', status: 'completed', category: 'TI/Suporte', requester: '4' },
  ],
  isLoading: false,
}

let mockEvents: Loadable<Array<Record<string, unknown>> | null> = {
  data: [
    {
      id: '1',
      title: 'Sector Event',
      startTime: new Date(Date.now() + 60_000),
      type: 'sector',
      attendees: ['1', '2', '3'],
    },
    {
      id: '2',
      title: 'Company Event',
      startTime: new Date(Date.now() + 86_400_000),
      type: 'company',
      attendees: ['1'],
    },
  ],
  isLoading: false,
}

jest.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: mockUsers.data, isLoading: mockUsers.isLoading }),
}))

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: mockTasks.data, isLoading: mockTasks.isLoading }),
}))

jest.mock('@/hooks/useTickets', () => ({
  useTickets: () => ({ tickets: mockTickets.data, isLoading: mockTickets.isLoading }),
}))

jest.mock('@/hooks/useCalendar', () => ({
  useCalendar: () => ({ events: mockEvents.data, isLoading: mockEvents.isLoading }),
}))

describe('ManagerDashboard', () => {
  const defaultProps = {
    userName: 'Manager User',
    userSector: 'Marketing' as const,
  }

  beforeEach(() => {
    mockUsers = {
      data: [
        { id: '1', name: 'Manager User', sector: 'Marketing', role: 'gerente' },
        { id: '2', name: 'Team Member 1', sector: 'Marketing', role: 'colaborador' },
        { id: '3', name: 'Team Member 2', sector: 'Marketing', role: 'colaborador' },
        { id: '4', name: 'Other Sector User', sector: 'TI/Suporte', role: 'colaborador' },
      ],
      isLoading: false,
    }
    mockTasks = {
      data: [
        { id: '1', title: 'Task 1', status: 'done', sector: 'Marketing', assignees: ['2'], dueDate: new Date() },
        { id: '2', title: 'Task 2', status: 'in_progress', sector: 'Marketing', assignees: ['3'], dueDate: new Date() },
        { id: '3', title: 'Task 3', status: 'todo', sector: 'TI/Suporte', assignees: ['4'], dueDate: null },
      ],
      isLoading: false,
    }
    mockTickets = {
      data: [
        { id: '1', title: 'Ticket 1', status: 'open', category: 'Marketing', requester: '2' },
        { id: '2', title: 'Ticket 2', status: 'in_progress', category: 'Marketing', requester: '3' },
        { id: '3', title: 'Ticket 3', status: 'completed', category: 'TI/Suporte', requester: '4' },
      ],
      isLoading: false,
    }
    mockEvents = {
      data: [
        {
          id: '1',
          title: 'Sector Event',
          startTime: new Date(Date.now() + 60_000),
          type: 'sector',
          attendees: ['1', '2', '3'],
        },
        {
          id: '2',
          title: 'Company Event',
          startTime: new Date(Date.now() + 86_400_000),
          type: 'company',
          attendees: ['1'],
        },
      ],
      isLoading: false,
    }
  })

  it('should render dashboard title for manager', () => {
    render(<ManagerDashboard {...defaultProps} />)

    expect(screen.getByText(/Dashboard do Setor/i)).toBeInTheDocument()
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

    // 2 tarefas do setor Marketing — '2' aparece em múltiplos cards
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('should show completed tasks for the sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 1 tarefa concluída no setor Marketing
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })

  it('should display open tickets for the sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 2 tickets abertos (open + in_progress) do Marketing
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('should show task completion rate for the sector', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // 1 de 2 tarefas concluídas = 50%
    expect(screen.getByText(/50%/i)).toBeInTheDocument()
  })

  it('should display upcoming sector events', () => {
    render(<ManagerDashboard {...defaultProps} />)

    // Seção de agenda do setor (title)
    expect(screen.getByText('Agenda do Setor')).toBeInTheDocument()
  })

  it('should render team performance section', () => {
    render(<ManagerDashboard {...defaultProps} />)

    expect(screen.getByText('Performance da Equipe')).toBeInTheDocument()
  })

  it('should display loading state when data is loading', () => {
    mockUsers = { data: null, isLoading: true }
    mockTasks = { data: null, isLoading: true }
    mockTickets = { data: null, isLoading: true }
    mockEvents = { data: null, isLoading: true }

    render(<ManagerDashboard {...defaultProps} />)

    const loader = document.querySelector('.animate-spin')
    expect(loader).toBeInTheDocument()
  })
})
