'use client'
import { useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markChatReadBatch } from '@/lib/chat-read-receipts'

type Observed = { observer?: IntersectionObserver; activate: () => void; messageId: string; senderId: string; visible: boolean }
export function useReadReceipts(userId: string | undefined, roomId: string | undefined) {
  const client = useMemo(() => createClient(), [])
  const scope = useMemo(() => ({ userId, roomId, active: true, pending: new Set<string>(), confirmed: new Set<string>(), flight: new Set<string>(), observers: new Map<HTMLElement, Observed>(), timer: undefined as ReturnType<typeof setTimeout> | undefined, retry: 0, inFlight: false, controller: new AbortController() }), [userId, roomId])
  const schedule = useCallback((delay = 1000) => {
    if (!scope.active || scope.timer || scope.inFlight || !scope.pending.size) return
    scope.timer = setTimeout(() => { scope.timer = undefined; void flush() }, delay)
    async function flush() {
      if (!scope.active || !scope.userId || !scope.roomId || scope.inFlight || !scope.pending.size) return
      const ids = [...scope.pending].slice(0, 200)
      ids.forEach(id => { scope.pending.delete(id); scope.flight.add(id) })
      scope.inFlight = true
      try {
        const result = await markChatReadBatch(client, scope.userId, ids, { signal: scope.controller.signal })
        if (result !== 'session-changed') { result.messageIds.forEach(id => scope.confirmed.add(id)); scope.retry = 0 }
      } catch {
        if (scope.active) { ids.forEach(id => scope.pending.add(id)); scope.retry += 1 }
      } finally {
        ids.forEach(id => scope.flight.delete(id)); scope.inFlight = false
        if (scope.active && scope.pending.size) schedule(scope.retry ? Math.min(1000 * 2 ** Math.min(scope.retry - 1, 4), 15000) : 0)
      }
    }
  }, [scope, client])
  const markAsRead = useCallback((messageId: string, senderId: string) => {
    if (!scope.active || !scope.userId || !scope.roomId || !messageId || senderId === scope.userId || scope.confirmed.has(messageId) || scope.flight.has(messageId)) return
    scope.pending.add(messageId); schedule()
  }, [scope, schedule])
  const observeMessage = useCallback((element: HTMLElement | null, messageId: string, senderId: string) => {
    if (!element || !scope.userId || !scope.roomId || senderId === scope.userId) return
    scope.observers.get(element)?.observer?.disconnect()
    const record: Observed = { messageId, senderId, visible: false, activate: () => {
      if (!scope.active || record.observer) return
      const observer = new IntersectionObserver(entries => {
        if (scope.observers.get(element) !== record || !scope.active) return
        for (const entry of entries) {
          record.visible = entry.isIntersecting && entry.intersectionRatio >= 0.5
          if (record.visible && document.visibilityState === 'visible') markAsRead(messageId, senderId)
        }
      }, { threshold: 0.5, rootMargin: '0px' })
      record.observer = observer; observer.observe(element)
    } }
    scope.observers.set(element, record); record.activate()
    return () => { record.observer?.disconnect(); if (scope.observers.get(element) === record) scope.observers.delete(element) }
  }, [scope, markAsRead])
  useEffect(() => {
    scope.active = true
    if (scope.controller.signal.aborted) scope.controller = new AbortController()
    scope.observers.forEach(record => record.activate())
    const visible = () => { if (document.visibilityState === 'visible') scope.observers.forEach(record => { if (record.visible) markAsRead(record.messageId, record.senderId) }) }
    document.addEventListener('visibilitychange', visible)
    return () => {
      scope.active = false; document.removeEventListener('visibilitychange', visible)
      if (scope.timer) clearTimeout(scope.timer)
      scope.timer = undefined
      scope.controller.abort(); scope.observers.forEach(record => record.observer?.disconnect()); scope.observers.clear()
      const remaining = [...new Set([...scope.pending, ...scope.flight])]; scope.pending.clear()
      // Best effort for messages already seen. The helper verifies/binds the old
      // actor, so navigation/logout cannot attribute this batch to a new account.
      if (scope.userId && scope.roomId && remaining.length) void (async () => {
        for (let i = 0; i < remaining.length; i += 200) {
          try { if (await markChatReadBatch(client, scope.userId!, remaining.slice(i, i + 200), { keepalive: true }) === 'session-changed') break } catch { break }
        }
      })()
    }
  }, [scope, client, markAsRead])
  return { observeMessage, markAsRead }
}
