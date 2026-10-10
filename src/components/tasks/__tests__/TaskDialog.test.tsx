import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { TaskDialog } from '../TaskDialog'
import type { Task } from '@/types/tasks'

jest.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users: [], isLoading: false }) }))
jest.mock('@/components/ui/premium-modal', () => ({
  PremiumModal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  PremiumModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PremiumModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  PremiumModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  PremiumModalBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PremiumModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
const first: Task = { id: 'first', title: 'Primeira', description: '', status: 'todo', priority: 'medium', sector: 'Administrativo', assignees: [], createdBy: 'audit', createdAt: new Date(), updatedAt: new Date() }

describe('task editor lifecycle and persistence', () => {
  it('opens when the parent opens a Kanban creation dialog', () => {
    const { rerender } = render(<TaskDialog hideTrigger isOpen={false} onSave={jest.fn()} />)
    expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument()
    rerender(<TaskDialog hideTrigger isOpen defaultStatus="in_progress" onSave={jest.fn()} />)
    expect(screen.getByLabelText(/Título/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Em Progresso')
  })

  it('edits the new record when another notification is selected', () => {
    const { rerender } = render(<TaskDialog hideTrigger isOpen task={first} onSave={jest.fn()} />)
    rerender(<TaskDialog hideTrigger isOpen task={{ ...first, id: 'second', title: 'Segunda' }} onSave={jest.fn()} />)
    expect(screen.getByLabelText(/Título/)).toHaveValue('Segunda')
  })

  it('does not add a deadline when editing a task without one', async () => {
    const save = jest.fn()
    render(<TaskDialog hideTrigger isOpen task={first} onSave={save} />)
    fireEvent.submit(screen.getByLabelText(/Título/).closest('form')!)
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ dueDate: undefined })))
  })

  it('waits for persistence and retains the draft on failure', async () => {
    let rejectSave!: (error: Error) => void
    const save = jest.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject }))
    const close = jest.fn()
    render(<TaskDialog hideTrigger isOpen task={first} onSave={save} onOpenChange={close} />)
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Rascunho' } })
    fireEvent.submit(screen.getByLabelText(/Título/).closest('form')!)
    expect(close).not.toHaveBeenCalled()
    await act(async () => rejectSave(new Error('Falha ao salvar')))
    expect(screen.getByLabelText(/Título/)).toHaveValue('Rascunho')
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar')
    expect(close).not.toHaveBeenCalled()
  })
})
