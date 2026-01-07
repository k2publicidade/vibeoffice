'use client'

import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ReadStatus = 'sent' | 'delivered' | 'read'

interface ReadReceiptProps {
  status: ReadStatus
  className?: string
}

export function ReadReceipt({ status, className }: ReadReceiptProps) {
  if (status === 'sent') {
    return (
      <Check
        className={cn('h-3 w-3 text-gray-500', className)}
        strokeWidth={2.5}
      />
    )
  }

  if (status === 'delivered') {
    return (
      <CheckCheck
        className={cn('h-3 w-3 text-gray-500', className)}
        strokeWidth={2.5}
      />
    )
  }

  // status === 'read'
  return (
    <CheckCheck
      className={cn('h-3 w-3 text-[#4a9eff]', className)}
      strokeWidth={2.5}
    />
  )
}

/**
 * Calculate read status for a message
 * @param readBy - Object with userId -> timestamp mappings
 * @param senderId - ID of the message sender
 * @param roomParticipants - Array of participant IDs in the room
 * @returns ReadStatus ('sent', 'delivered', or 'read')
 */
export function calculateReadStatus(
  readBy: Record<string, string> | undefined,
  senderId: string,
  roomParticipants: string[]
): ReadStatus {
  if (!readBy || Object.keys(readBy).length === 0) {
    return 'sent'
  }

  // Get readers excluding sender
  const readers = Object.keys(readBy).filter((userId) => userId !== senderId)

  if (readers.length === 0) {
    return 'sent'
  }

  // If at least one other user read it, mark as read
  // In the future, could check if ALL participants read it
  return 'read'
}
