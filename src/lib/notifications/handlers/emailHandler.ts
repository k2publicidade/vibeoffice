import { createClient } from '@/lib/supabase/client'
import { NotificationEvent, NotificationType } from '@/types/notifications'

/**
 * Circuit Breaker para prevenir email spam
 */
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  private readonly FAILURE_THRESHOLD = 5
  private readonly TIMEOUT = 60000 // 1 minuto
  private readonly HALF_OPEN_MAX_CALLS = 3

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.TIMEOUT) {
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN')
        this.state = 'HALF_OPEN'
        this.failures = 0
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()

      if (this.state === 'HALF_OPEN') {
        console.log('[CircuitBreaker] Call succeeded in HALF_OPEN, closing circuit')
        this.state = 'CLOSED'
        this.failures = 0
      }

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      if (this.failures >= this.FAILURE_THRESHOLD) {
        console.error('[CircuitBreaker] Threshold reached, opening circuit')
        this.state = 'OPEN'
      }

      throw error
    }
  }

  getState() {
    return this.state
  }
}

export class EmailHandler {
  private supabase = createClient()
  private circuitBreaker = new CircuitBreaker()

  // Tipos que NUNCA devem enviar email (alta frequência)
  private readonly EMAIL_BLACKLIST: NotificationType[] = [
    'message_received',
    'mentioned_in_chat',
  ]

  async send(userId: string, event: NotificationEvent): Promise<void> {
    // 1. Verificar se tipo está na blacklist
    if (this.EMAIL_BLACKLIST.includes(event.type)) {
      console.log(`[EmailHandler] Skipping email for blacklisted type: ${event.type}`)
      return
    }

    // 2. Buscar dados do usuário
    const { data: user } = await this.supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (!user?.email) {
      console.error('[EmailHandler] User email not found:', userId)
      return
    }

    // 3. Executar com circuit breaker
    try {
      await this.circuitBreaker.execute(async () => {
        await this.sendEmail(user.email, user.name, event)
      })
    } catch (error) {
      console.error('[EmailHandler] Failed to send email (circuit breaker):', error)
    }
  }

  private async sendEmail(
    email: string,
    userName: string,
    event: NotificationEvent
  ): Promise<void> {
    const subject = this.generateSubject(event)
    const htmlBody = this.generateHtmlBody(userName, event)

    const { error } = await this.supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject,
        html: htmlBody,
      },
    })

    if (error) {
      console.error('[EmailHandler] Supabase Function error:', error)
      throw error
    }

    console.log(`[EmailHandler] Email sent successfully to ${email}`)
  }

  private generateSubject(event: NotificationEvent): string {
    const subjects: Record<NotificationType, string> = {
      task_assigned: '🎯 Nova tarefa atribuída - VibeOffice',
      task_status_changed: '📋 Status da tarefa alterado - VibeOffice',
      task_comment_added: '💬 Novo comentário em tarefa - VibeOffice',
      task_due_soon: '⏰ Tarefa vence em breve - VibeOffice',
      ticket_created: '🎫 Novo ticket criado - VibeOffice',
      ticket_assigned: '🎫 Ticket atribuído a você - VibeOffice',
      ticket_status_changed: '🎫 Status do ticket alterado - VibeOffice',
      ticket_comment_added: '💬 Novo comentário em ticket - VibeOffice',
      message_received: '💬 Nova mensagem - VibeOffice',
      mentioned_in_chat: '👋 Você foi mencionado - VibeOffice',
      announcement: '📢 Novo anúncio - VibeOffice',
    }
    return subjects[event.type] || '🔔 Nova notificação - VibeOffice'
  }

  private generateHtmlBody(userName: string, event: NotificationEvent): string {
    const title = this.generateTitle(event)
    const message = this.generateMessage(event)
    const actionUrl = this.generateActionUrl(event)
    const actionText = this.generateActionText(event)

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">VibeOffice</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #666666;">Olá, ${userName}!</p>

              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333333; font-weight: 600;">${title}</h2>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #555555; line-height: 1.6;">${message}</p>

              ${actionUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${actionText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                Esta é uma notificação automática do sistema VibeOffice.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                © ${new Date().getFullYear()} VibeOffice. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
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
        return `${metadata.assignedByName || 'Alguém'} atribuiu a tarefa "${metadata.taskTitle}" para você.`
      case 'task_status_changed':
        return `A tarefa "${metadata.taskTitle}" mudou de status para ${metadata.newStatus}.`
      case 'task_comment_added':
        return `${metadata.commenterName} adicionou um comentário na tarefa "${metadata.taskTitle}".`
      case 'task_due_soon':
        return `A tarefa "${metadata.taskTitle}" vence ${metadata.timeUntilDue}.`
      case 'ticket_created':
        return `Um novo ticket foi criado: "${metadata.ticketTitle}".`
      case 'ticket_assigned':
        return `O ticket "${metadata.ticketTitle}" foi atribuído a você.`
      case 'ticket_status_changed':
        return `O ticket "${metadata.ticketTitle}" mudou de status para ${metadata.newStatus}.`
      case 'ticket_comment_added':
        return `${metadata.commenterName} adicionou um comentário no ticket "${metadata.ticketTitle}".`
      case 'announcement':
        return metadata.announcementText || 'Um novo anúncio foi publicado.'
      default:
        return 'Você tem uma nova notificação no VibeOffice.'
    }
  }

  private generateActionUrl(event: NotificationEvent): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (event.entityType === 'task' && event.entityId) {
      return `${baseUrl}/tarefas?task=${event.entityId}`
    }
    if (event.entityType === 'ticket' && event.entityId) {
      return `${baseUrl}/tickets/${event.entityId}`
    }
    if (event.entityType === 'message') {
      return `${baseUrl}/chat`
    }
    return `${baseUrl}/notificacoes`
  }

  private generateActionText(event: NotificationEvent): string {
    const texts: Record<NotificationType, string> = {
      task_assigned: 'Ver tarefa',
      task_status_changed: 'Ver tarefa',
      task_comment_added: 'Ver comentário',
      task_due_soon: 'Ver tarefa',
      ticket_created: 'Ver ticket',
      ticket_assigned: 'Ver ticket',
      ticket_status_changed: 'Ver ticket',
      ticket_comment_added: 'Ver comentário',
      message_received: 'Ver mensagem',
      mentioned_in_chat: 'Ver conversa',
      announcement: 'Ver anúncio',
    }
    return texts[event.type] || 'Ver notificação'
  }
}
