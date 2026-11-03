import { fireEvent, render, screen } from '@testing-library/react'
import { PremiumTaskCard } from '../PremiumTaskCard'
import { PremiumKanbanBoard } from '../PremiumKanbanBoard'
import type { Task } from '@/types/tasks'

jest.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users: [] }) }))
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({ attributes: { role: 'button', tabIndex: 0 }, listeners: {}, setNodeRef: jest.fn(), isDragging: false }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: jest.fn(),
}))
const task: Task = { id: 'task', title: 'Revisar fonograma', description: '', status: 'todo', priority: 'medium', sector: 'Análise de fonogramas', assignees: [], createdBy: 'user', createdAt: new Date(), updatedAt: new Date() }

it('opens the card by click and keyboard without intercepting delete', () => {
  const open = jest.fn(), remove = jest.fn()
  render(<PremiumTaskCard task={task} onClick={open} onDelete={remove} />)
  fireEvent.click(screen.getByText(task.title))
  expect(open).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(screen.getByRole('button', { name: `Abrir tarefa: ${task.title}` }), { key: 'Enter' })
  expect(open).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByTitle('Excluir tarefa'))
  expect(remove).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledTimes(2)
})

it('places task creation before cards and keeps the selected column', () => {
  const add = jest.fn()
  render(<PremiumKanbanBoard columns={[{ id: 'todo', title: 'A Fazer', color: '#fff', tasks: [task] }]} onAddTask={add} onTaskMove={jest.fn()} onTaskClick={jest.fn()} onDeleteTask={jest.fn()} />)
  const button = screen.getByRole('button', { name: 'Adicionar tarefa' })
  expect(button.compareDocumentPosition(screen.getByText(task.title)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(button)
  expect(add).toHaveBeenCalledWith('todo')
})
