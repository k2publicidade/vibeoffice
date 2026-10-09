'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useReadReceipts(userId: string | undefined, roomId: string | undefined) {
  const supabase = createClient()
  const pendingReads = useRef<Set<string>>(new Set())
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  /**
   * Mark messages as read in batch
   */
  const flushPendingReads = useCallback(async () => {
    if (!userId || pendingReads.current.size === 0) return

    const messageIds = Array.from(pendingReads.current)
    pendingReads.current.clear()

    try {
      const { error } = await supabase.rpc('mark_messages_read' as never, { message_ids: messageIds } as never)
      if (error) throw error
    } catch (error) {
      messageIds.forEach(id => pendingReads.current.add(id))
      console.error('Error marking messages as read:', error)
    }
  }, [userId, supabase])

  /**
   * Mark a single message as read (debounced)
   */
  const markAsRead = useCallback(
    (messageId: string, senderId: string) => {
      // Don't mark own messages as read
      if (senderId === userId) return

      // Add to pending batch
      pendingReads.current.add(messageId)

      // Debounce: flush after 1 second of inactivity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        flushPendingReads()
      }, 1000)
    },
    [userId, flushPendingReads]
  )

  /**
   * Setup IntersectionObserver for auto-marking messages as read
   */
  const observeMessage = useCallback(
    (element: HTMLElement | null, messageId: string, senderId: string) => {
      if (!element || !userId) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Message is visible - mark as read
              markAsRead(messageId, senderId)
            }
          })
        },
        {
          threshold: 0.5, // 50% of message must be visible
          rootMargin: '0px',
        }
      )

      observer.observe(element)

      // Cleanup
      return () => {
        observer.disconnect()
      }
    },
    [userId, markAsRead]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      flushPendingReads()
    }
  }, [flushPendingReads])

  return {
    observeMessage,
    markAsRead,
  }
}
