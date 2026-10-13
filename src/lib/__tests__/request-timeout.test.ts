/** @jest-environment node */
import { withRequestDeadline } from '../request-timeout'
afterEach(() => jest.useRealTimers())

it('settles a successful request and clears its deadline', async () => {
  jest.useFakeTimers()
  await expect(withRequestDeadline(async () => 'done')).resolves.toBe('done')
  expect(jest.getTimerCount()).toBe(0)
})

it('cancels work immediately when its parent signal is already aborted', async () => {
  const parent = new AbortController(); parent.abort()
  const work = jest.fn()
  await expect(withRequestDeadline(work, { signal: parent.signal })).rejects.toThrow('cancelled')
  expect(work).not.toHaveBeenCalled()
})

it('aborts an unresponsive request when its owner is disposed', async () => {
  jest.useFakeTimers()
  const parent = new AbortController(); let child!: AbortSignal
  const pending = withRequestDeadline(signal => { child = signal; return new Promise(() => {}) }, { signal: parent.signal })
  const rejected = expect(pending).rejects.toThrow('cancelled')
  parent.abort(); await rejected
  expect(child.aborted).toBe(true)
  expect(jest.getTimerCount()).toBe(0)
})
