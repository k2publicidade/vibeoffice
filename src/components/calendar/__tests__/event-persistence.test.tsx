import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateEventModal } from '../CreateEventModal'
import { EventDetailsModal } from '../EventDetailsModal'
import type { CalendarEvent } from '@/types/calendar'

jest.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [] }) }))
jest.mock('@/hooks/useTickets', () => ({ useTickets: () => ({ tickets: [] }) }))
jest.mock('@/components/ui/premium-modal', () => ({
  PremiumModal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  PremiumModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PremiumModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  PremiumModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  PremiumModalBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PremiumModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const date = new Date(2026, 9, 10)
const event: CalendarEvent = {
  id: 'event-1', title: 'Evento original', description: '', type: 'personal',
  startTime: new Date(2026, 9, 10, 9), endTime: new Date(2026, 9, 10, 10),
  createdBy: 'audit', attendees: [], createdAt: date, updatedAt: date,
}
function pendingSave() {
  let reject!: (error: Error) => void
  const callback = jest.fn(() => new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise }))
  return { callback, reject: (error: Error) => reject(error) }
}

it('waits for creation and retains the draft if persistence fails', async () => {
  const save = pendingSave(), close = jest.fn()
  render(<CreateEventModal open selectedDate={date} onSave={save.callback} onClose={close} />)
  fireEvent.change(screen.getByLabelText('Título do evento'), { target: { value: 'Rascunho' } })
  fireEvent.click(screen.getByRole('button', { name: 'Criar evento' }))
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled()
  await act(async () => save.reject(new Error('Falha de conexão')))
  expect(screen.getByLabelText('Título do evento')).toHaveValue('Rascunho')
  expect(screen.getByRole('alert')).toHaveTextContent('Falha de conexão')
  expect(close).not.toHaveBeenCalled()
})

it('waits for editing and retains the edited values on failure', async () => {
  const save = pendingSave(), close = jest.fn()
  render(<EventDetailsModal open event={event} onUpdate={save.callback} onDelete={jest.fn()} onClose={close} />)
  fireEvent.click(screen.getByTitle('Editar evento'))
  fireEvent.change(screen.getByDisplayValue('Evento original'), { target: { value: 'Rascunho editado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }))
  expect(screen.getByDisplayValue('Rascunho editado')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled()
  await act(async () => save.reject(new Error('Sem permissão')))
  expect(screen.getByDisplayValue('Rascunho editado')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão')
  expect(close).not.toHaveBeenCalled()
})

it('explicitly removes old links when the user selects Nenhum', async () => {
  const update = jest.fn()
  render(<EventDetailsModal open event={{ ...event, linkedTaskId: 'task-1' }} onUpdate={update} onDelete={jest.fn()} onClose={jest.fn()} />)
  fireEvent.click(screen.getByTitle('Editar evento'))
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Nenhum' }), { button: 0, ctrlKey: false })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }))
  await waitFor(() => expect(update).toHaveBeenCalledWith('event-1', expect.objectContaining({ linkedTaskId: '', linkedTicketId: '' })))
})

it('keeps details open when deletion is canceled', async () => {
  const close = jest.fn()
  render(<EventDetailsModal open event={event} onUpdate={jest.fn()} onDelete={jest.fn().mockResolvedValue(false)} onClose={close} />)
  fireEvent.click(screen.getByTitle('Excluir evento'))
  await act(async () => {})
  expect(close).not.toHaveBeenCalled()
})

it('keeps details open if duplication fails', async () => {
  const duplicate = pendingSave(), close = jest.fn()
  render(<EventDetailsModal open event={event} onUpdate={jest.fn()} onDelete={jest.fn()} onDuplicate={duplicate.callback} onClose={close} />)
  fireEvent.click(screen.getByTitle('Duplicar evento'))
  expect(close).not.toHaveBeenCalled()
  await act(async () => duplicate.reject(new Error('Duplicação recusada')))
  expect(screen.getByRole('alert')).toHaveTextContent('Duplicação recusada')
  expect(close).not.toHaveBeenCalled()
})

it('prepares a valid creation time for the final hour of the day', async () => {
  const save = jest.fn()
  render(<CreateEventModal open selectedDate={date} selectedHour={23} onSave={save} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Título do evento'), { target: { value: 'Último horário' } })
  fireEvent.click(screen.getByRole('button', { name: 'Criar evento' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ startTime: '23:00', endTime: '23:30' })))
})

it('allows editing the sector of a sector event', () => {
  render(<EventDetailsModal open event={{ ...event, type: 'sector', sector: 'Marketing' }} onUpdate={jest.fn()} onDelete={jest.fn()} onClose={jest.fn()} />)
  fireEvent.click(screen.getByTitle('Editar evento'))
  expect(screen.getByRole('combobox', { name: 'Setor' })).toHaveTextContent('Marketing')
})
