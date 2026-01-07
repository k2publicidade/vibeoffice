import { createClient } from '@/lib/supabase/client'
import { NotificationEvent, NotificationType } from '@/types/notifications'

export class InAppHandler {
  private supabase = createClient()

  async send(userId: string, event: NotificationEvent): Promise<void> {
    // 1. Inserir notificação no banco
    const { data: notification, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: event.type,
        title: this.generateTitle(event),
        message: this.generateMessage(event),
        priority: event.priority,
        entity_type: event.entityType,
        entity_id: event.entityId,
        metadata: event.metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('[InAppHandler] Failed to insert notification:', error)
      throw error
    }

    // 2. Broadcast via Realtime
    const channel = this.supabase.channel(`user:${userId}:notifications`)
    await channel.send({
      type: 'broadcast',
      event: 'notification_created',
      payload: notification,
    })
  }

  private generateTitle(event: NotificationEvent): string {
    const titles: Record<NotificationType, string> = {
      task_assigned: 'Nova tarefa atribuída',
      task_status_changed: 'Status da tarefa alterado',
      task_comment_added: 'Novo comentário em tarefa',
      task_due_soon: 'Tarefa vence em breve',
      ticket_created: 'Novo ticket criado',
      ticket_assigned: 'Ticket atribuído a você',
      ticket_status_changed: 'Status do ticket alterado',
      ticket_comment_added: 'Novo comentário em ticket',
      message_received: 'Nova mensagem',
      mentioned_in_chat: 'Você foi mencionado',
      announcement: 'Novo anúncio',
    }
    return titles[event.type] || 'Nova notificação'
  }

  private generateMessage(event: NotificationEvent): string {
    const { metadata, type } = event

    switch (type) {
      case 'task_assigned':
        return `${metadata.assignedByName || 'Alguém'} atribuiu a tarefa "${metadata.taskTitle}" para você`
      case 'task_status_changed':
        return `A tarefa "${metadata.taskTitle}" mudou para ${metadata.newStatus}`
      case 'task_due_soon':
        return `A tarefa "${metadata.taskTitle}" vence em ${metadata.timeUntilDue}`
      case 'ticket_created':
        return `Novo ticket criado: "${metadata.ticketTitle}"`
      case 'ticket_assigned':
        return `Ticket "${metadata.ticketTitle}" foi atribuído a você`
      case 'message_received':
        return `${metadata.senderName}: ${metadata.messagePreview}`
      case 'mentioned_in_chat':
        return `${metadata.senderName} mencionou você em ${metadata.roomName}`
      default:
        return 'Você tem uma nova notificação'
    }
  }
}
