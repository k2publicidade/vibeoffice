import { NotificationType } from '@/types/notifications'

export type NotificationCategory = 'tasks' | 'tickets' | 'chat' | 'general'

export interface NotificationMetadata {
  type: NotificationType
  category: NotificationCategory
  label: string
  description: string
  icon: string
  channels: {
    inApp: { enabled: boolean; locked: boolean }
    push: { enabled: boolean; locked: boolean }
    email: { enabled: boolean; locked: boolean }
  }
}

export const NOTIFICATION_METADATA: Record<NotificationType, NotificationMetadata> = {
  // Tasks
  task_assigned: {
    type: 'task_assigned',
    category: 'tasks',
    label: 'Nova task atribuída',
    description: 'Quando você é atribuído a uma nova task',
    icon: '📋',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },
  task_status_changed: {
    type: 'task_status_changed',
    category: 'tasks',
    label: 'Status alterado',
    description: 'Quando o status de uma task muda',
    icon: '📋',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },
  task_comment_added: {
    type: 'task_comment_added',
    category: 'tasks',
    label: 'Novo comentário',
    description: 'Quando alguém comenta em uma task',
    icon: '📋',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },
  task_due_soon: {
    type: 'task_due_soon',
    category: 'tasks',
    label: 'Prazo próximo',
    description: 'Lembrete de tasks com prazo próximo (24h antes)',
    icon: '📋',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: true, locked: false },
      email: { enabled: false, locked: false },
    },
  },

  // Tickets
  ticket_created: {
    type: 'ticket_created',
    category: 'tickets',
    label: 'Novo ticket criado',
    description: 'Quando um novo ticket é criado',
    icon: '🎫',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },
  ticket_assigned: {
    type: 'ticket_assigned',
    category: 'tickets',
    label: 'Ticket atribuído',
    description: 'Quando você é atribuído a um ticket',
    icon: '🎫',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },
  ticket_status_changed: {
    type: 'ticket_status_changed',
    category: 'tickets',
    label: 'Status alterado',
    description: 'Quando o status de um ticket muda',
    icon: '🎫',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },
  ticket_comment_added: {
    type: 'ticket_comment_added',
    category: 'tickets',
    label: 'Novo comentário',
    description: 'Quando alguém comenta em um ticket',
    icon: '🎫',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: false },
    },
  },

  // Chat (CRITICAL: email locked = true)
  message_received: {
    type: 'message_received',
    category: 'chat',
    label: 'Mensagem recebida',
    description: 'Quando você recebe uma mensagem direta',
    icon: '💬',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: false, locked: false },
      email: { enabled: false, locked: true }, // LOCKED
    },
  },
  mentioned_in_chat: {
    type: 'mentioned_in_chat',
    category: 'chat',
    label: 'Menção no chat',
    description: 'Quando alguém menciona você (@usuario)',
    icon: '💬',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: true, locked: false },
      email: { enabled: false, locked: true }, // LOCKED
    },
  },

  // General
  announcement: {
    type: 'announcement',
    category: 'general',
    label: 'Anúncios',
    description: 'Mensagens importantes da empresa',
    icon: '📢',
    channels: {
      inApp: { enabled: true, locked: false },
      push: { enabled: true, locked: false },
      email: { enabled: true, locked: false },
    },
  },
}

export const CATEGORY_LABELS: Record<NotificationCategory, { label: string; icon: string }> = {
  tasks: { label: 'Tasks', icon: '📋' },
  tickets: { label: 'Tickets', icon: '🎫' },
  chat: { label: 'Chat', icon: '💬' },
  general: { label: 'Geral', icon: '📢' },
}

export const CHANNEL_LABELS = {
  inApp: {
    label: 'In-App',
    icon: '📱',
    tooltip: 'Notificações dentro da plataforma (sino no topo)',
  },
  push: {
    label: 'Push',
    icon: '🔔',
    tooltip: 'Notificações do navegador (mesmo fora da aba)',
  },
  email: {
    label: 'Email',
    icon: '📧',
    tooltip: 'Notificações enviadas para seu email',
  },
}

export function getMetadataByCategory(category: NotificationCategory): NotificationMetadata[] {
  return Object.values(NOTIFICATION_METADATA).filter((m) => m.category === category)
}
