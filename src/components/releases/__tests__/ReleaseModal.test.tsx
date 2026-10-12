import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReleaseModal } from '../ReleaseModal'
import type { Release } from '@/types/releases'
import { toast } from 'sonner'

jest.mock('@/components/drive/DrivePickerModal', () => ({ DrivePickerModal: () => null }))
jest.mock('@/components/ui/premium-date-picker', () => ({ PremiumDatePicker: ({ onDateChange }: { onDateChange: (date: undefined) => void }) => <button onClick={() => onDateChange(undefined)}>Remover data</button> }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const release: Release = { id: 'release', title: 'Single', artist: 'Artista', artists: [{ name: 'Artista', role: 'main' }], releaseType: 'single', genre: 'Pop', releaseDate: new Date('2030-10-20T15:00:00Z'), status: 'scheduled', coverUrl: 'https://assets.test/cover.png', wavUrl: 'https://assets.test/audio.wav', composers: [{ name: 'Compositor' }], tracks: [], platformLinks: [], notes: 'Observação antiga', createdBy: 'owner', createdAt: new Date(), updatedAt: new Date(), position: 0 }

it('serializes removed optional fields and empty lists when editing', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined), onClose = jest.fn()
  render(<ReleaseModal open release={release} onSave={onSave} onClose={onClose} />)
  for (const value of ['Pop', release.coverUrl!, release.wavUrl!, 'Compositor', 'Observação antiga']) await userEvent.clear(screen.getByDisplayValue(value))
  await userEvent.click(screen.getByRole('button', { name: 'Remover data' }))
  await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(JSON.parse(JSON.stringify(onSave.mock.calls[0][0]))).toMatchObject({ genre: null, releaseDate: null, coverUrl: null, wavUrl: null, notes: null, composers: [], tracks: [], platformLinks: [] })
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('keeps an edited draft open after saving fails', async () => {
  const onSave = jest.fn().mockRejectedValue(new Error('Erro')), onClose = jest.fn()
  render(<ReleaseModal open release={release} onSave={onSave} onClose={onClose} />)
  const title = screen.getByDisplayValue('Single')
  await userEvent.clear(title); await userEvent.type(title, 'Rascunho')
  await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(title).toHaveValue('Rascunho')
  expect(onClose).not.toHaveBeenCalled()
})

it('preserves saved files when their temporary previews cannot be loaded', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  const fileReferences = { cover: 'storage://release-assets/cover.png', wav: 'storage://release-assets/audio.wav' }
  render(<ReleaseModal open release={{ ...release, coverUrl: undefined, wavUrl: undefined, fileReferences }} onSave={onSave} onClose={jest.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: fileReferences.cover, wavUrl: fileReferences.wav })))
})

it('allows explicit removal of a saved file whose preview is unavailable', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  render(<ReleaseModal open release={{ ...release, coverUrl: undefined, fileReferences: { cover: 'storage://release-assets/cover.png' } }} onSave={onSave} onClose={jest.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Remover capa' }))
  await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: null })))
})

it('requires a main artist instead of treating a featured artist as the main credit', async () => {
  const onSave = jest.fn(), onClose = jest.fn()
  render(<ReleaseModal open release={{ ...release, artists: [{ name: 'Convidado', role: 'feat' }] }} onSave={onSave} onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(onSave).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith('Adicione pelo menos um artista principal.')
  expect(onClose).not.toHaveBeenCalled()
})
