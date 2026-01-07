import { createClient } from '@/lib/supabase/client'
import { NotificationEvent, NotificationPreference, NotificationType } from '@/types/notifications'
import { InAppHandler } from './handlers/inAppHandler'
import { PushHandler } from './handlers/pushHandler'
import { EmailHandler } from './handlers/emailHandler'

export class NotificationProcessor {
  private supabase = createClient()
  private inAppHandler = new InAppHandler()
  private pushHandler = new PushHandler()
  private emailHandler = new EmailHandler()

  async process(event: NotificationEvent): Promise<void> {
    const { recipientIds } = event

    // Processar cada destinatário em paralelo
    const processingPromises = recipientIds.map((userId) =>
      this.processForUser(userId, event)
    )

    await Promise.allSettled(processingPromises)
  }

  private async processForUser(
    userId: string,
    event: NotificationEvent
  ): Promise<void> {
    // 1. Buscar preferências do usuário
    const preferences = await this.getUserPreferences(userId, event.type)

    // 2. Disparar canais habilitados em paralelo
    const channelPromises: Promise<void>[] = []

    if (preferences.enable_in_app) {
      channelPromises.push(
        this.inAppHandler.send(userId, event).catch((error) => {
          console.error('[Processor] InApp failed:', error)
        })
      )
    }

    if (preferences.enable_push) {
      channelPromises.push(
        this.pushHandler.send(userId, event).catch((error) => {
          console.error('[Processor] Push failed:', error)
        })
      )
    }

    if (preferences.enable_email) {
      channelPromises.push(
        this.emailHandler.send(userId, event).catch((error) => {
          console.error('[Processor] Email failed:', error)
        })
      )
    }

    await Promise.allSettled(channelPromises)
  }

  private async getUserPreferences(
    userId: string,
    notificationType: NotificationType
  ): Promise<NotificationPreference> {
    const { data } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .single()

    // Se não encontrar preferências, usar defaults
    if (!data) {
      return this.getDefaultPreferences(userId, notificationType)
    }

    return data
  }

  private getDefaultPreferences(
    userId: string,
    notificationType: NotificationType
  ): NotificationPreference {
    return {
      id: '',
      user_id: userId,
      notification_type: notificationType as any,
      enable_in_app: true,
      enable_push: true,
      enable_email: false, // Email desabilitado por padrão
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
