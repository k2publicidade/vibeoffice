import { z } from 'zod'

interface NotificationTarget {
  entity_type: string | null
  entity_id: string | null
  metadata?: unknown
}

export function getNotificationPath(target: NotificationTarget): string | null {
  if (target.entity_type === 'task' || target.entity_type === 'ticket') {
    if (!z.uuid().safeParse(target.entity_id).success) return null
    return `${target.entity_type === 'task' ? '/tasks' : '/tickets'}?open=${target.entity_id}`
  }
  if (target.entity_type === 'message' && target.metadata && typeof target.metadata === 'object' && !Array.isArray(target.metadata)) {
    const roomId = (target.metadata as Record<string, unknown>).roomId
    if (typeof roomId === 'string' && z.uuid().safeParse(roomId).success) return `/chat?room=${roomId}`
  }
  return null
}
