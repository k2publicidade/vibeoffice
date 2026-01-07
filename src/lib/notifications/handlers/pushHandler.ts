import { createClient } from '@/lib/supabase/client'
import { NotificationEvent } from '@/types/notifications'

export class PushHandler {
  private supabase = createClient()

  async send(userId: string, event: NotificationEvent): Promise<void> {
    // Buscar subscriptions do usuário
    const { data: subscriptions } = await this.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[PushHandler] No subscriptions found for user:', userId)
      return
    }

    // Enviar push para cada device
    const pushPromises = subscriptions.map((sub) =>
      this.sendPushToDevice(sub, event)
    )

    await Promise.allSettled(pushPromises)
  }

  private async sendPushToDevice(subscription: any, event: NotificationEvent) {
    try {
      const { error } = await this.supabase.functions.invoke('send-push', {
        body: {
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notification: {
            title: this.generateTitle(event),
            body: this.generateMessage(event),
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            data: {
              url: this.generateDeepLink(event),
              notificationType: event.type,
            },
          },
        },
      })

      if (error) {
        console.error('[PushHandler] Failed to send push:', error)

        // Se subscription inválida (410/404), remover
        if (error.message?.includes('410') || error.message?.includes('404')) {
          await this.removeInvalidSubscription(subscription.id)
        }
      }
    } catch (error) {
      console.error('[PushHandler] Error:', error)
    }
  }

  private async removeInvalidSubscription(subscriptionId: string) {
    await this.supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    console.log('[PushHandler] Removed invalid subscription:', subscriptionId)
  }

  private generateTitle(event: NotificationEvent): string {
    // Reutilizar lógica do InAppHandler
    return 'Nova notificação'
  }

  private generateMessage(event: NotificationEvent): string {
    return event.metadata.taskTitle || event.metadata.ticketTitle || 'Você tem uma nova notificação'
  }

  private generateDeepLink(event: NotificationEvent): string {
    if (event.entityType === 'task') {
      return `/tarefas?task=${event.entityId}`
    }
    if (event.entityType === 'ticket') {
      return `/tickets/${event.entityId}`
    }
    if (event.entityType === 'message') {
      return `/chat`
    }
    return '/notificacoes'
  }
}
