import { renderToStaticMarkup } from 'react-dom/server'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NewRequestModal } from '../NewRequestModal'

jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{renderToStaticMarkup(<>{children}</>).replace(/<[^>]*>/g, '')}</option>,
}))
jest.mock('@/components/ui/premium-date-picker', () => ({
  PremiumDatePicker: ({ label, onDateChange }: { label: string; onDateChange: (date: Date) => void }) => <button onClick={() => onDateChange(new Date('2026-10-28T12:00:00'))}>{label}</button>,
}))
jest.mock('@/components/ui/premium-modal', () => ({
  PremiumModal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  ...Object.fromEntries(['PremiumModalHeader','PremiumModalTitle','PremiumModalDescription','PremiumModalBody','PremiumModalFooter'].map(name => [name, ({ children }: { children: React.ReactNode }) => <div>{children}</div>])),
}))

it('routes the selected request type to its department with the required reason', async () => {
  const save = jest.fn().mockResolvedValue(undefined), close = jest.fn()
  render(<NewRequestModal open onClose={close} onSave={save} />)
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Análise de fonogramas' } })
  expect(screen.queryByRole('option', { name: /Férias/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'phonogram-review' } })
  fireEvent.click(screen.getByText('Data início'))
  fireEvent.click(screen.getByText('Data fim'))
  expect(screen.getByRole('button', { name: 'Enviar solicitação' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(/Motivo da solicitação/), { target: { value: 'Conferir a qualidade do áudio recebido' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitação' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: 'phonogram-review', sector: 'Análise de fonogramas', description: 'Conferir a qualidade do áudio recebido' })))
  expect(close).toHaveBeenCalled()
})

it('requires a new request type when the destination changes', () => {
  render(<NewRequestModal open onClose={jest.fn()} onSave={jest.fn()} />)
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'vacation' } })
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Financeiro' } })
  fireEvent.click(screen.getByText('Data início'))
  fireEvent.click(screen.getByText('Data fim'))
  fireEvent.change(screen.getByLabelText(/Motivo da solicitação/), { target: { value: 'Motivo completo para análise' } })
  expect(screen.getByRole('button', { name: 'Enviar solicitação' })).toBeDisabled()
})
