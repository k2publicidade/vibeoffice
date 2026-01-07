export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_comment_added'
  | 'task_due_soon'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_comment_added'
  | 'message_received'
  | 'mentioned_in_chat'
  | 'announcement'

export type NotificationPriority = 'low' | 'medium' | 'high'

export type EntityType = 'task' | 'ticket' | 'message' | null

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  entity_type: EntityType
  entity_id: string | null
  metadata: Record<string, any>
  read: boolean
  read_at: string | null
  archived: boolean
  created_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  notification_type: NotificationType
  enable_in_app: boolean
  enable_push: boolean
  enable_email: boolean
  created_at: string
  updated_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  last_used_at: string
}

export interface NotificationEvent {
  type: NotificationType
  recipientIds: string[]
  priority: NotificationPriority
  entityType: EntityType
  entityId: string | null
  metadata: Record<string, any>
}
