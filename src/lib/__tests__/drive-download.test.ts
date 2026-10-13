import { downloadDriveFile } from '../drive-download'
import type { DriveItem } from '@/types/drive'

const file = { id: 'file-id', name: 'relatório.pdf' } as DriveItem
const originalFetch = global.fetch
beforeEach(() => {
  URL.createObjectURL = jest.fn(() => 'blob:download')
  URL.revokeObjectURL = jest.fn()
})
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks() })

it('does not download an error response when the file permission was revoked', async () => {
  const blob = jest.fn()
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, blob })
  await expect(downloadDriveFile(file)).rejects.toThrow('acesso revogado')
  expect(blob).not.toHaveBeenCalled()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})

it('awaits the bytes before clicking the download and releases its temporary URL', async () => {
  let complete!: (blob: Blob) => void
  const bytes = new Promise<Blob>(done => { complete = done })
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: () => bytes })
  const result = downloadDriveFile(file)
  await Promise.resolve()
  expect(click).not.toHaveBeenCalled()
  complete(new Blob(['PDF']))
  await result
  expect(click).toHaveBeenCalledTimes(1)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download')
  expect(document.querySelector('a[download]')).toBeNull()
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/drive/files/file-id/content?'), { cache: 'no-store', credentials: 'same-origin' })
})
