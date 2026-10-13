export async function withRequestDeadline<T>(work: (signal: AbortSignal) => PromiseLike<T>, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: (() => void) | undefined
  try {
    const stopped = new Promise<never>((_resolve, reject) => {
      abort = () => { controller.abort(); reject(new Error('Request cancelled')) }
      if (options.signal?.aborted) abort()
      else options.signal?.addEventListener('abort', abort, { once: true })
      timer = setTimeout(() => { controller.abort(); reject(new Error('Request timed out')) }, options.timeoutMs ?? 15000)
    })
    return await Promise.race([controller.signal.aborted ? stopped : Promise.resolve(work(controller.signal)), stopped])
  } finally {
    if (timer) clearTimeout(timer)
    if (abort) options.signal?.removeEventListener('abort', abort)
  }
}
