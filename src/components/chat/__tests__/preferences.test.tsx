import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatRoomPremium } from '../ChatRoomPremium'
import { ChatListPremium } from '../ChatListPremium'
import { useRoomPreferences } from '@/hooks/useRoomPreferences'
import { useArchiveChat } from '@/hooks/useArchiveChat'
import { toast } from 'sonner'
import type { ChatRoom } from '@/types/chat'

jest.mock('@/hooks/useRoomPreferences')
jest.mock('@/hooks/useArchiveChat')
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a', name: 'Owner' } }) }))
jest.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users: [] }) }))
jest.mock('../MessageListPremium', () => ({ MessageListPremium: () => <div>Mensagens</div> }))
jest.mock('../MessageInputPremium', () => ({ MessageInputPremium: ({ disabled }: { disabled: boolean }) => <button disabled={disabled}>Enviar mensagem</button> }))
jest.mock('../ChatPeopleDialog', () => ({ ChatPeopleDialog: () => null }))
jest.mock('../ChatCallDialog', () => ({ ChatCallDialog: () => null }))
jest.mock('../MessageSearchDialog', () => ({ MessageSearchDialog: () => null }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const room = (id = 'room-a'): ChatRoom => ({ id, name: id, type: 'project', participants: ['user-a'], createdAt: new Date(), updatedAt: new Date() })
let preferences: any, archives: any
beforeEach(() => {
  jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {})
  preferences = { muted: false, blocked: false, loading: false, saving: false, error: null, refresh: jest.fn(), update: jest.fn().mockResolvedValue(undefined) }
  archives = { ready: true, isLoading: false, saving: false, error: null, refresh: jest.fn(), isRoomArchived: jest.fn(() => false), archivedRoomIds: new Set(), toggleArchive: jest.fn().mockResolvedValue(undefined) }
  ;(useRoomPreferences as jest.Mock).mockImplementation(() => preferences)
  ;(useArchiveChat as jest.Mock).mockImplementation(() => archives)
})
afterEach(() => jest.restoreAllMocks())

it('blocks sending and offers retry when blocking preferences could not be loaded', async () => {
  preferences.error = 'Não foi possível carregar as preferências.'
  render(<ChatRoomPremium room={room()} messages={[]} onSendMessage={jest.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent(preferences.error)
  expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Convidar para chamada de vídeo' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(preferences.refresh).toHaveBeenCalledTimes(1)
})

it('does not close the newly selected conversation after an old archive request finishes', async () => {
  let finish!: () => void
  const pending = new Promise<void>(done => { finish = done }); archives.toggleArchive.mockReturnValue(pending)
  const back = jest.fn()
  const { rerender } = render(<ChatRoomPremium room={room()} messages={[]} onSendMessage={jest.fn()} onBack={back} />)
  await userEvent.click(screen.getByRole('button', { name: 'Menu da conversa' }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Arquivar', exact: true }))
  rerender(<ChatRoomPremium room={room('room-b')} messages={[]} onSendMessage={jest.fn()} onBack={back} />)
  await act(async () => { finish(); await pending })
  expect(back).not.toHaveBeenCalled()
  expect(toast.success).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'room-b' })).toBeInTheDocument()
})

it('shows the archive loading failure instead of presenting unknown preferences as unarchived', async () => {
  archives.ready = false; archives.error = 'Não foi possível carregar as preferências.'
  render(<ChatListPremium rooms={[room()]} selectedRoom={null} onSelectRoom={jest.fn()} createProjectGroup={jest.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent(archives.error)
  expect(screen.queryByText('room-a')).not.toBeInTheDocument()
  expect(screen.queryByText('Nenhum grupo de projeto')).not.toBeInTheDocument()
  expect(screen.queryByText('Nenhuma conversa direta')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(archives.refresh).toHaveBeenCalledTimes(1)
})
