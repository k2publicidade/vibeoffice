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
          // Ignorar erros de RLS (permissão) silenciosamente ou com aviso leve
          if (error?.code === '42501' || error?.status === 403 || error?.message?.includes('row-level security')) {
            console.warn('[Processor] InApp notification skipped due to permissions (RLS)')
          } else {
            console.error('[Processor] InApp failed:', error)
          }
        })
      )
    }

    if (preferences.enable_push) {
      channelPromises.push(
        this.pushHandler.send(userId, event).catch((error) => {
          // Ignorar erros de 404 (subscription not found) que são comuns
          if (error?.message?.includes('No subscriptions found') || error?.code === 'PGRST116') {
            // Debug level log
            // console.debug('[Processor] Push skipped: No subscription')
          } else {
            console.error('[Processor] Push failed:', error)
          }
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
    try {
      // Usar maybeSingle para evitar erro 406/JSON se não existir
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('notification_type', notificationType)
        .maybeSingle()

      if (error) {
        // Se for erro de conexão ou outro, logar e retornar default
        console.warn('[Processor] Error fetching preferences, using default:', error.message)
        return this.getDefaultPreferences(userId, notificationType)
      }

      // Se não encontrar preferências (data null), usar defaults
      if (!data) {
        return this.getDefaultPreferences(userId, notificationType)
      }

      return data
    } catch (err) {
      // Fallback de segurança para qualquer exceção
      return this.getDefaultPreferences(userId, notificationType)
    }
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
