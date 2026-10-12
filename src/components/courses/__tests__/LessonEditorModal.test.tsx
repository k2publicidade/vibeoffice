import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonEditorModal } from '../LessonEditorModal'
import type { Lesson } from '@/types/courses'
import { toast } from 'sonner'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
// Match isomorphic-dompurify's browser adapter in this jsdom test environment.
jest.mock('isomorphic-dompurify', () => jest.requireActual('dompurify'))

const original: Lesson = { id: 'lesson', course_id: 'course', module_id: 'module', title: 'Aula', type: 'video', chapter: 'Capítulo antigo', content_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', content: '<p>Conteúdo</p>', materials: [], order: 0 }

describe('LessonEditorModal persistence', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends an explicit removal when the editor clears video and chapter', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined), onClose = jest.fn()
    render(<LessonEditorModal open lesson={original} onSave={onSave} onClose={onClose} />)
    await userEvent.clear(screen.getByPlaceholderText('https://youtube.com/watch?v=...'))
    await userEvent.clear(screen.getByPlaceholderText('Ex: Módulo 1: Introdução'))
    await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // Only values that survive JSON serialization reach a PostgREST PATCH.
    expect(JSON.parse(JSON.stringify(onSave.mock.calls[0][0]))).toMatchObject({ id: original.id, content_url: null, chapter: null, type: 'html' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('retains the edited values and stays open when saving fails', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Falha')), onClose = jest.fn()
    render(<LessonEditorModal open lesson={original} onSave={onSave} onClose={onClose} />)
    const title = screen.getByPlaceholderText('Ex: Como estruturar uma campanha de release')
    await userEvent.clear(title)
    await userEvent.type(title, 'Rascunho')
    await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(title).toHaveValue('Rascunho')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('preserves intentionally empty HTML when reopening an existing lesson', () => {
    const { container } = render(<LessonEditorModal open lesson={{ ...original, content: '' }} onSave={jest.fn()} onClose={jest.fn()} />)
    expect(container.querySelector('textarea')).toHaveValue('')
  })

  it('does not submit a blank lesson title', async () => {
    const onSave = jest.fn(), onClose = jest.fn()
    render(<LessonEditorModal open lesson={original} onSave={onSave} onClose={onClose} />)
    await userEvent.clear(screen.getByPlaceholderText('Ex: Como estruturar uma campanha de release'))
    await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('waits for confirmation and prevents a second save while the first is pending', async () => {
    let confirm!: () => void
    const onSave = jest.fn(() => new Promise<void>(resolve => { confirm = resolve })), onClose = jest.fn()
    render(<LessonEditorModal open lesson={original} onSave={onSave} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Salvando/ }))
    expect(onSave).toHaveBeenCalledTimes(1)
    confirm()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
