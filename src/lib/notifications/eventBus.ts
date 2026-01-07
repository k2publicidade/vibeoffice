import { NotificationEvent } from '@/types/notifications'
import { NotificationProcessor } from './processor'

/**
 * EventBus Singleton para notificações
 * Fire-and-forget pattern: nunca propaga erros
 */
class EventBusInstance {
  private processor = new NotificationProcessor()

  /**
   * Emite um evento de notificação
   * @param event - Evento a ser processado
   * @returns Promise<void> que nunca rejeita
   */
  async emit(event: NotificationEvent): Promise<void> {
    console.log('[EventBus] Event emitted:', event.type, 'for', event.recipientIds.length, 'recipient(s)')

    try {
      await this.processor.process(event)
      console.log('[EventBus] Event processed successfully')
    } catch (error) {
      // Fire-and-forget: nunca propaga erro
      console.error('[EventBus] Error processing event (swallowed):', error)
    }
  }
}

// Singleton global
export const EventBus = new EventBusInstance()

/**
 * Exemplo de uso:
 *
 * import { EventBus } from '@/lib/notifications/eventBus'
 *
 * await EventBus.emit({
 *   type: 'task_assigned',
 *   recipientIds: [userId],
 *   priority: 'high',
 *   entityType: 'task',
 *   entityId: taskId,
 *   metadata: {
 *     taskTitle: 'Implementar feature X',
 *     assignedByName: 'João Silva',
 *   },
 * })
 */
