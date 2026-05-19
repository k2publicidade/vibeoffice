import { render, screen } from '@testing-library/react'
import { QuickStats } from '../QuickStats'

let mockTasks: Array<{ id: string; title: string; status: string }> | null = [
  { id: '1', title: 'Task 1', status: 'done' },
  { id: '2', title: 'Task 2', status: 'in_progress' },
  { id: '3', title: 'Task 3', status: 'done' },
  { id: '4', title: 'Task 4', status: 'todo' },
]

let mockTickets: Array<{ id: string; title: string; status: string }> | null = [
  { id: '1', title: 'Ticket 1', status: 'open' },
  { id: '2', title: 'Ticket 2', status: 'open' },
  { id: '3', title: 'Ticket 3', status: 'completed' },
]

let mockUsers: Array<{ id: string; name: string }> | null = [
  { id: '1', name: 'User 1' },
  { id: '2', name: 'User 2' },
  { id: '3', name: 'User 3' },
  { id: '4', name: 'User 4' },
  { id: '5', name: 'User 5' },
]

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: mockTasks }),
}))

jest.mock('@/hooks/useTickets', () => ({
  useTickets: () => ({ tickets: mockTickets }),
}))

jest.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: mockUsers }),
}))

describe('QuickStats', () => {
  beforeEach(() => {
    mockTasks = [
      { id: '1', title: 'Task 1', status: 'done' },
      { id: '2', title: 'Task 2', status: 'in_progress' },
      { id: '3', title: 'Task 3', status: 'done' },
      { id: '4', title: 'Task 4', status: 'todo' },
    ]
    mockTickets = [
      { id: '1', title: 'Ticket 1', status: 'open' },
      { id: '2', title: 'Ticket 2', status: 'open' },
      { id: '3', title: 'Ticket 3', status: 'completed' },
    ]
    mockUsers = [
      { id: '1', name: 'User 1' },
      { id: '2', name: 'User 2' },
      { id: '3', name: 'User 3' },
      { id: '4', name: 'User 4' },
      { id: '5', name: 'User 5' },
    ]
  })

  it('should render all stat cards', () => {
    render(<QuickStats />)

    expect(screen.getByText(/Taxa de Conclusão/i)).toBeInTheDocument()
    expect(screen.getByText(/Tickets Abertos/i)).toBeInTheDocument()
    expect(screen.getByText(/Usuários Ativos/i)).toBeInTheDocument()
  })

  it('should display correct task completion rate', () => {
    render(<QuickStats />)

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('should display correct number of open tickets', () => {
    render(<QuickStats />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should display correct number of active users', () => {
    render(<QuickStats />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show trend indicators', () => {
    render(<QuickStats />)

    const trendIcons = document.querySelectorAll('svg')
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('should handle zero tasks gracefully', () => {
    mockTasks = []

    render(<QuickStats />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should handle zero tickets gracefully', () => {
    mockTickets = []

    render(<QuickStats />)

    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('should handle null data from hooks', () => {
    mockTasks = null
    mockTickets = null
    mockUsers = null

    render(<QuickStats />)

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })
})
