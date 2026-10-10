'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'

/** Select only records already returned by the authorized data hook. */
export function useRecordLink<T extends { id: string }>(key: string, records: T[], ready: boolean, onSelect: (record: T) => void) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const requestedId = params.get(key)
  const handledId = useRef<string | null>(null)
  const clearLink = useCallback(() => {
    if (!params.has(key)) return
    const remaining = new URLSearchParams(params.toString())
    remaining.delete(key)
    const query = remaining.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [params, key, pathname, router])

  useEffect(() => {
    if (!requestedId) { handledId.current = null; return }
    if (!ready || handledId.current === requestedId) return
    handledId.current = requestedId
    const record = z.uuid().safeParse(requestedId).success ? records.find(item => item.id === requestedId) : undefined
    if (record) onSelect(record)
    else { toast.error('Registro não encontrado ou sem acesso'); clearLink() }
  }, [requestedId, ready, records, onSelect, clearLink])

  return { requestedId, clearLink }
}
