import { render, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useUsers } from '../useUsers'
import { useTasks } from '../useTasks'

/**
 * Regressão de performance: uma tela com muitos cards (cada um chamando
 * useAuth/useUsers/useTasks) deve fazer UMA busca por recurso, não uma por card.
 */
const CARDS = 30
const profile = {
  id: 'user-1', email: 'a@vibedistro.com', name: 'Ana', avatar: null, sector: 'Marketing', role: 'Admin',
  active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

function chain(result: unknown) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {}
  for (const method of ['select', 'eq', 'order', 'limit']) query[method] = jest.fn(() => query)
  query.single = jest.fn(() => Promise.resolve({ data: profile, error: null }))
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return query
}

function Card() {
  useAuth()
  const { users } = useUsers()
  const { tasks } = useTasks()
  return <div data-testid="card">{users?.length ?? 0}/{tasks.length}</div>
}

function Board() {
  return <>{Array.from({ length: CARDS }, (_, index) => <Card key={index} />)}</>
}

it(`a board with ${CARDS} cards fetches each resource once`, async () => {
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })
  ;(supabase.from as jest.Mock).mockImplementation((table: string) =>
    chain({ data: table === 'users' ? [profile] : [], error: null }))

  const { getAllByTestId, unmount } = render(<Board />)
  await waitFor(() => expect(getAllByTestId('card')[0]).toHaveTextContent('1/0'))

  const tables = (supabase.from as jest.Mock).mock.calls.map(([table]) => table)
  const count = (table: string) => tables.filter((name) => name === table).length
  // eslint-disable-next-line no-console
  console.log(`[perf] ${CARDS} cards → getSession=${(supabase.auth.getSession as jest.Mock).mock.calls.length} users=${count('users')} tasks=${count('tasks')} channels=${(supabase.channel as jest.Mock).mock.calls.length}`)

  expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
  expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  expect(count('users')).toBe(2) // 1 perfil (useAuth) + 1 diretório (useUsers)
  expect(count('tasks')).toBe(1)
  expect(supabase.channel).toHaveBeenCalledTimes(2) // diretório + tarefas

  unmount()
  // O último card desmontado encerra os canais compartilhados
  expect(supabase.removeChannel).toHaveBeenCalledTimes(2)
})
