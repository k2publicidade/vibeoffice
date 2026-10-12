import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CourseEditorPage from '@/app/(dashboard)/courses/manage/[id]/page'
import { useAuth } from '@/hooks/useAuth'
import { useCourses } from '@/hooks/useCourses'
import { uploadFile, resolveStorageUrl } from '@/lib/supabase/storage'
import { toast } from 'sonner'

jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useCourses')
jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'course' }), useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }) }))
jest.mock('@/lib/supabase/storage', () => ({ uploadFile: jest.fn(), resolveStorageUrl: jest.fn() }))
jest.mock('@/components/courses/ModuleList', () => ({ ModuleList: () => null }))
jest.mock('@/components/courses/LessonEditorModal', () => ({ LessonEditorModal: () => null }))
jest.mock('@/components/courses/CreateModuleModal', () => ({ CreateModuleModal: () => null }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

it('uploads an edited cover into course assets and previews its signed URL', async () => {
  const course = { id: 'course', title: 'Curso', description: '', tags: [], difficulty: 'beginner', modules: [] }
  ;(useAuth as jest.Mock).mockReturnValue({ user: { id: 'admin', role: 'Admin' }, isLoading: false })
  ;(useCourses as jest.Mock).mockReturnValue({ getCourseById: () => course })
  ;(uploadFile as jest.Mock).mockResolvedValue({ url: 'storage://course-assets/cover.png' })
  ;(resolveStorageUrl as jest.Mock).mockResolvedValue('https://example.test/signed-cover.png')
  const { container } = render(<CourseEditorPage />)
  await userEvent.click(screen.getByRole('tab', { name: 'Informações' }))
  const input = container.querySelector('input[type="file"]')!
  fireEvent.change(input, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } })
  await waitFor(() => expect(uploadFile).toHaveBeenCalled())
  expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'course-assets' }))
  await waitFor(() => expect(screen.getByRole('img', { name: 'Capa do curso' })).toHaveAttribute('src', 'https://example.test/signed-cover.png'))
})

it('keeps a blank title draft in the editor and reports validation before saving', async () => {
  jest.clearAllMocks()
  const course = { id: 'course', title: 'Curso', description: '', tags: [], difficulty: 'beginner', modules: [] }
  const updateCourse = jest.fn().mockResolvedValue(undefined)
  ;(useAuth as jest.Mock).mockReturnValue({ user: { id: 'admin', role: 'Admin' }, isLoading: false })
  ;(useCourses as jest.Mock).mockReturnValue({ getCourseById: () => course, updateCourse })
  render(<CourseEditorPage />)
  await userEvent.click(screen.getByRole('tab', { name: 'Informações' }))
  const title = screen.getByDisplayValue('Curso')
  await userEvent.clear(title)
  await userEvent.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(updateCourse).not.toHaveBeenCalled()
  expect(title).toHaveValue('')
  expect(toast.error).toHaveBeenCalledWith('Informe um título para o curso.')
  expect(toast.success).not.toHaveBeenCalled()
})
