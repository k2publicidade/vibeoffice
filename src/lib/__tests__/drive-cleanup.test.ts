import { createClient } from '@/lib/supabase/client'
import { processDriveCleanup } from '../drive-cleanup'

const admin = createClient()
const jobs = [{ id: 'job', storage_path: 'private/file.txt', claim_token: 'claim' }]
function fixture() {
  const remove = jest.fn().mockResolvedValue({ data: [], error: null })
  ;(admin.storage.from as jest.Mock).mockReturnValue({ remove })
  ;(admin.rpc as jest.Mock).mockImplementation(async (name: string) => name === 'finish_drive_cleanup' ? { data: 1, error: null } : { data: [], error: null })
  ;(admin.rpc as jest.Mock).mockResolvedValueOnce({ data: jobs, error: null })
  const query = { select: jest.fn().mockReturnThis(), is: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), then: (done: (value: unknown) => unknown) => Promise.resolve({ count: 0, error: null }).then(done) }
  ;(admin.from as jest.Mock).mockReturnValue(query)
  return { remove, query }
}
beforeEach(() => jest.clearAllMocks())

it('removes only the claimed paths and confirms their exact claim tokens', async () => {
  const { remove } = fixture()
  await expect(processDriveCleanup(admin, 'deletion')).resolves.toEqual({ processed: 1, pending: false })
  expect(admin.rpc).toHaveBeenCalledWith('claim_drive_cleanup', { deletion_id: 'deletion' })
  expect(remove).toHaveBeenCalledWith(['private/file.txt'])
  expect(admin.rpc).toHaveBeenCalledWith('finish_drive_cleanup', { claims: [{ id: 'job', claim_token: 'claim' }], succeeded: true })
})

it.each(['provider', 'network'])('leaves cleanup durable after a %s failure', async failure => {
  const { remove } = fixture()
  if (failure === 'provider') remove.mockResolvedValueOnce({ data: null, error: new Error('Storage unavailable') })
  else remove.mockRejectedValueOnce(new Error('Network unavailable'))
  await expect(processDriveCleanup(admin)).resolves.toEqual({ processed: 0, pending: true })
  expect(admin.rpc).toHaveBeenCalledWith('finish_drive_cleanup', { claims: [{ id: 'job', claim_token: 'claim' }], succeeded: false })
})

it('never removes files if claiming the jobs fails', async () => {
  const { remove } = fixture()
  ;(admin.rpc as jest.Mock).mockReset().mockResolvedValueOnce({ data: null, error: new Error('Database unavailable') })
  await expect(processDriveCleanup(admin)).rejects.toThrow('Could not claim')
  expect(remove).not.toHaveBeenCalled()
})

it('does not report completion when confirmation of the claims fails', async () => {
  fixture()
  ;(admin.rpc as jest.Mock).mockReset().mockResolvedValueOnce({ data: jobs, error: null }).mockResolvedValueOnce({ data: 0, error: null })
  await expect(processDriveCleanup(admin)).rejects.toThrow('Could not confirm')
})

it('skips Storage when no jobs are available', async () => {
  const { remove } = fixture()
  ;(admin.rpc as jest.Mock).mockReset().mockResolvedValue({ data: [], error: null })
  await expect(processDriveCleanup(admin)).resolves.toEqual({ processed: 0, pending: false })
  expect(remove).not.toHaveBeenCalled()
})

it('reports remaining jobs instead of claiming that a bounded batch removed everything', async () => {
  const { query } = fixture()
  query.then = done => Promise.resolve({ count: 100, error: null }).then(done)
  await expect(processDriveCleanup(admin)).resolves.toEqual({ processed: 1, pending: true })
})

it('reports a failed queue status lookup', async () => {
  const { query } = fixture()
  query.then = done => Promise.resolve({ count: null, error: new Error('Status unavailable') }).then(done)
  await expect(processDriveCleanup(admin)).rejects.toThrow('Could not check')
})
