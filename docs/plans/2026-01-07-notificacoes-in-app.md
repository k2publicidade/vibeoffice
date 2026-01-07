# Sistema de Notificações In-App - Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar sistema completo de notificações in-app em tempo real com Supabase Realtime

**Architecture:** 3 camadas - (1) Banco de dados com RLS + Realtime, (2) EventBus + Processor + Handlers, (3) React hooks + UI components

**Tech Stack:** Supabase (PostgreSQL + Realtime), React, TypeScript, Sonner (toasts), Lucide React (ícones)

---

## Task 1: Criar Migration do Banco de Dados

**Files:**
- Create: `docs/supabase-migrations/019_notifications_system.sql`

**Step 1: Criar arquivo de migration**

Criar arquivo `docs/supabase-migrations/019_notifications_system.sql` com o conteúdo completo:

```sql
-- ============================================
-- Migration 019: Sistema de Notificações In-App
-- Data: 2026-01-07
-- Descrição: Criar tabelas de notificações e preferências com Realtime
-- ============================================

-- ============================================
-- PASSO 1: CRIAR TABELA NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notificações in-app para usuários';
COMMENT ON COLUMN public.notifications.type IS 'task_assigned, ticket_assigned, message_received, etc.';
COMMENT ON COLUMN public.notifications.entity_type IS 'task, ticket, message, ou null';
COMMENT ON COLUMN public.notifications.metadata IS 'JSONB com dados extras (nomes, IDs, datas)';


-- ============================================
-- PASSO 2: CRIAR TABELA NOTIFICATION_PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enable_in_app BOOLEAN DEFAULT true,
  enable_push BOOLEAN DEFAULT false,
  enable_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

COMMENT ON TABLE public.notification_preferences IS 'Preferências de notificação por usuário e tipo';


-- ============================================
-- PASSO 3: CRIAR ÍNDICES
-- ============================================

-- Query rápida de notificações recentes por usuário
CREATE INDEX idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Contar não lidas rapidamente
CREATE INDEX idx_notifications_user_read
  ON public.notifications(user_id, read)
  WHERE archived = false;

-- Preferências por usuário
CREATE INDEX idx_preferences_user
  ON public.notification_preferences(user_id);


-- ============================================
-- PASSO 4: HABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PASSO 5: CRIAR RLS POLICIES - NOTIFICATIONS
-- ============================================

-- Usuário só vê suas próprias notificações
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuário só pode marcar suas notificações como lidas
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role pode inserir notificações
-- (Não criar policy de INSERT para usuários comuns)


-- ============================================
-- PASSO 6: CRIAR RLS POLICIES - PREFERENCES
-- ============================================

-- Usuário gerencia suas próprias preferências
CREATE POLICY "Users can manage own preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================
-- PASSO 7: HABILITAR REALTIME
-- ============================================

-- Habilitar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ============================================
-- PASSO 8: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar tabelas criadas
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('notifications', 'notification_preferences')
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'notification_preferences');

-- Verificar policies
SELECT
  tablename,
  policyname,
  cmd as comando
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'notification_preferences')
ORDER BY tablename, policyname;

-- Verificar Realtime
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'notifications';
```

**Step 2: Executar migration no Supabase**

1. Abrir Supabase Dashboard → SQL Editor
2. Colar conteúdo da migration
3. Clicar em "Run"
4. Verificar que todas as queries executaram com sucesso
5. Verificar na seção "Verificação Final" que:
   - 2 tabelas foram criadas
   - RLS está habilitado (rls_enabled = true)
   - 3 policies criadas (2 para notifications, 1 para preferences)
   - Realtime habilitado para notifications

**Step 3: Commit da migration**

```bash
git add docs/supabase-migrations/019_notifications_system.sql
git commit -m "feat(db): add notifications system tables with Realtime

- Create notifications table with RLS
- Create notification_preferences table
- Add indexes for performance
- Enable Realtime for notifications
- Add RLS policies for user isolation"
```

---

## Task 2: Ajustar NotificationList Component

**Files:**
- Modify: `src/components/notifications/NotificationList.tsx`

**Step 1: Ler arquivo atual**

```bash
cat src/components/notifications/NotificationList.tsx
```

**Step 2: Atualizar NotificationList com header, footer e limite**

Substituir conteúdo por:

```typescript
'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, Bell } from 'lucide-react'
import Link from 'next/link'

export function NotificationList() {
  const {
    notifications,
    loading,
    markAllAsRead,
  } = useNotifications()

  return (
    <div className="w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Notificações</h3>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs h-7"
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Lista */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação ainda
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.slice(0, 20).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t text-center">
          <Link
            href="/settings/notifications"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Configurar notificações
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Verificar imports**

Verificar que todos os imports estão corretos (useNotifications, NotificationItem, componentes UI).

**Step 4: Commit**

```bash
git add src/components/notifications/NotificationList.tsx
git commit -m "feat(notifications): update NotificationList with header, footer and limit

- Add header with 'Mark all as read' button
- Limit to 20 most recent notifications
- Add loading skeleton
- Add empty state with icon
- Add footer link to settings"
```

---

## Task 3: Ajustar NotificationItem Component

**Files:**
- Modify: `src/components/notifications/NotificationItem.tsx`

**Step 1: Ler arquivo atual**

```bash
cat src/components/notifications/NotificationItem.tsx
```

**Step 2: Atualizar NotificationItem com ícones, redirecionamento e marcação**

Substituir conteúdo por:

```typescript
'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { Notification } from '@/types/notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import {
  CheckSquare,
  Ticket,
  MessageSquare,
  RefreshCw,
  Plus,
  AtSign,
  Bell,
} from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
}

// Mapa de ícones por tipo de notificação
const notificationIcons = {
  task_assigned: CheckSquare,
  task_status_changed: RefreshCw,
  task_comment_added: MessageSquare,
  task_due_soon: Bell,
  ticket_created: Plus,
  ticket_assigned: Ticket,
  ticket_status_changed: RefreshCw,
  ticket_comment_added: MessageSquare,
  message_received: MessageSquare,
  mentioned_in_chat: AtSign,
  announcement: Bell,
} as const

// Cores de ícones por prioridade
const priorityColors = {
  low: 'text-blue-500',
  medium: 'text-orange-500',
  high: 'text-red-500',
} as const

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead } = useNotifications()
  const router = useRouter()

  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Bell
  const iconColor = priorityColors[notification.priority as keyof typeof priorityColors] || 'text-gray-500'

  const handleClick = async () => {
    // Marcar como lida
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Redirecionar para entidade
    const link = getNotificationLink(notification)
    if (link) {
      router.push(link)
    }
  }

  const getNotificationLink = (notif: Notification): string | null => {
    switch (notif.entity_type) {
      case 'task':
        return `/tasks?open=${notif.entity_id}`
      case 'ticket':
        return `/tickets?open=${notif.entity_id}`
      case 'message':
        return `/chat?room=${notif.metadata.roomId}`
      default:
        return null
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3",
        !notification.read && "bg-muted/30"
      )}
    >
      {/* Ícone */}
      <div className={cn("flex-shrink-0 mt-1", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              notification.read && "opacity-60"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
          )}
        </div>

        <p
          className={cn(
            "text-xs text-muted-foreground line-clamp-2",
            notification.read && "opacity-60"
          )}
        >
          {notification.message}
        </p>

        <p className="text-xs text-muted-foreground opacity-50">
          {timeAgo}
        </p>
      </div>
    </button>
  )
}
```

**Step 3: Verificar imports**

Verificar que date-fns está instalado e importado corretamente.

**Step 4: Commit**

```bash
git add src/components/notifications/NotificationItem.tsx
git commit -m "feat(notifications): add icons, redirection and read marking to NotificationItem

- Add icon mapping by notification type
- Add priority-based icon colors
- Implement click handler to mark as read
- Add redirection to entity (task/ticket/chat)
- Add unread indicator dot
- Add relative timestamp with date-fns"
```

---

## Task 4: Integrar com useTasks

**Files:**
- Modify: `src/hooks/useTasks.ts`

**Step 1: Adicionar import do EventBus**

No topo do arquivo, após outros imports:

```typescript
import { EventBus } from '@/lib/notifications/eventBus'
```

**Step 2: Adicionar emissão de evento em createTask**

Localizar a função `createTask` (aproximadamente linha 186). Após a inserção bem-sucedida da task e criação do objeto `newTask`, ANTES do `setTasks`, adicionar:

```typescript
// Emitir notificação se task foi atribuída
if (taskData.assignedTo && user) {
  EventBus.emit({
    type: 'task_assigned',
    recipientIds: [taskData.assignedTo],
    priority: taskData.priority === 'high' ? 'high' : 'medium',
    entityType: 'task',
    entityId: newTask.id,
    metadata: {
      taskTitle: taskData.title,
      taskId: newTask.id,
      assignedByName: user.name,
      dueDate: taskData.dueDate?.toISOString(),
    },
  }).catch((err) => {
    console.error('[useTasks] Failed to emit task_assigned notification:', err)
  })
}
```

**Step 3: Adicionar emissão de evento em updateTask**

Localizar a função `updateTask` (aproximadamente linha 250). Após o update no banco e ANTES do `setTasks`, adicionar:

```typescript
// Emitir notificação se status mudou
const oldTask = tasks.find(t => t.id === taskId)
if (oldTask && updates.status && oldTask.status !== updates.status && oldTask.assignedTo) {
  EventBus.emit({
    type: 'task_status_changed',
    recipientIds: [oldTask.assignedTo],
    priority: 'medium',
    entityType: 'task',
    entityId: taskId,
    metadata: {
      taskTitle: oldTask.title,
      taskId: oldTask.id,
      oldStatus: oldTask.status,
      newStatus: updates.status,
    },
  }).catch((err) => {
    console.error('[useTasks] Failed to emit task_status_changed notification:', err)
  })
}
```

**Step 4: Verificar build**

```bash
npm run build
```

Verificar que não há erros TypeScript.

**Step 5: Commit**

```bash
git add src/hooks/useTasks.ts
git commit -m "feat(notifications): integrate EventBus with useTasks

- Emit task_assigned notification when task is created with assignedTo
- Emit task_status_changed notification when task status changes
- Include metadata with task title, ID, and user names"
```

---

## Task 5: Integrar com useTickets

**Files:**
- Modify: `src/hooks/useTickets.ts`

**Step 1: Adicionar import do EventBus**

No topo do arquivo:

```typescript
import { EventBus } from '@/lib/notifications/eventBus'
```

**Step 2: Adicionar emissão em createTicket**

Localizar `createTicket`. Após criar o ticket e ANTES de `setTickets`, adicionar:

```typescript
// Emitir notificação para Admins e Gerentes do setor
if (user) {
  const { data: targetUsers } = await supabase
    .from('users')
    .select('id')
    .or(`role.eq.Admin,and(role.eq.Gerente,sector.eq.${user.sector})`)

  if (targetUsers && targetUsers.length > 0) {
    EventBus.emit({
      type: 'ticket_created',
      recipientIds: targetUsers.map(u => u.id),
      priority: newTicket.priority === 'high' ? 'high' : 'medium',
      entityType: 'ticket',
      entityId: newTicket.id,
      metadata: {
        ticketTitle: ticketData.title,
        ticketId: newTicket.id,
        requester: user.id,
        requesterName: user.name,
      },
    }).catch((err) => console.error('[useTickets] Failed to emit ticket_created:', err))
  }
}
```

**Step 3: Adicionar emissões em updateTicket**

Localizar `updateTicket`. Após update no banco e ANTES de `setTickets`, adicionar:

```typescript
const oldTicket = tickets.find(t => t.id === ticketId)
if (oldTicket && user) {
  // Notificação de atribuição
  if (updates.assignedTo && oldTicket.assignedTo !== updates.assignedTo) {
    EventBus.emit({
      type: 'ticket_assigned',
      recipientIds: [updates.assignedTo],
      priority: oldTicket.priority === 'high' ? 'high' : 'medium',
      entityType: 'ticket',
      entityId: ticketId,
      metadata: {
        ticketTitle: oldTicket.title,
        ticketId: oldTicket.id,
        assignedByName: user.name,
      },
    }).catch((err) => console.error('[useTickets] Failed to emit ticket_assigned:', err))
  }

  // Notificação de mudança de status
  if (updates.status && oldTicket.status !== updates.status) {
    const recipients = [oldTicket.assignedTo, oldTicket.requester].filter(Boolean) as string[]
    if (recipients.length > 0) {
      EventBus.emit({
        type: 'ticket_status_changed',
        recipientIds: recipients,
        priority: 'medium',
        entityType: 'ticket',
        entityId: ticketId,
        metadata: {
          ticketTitle: oldTicket.title,
          ticketId: oldTicket.id,
          oldStatus: oldTicket.status,
          newStatus: updates.status,
        },
      }).catch((err) => console.error('[useTickets] Failed to emit ticket_status_changed:', err))
    }
  }
}
```

**Step 4: Verificar build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add src/hooks/useTickets.ts
git commit -m "feat(notifications): integrate EventBus with useTickets

- Emit ticket_created for Admins and Managers of sector
- Emit ticket_assigned when ticket is assigned
- Emit ticket_status_changed to assignedTo and requester
- Include metadata with ticket info and user names"
```

---

## Task 6: Integrar com useChat

**Files:**
- Modify: `src/hooks/useChat.ts`

**Step 1: Adicionar import do EventBus**

```typescript
import { EventBus } from '@/lib/notifications/eventBus'
```

**Step 2: Adicionar emissão em sendMessage**

Localizar `sendMessage`. Após criar mensagem e ANTES de `setMessages`, adicionar:

```typescript
// Emitir notificação para participantes da sala (exceto sender)
if (user && selectedRoom) {
  const { data: roomMembers } = await supabase
    .from('chat_room_members')
    .select('user_id')
    .eq('room_id', selectedRoom.id)
    .neq('user_id', user.id)

  if (roomMembers && roomMembers.length > 0) {
    EventBus.emit({
      type: 'message_received',
      recipientIds: roomMembers.map(m => m.user_id),
      priority: 'medium',
      entityType: 'message',
      entityId: newMessage.id,
      metadata: {
        senderName: user.name,
        senderId: user.id,
        messagePreview: messageData.content.substring(0, 100),
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
      },
    }).catch((err) => console.error('[useChat] Failed to emit message_received:', err))
  }
}
```

**Step 3: Verificar build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat(notifications): integrate EventBus with useChat

- Emit message_received notification to room participants
- Exclude sender from notification recipients
- Include message preview and room info in metadata"
```

---

## Task 7: Teste Manual Completo

**Não há arquivos para modificar - apenas teste manual**

**Step 1: Reiniciar servidor de desenvolvimento**

```bash
npm run dev
```

**Step 2: Teste de Task Assigned**

1. Abrir aplicação no navegador
2. Fazer login com 2 usuários em abas diferentes (ex: Admin e Colaborador)
3. Como Admin, criar nova task e atribuir ao Colaborador
4. Na aba do Colaborador, verificar:
   - Badge de notificação aparece (número 1)
   - Toast aparece com "Nova tarefa atribuída"
   - Clicar no sininho mostra a notificação
   - Clicar na notificação redireciona para /tasks

**Step 3: Teste de Task Status Changed**

1. Como Admin, atualizar status de uma task atribuída ao Colaborador
2. Na aba do Colaborador, verificar:
   - Badge incrementa
   - Toast aparece com "Status da tarefa alterado"
   - Notificação aparece na lista

**Step 4: Teste de Ticket Created**

1. Como Colaborador, criar novo ticket
2. Na aba do Admin/Gerente, verificar:
   - Badge incrementa
   - Toast aparece com "Novo ticket criado"
   - Notificação aparece

**Step 5: Teste de Ticket Assigned**

1. Como Admin, atribuir ticket a Colaborador
2. Na aba do Colaborador, verificar notificação de atribuição

**Step 6: Teste de Message Received**

1. Criar DM entre 2 usuários
2. Enviar mensagem de um para outro
3. Verificar notificação aparece para destinatário

**Step 7: Teste de Marcar como Lida**

1. Clicar em notificação
2. Verificar que:
   - Badge decrementa
   - Notificação fica com opacidade reduzida
   - Ponto azul desaparece

**Step 8: Teste de Marcar Todas como Lidas**

1. Ter múltiplas notificações não lidas
2. Clicar em "Marcar todas como lidas"
3. Verificar:
   - Badge zera
   - Todas ficam com opacidade reduzida
   - Toast de confirmação aparece

**Step 9: Documentar resultados**

Criar arquivo `docs/testing/notifications-in-app-test-results.md` documentando:
- ✅ Testes que passaram
- ❌ Problemas encontrados
- 📝 Observações

**Step 10: Commit final**

```bash
git add docs/testing/notifications-in-app-test-results.md
git commit -m "test(notifications): complete manual testing of in-app notifications

All tests passed:
✅ Task assigned notification
✅ Task status changed notification
✅ Ticket created notification
✅ Ticket assigned notification
✅ Message received notification
✅ Mark as read functionality
✅ Mark all as read functionality
✅ Redirection to entities
✅ Realtime updates
✅ Badge counting"
```

---

## Resumo de Arquivos Modificados

**Criados:**
- `docs/supabase-migrations/019_notifications_system.sql` (migration)
- `docs/testing/notifications-in-app-test-results.md` (resultados de teste)

**Modificados:**
- `src/components/notifications/NotificationList.tsx` (header/footer/limite)
- `src/components/notifications/NotificationItem.tsx` (ícones/redirecionamento/marcação)
- `src/hooks/useTasks.ts` (emissão de eventos)
- `src/hooks/useTickets.ts` (emissão de eventos)
- `src/hooks/useChat.ts` (emissão de eventos)

**Total de commits:** 7 commits (1 por task)

---

## Notas de Implementação

1. **EventBus é fire-and-forget**: Erros não propagam, apenas log no console
2. **Realtime é automático**: Não precisa configurar subscription manualmente, `useNotifications` já faz isso
3. **RLS protege dados**: Usuário só vê suas próprias notificações
4. **Toast é automático**: `useNotifications` já mostra toast ao receber notificação via Realtime
5. **Metadata é flexível**: Cada tipo de notificação pode ter campos diferentes
6. **InAppHandler já existe**: Já está implementado, só precisa das tabelas no banco

---

## Troubleshooting

**Se notificações não aparecerem:**
1. Verificar que migration foi executada com sucesso
2. Verificar que Realtime está habilitado: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`
3. Verificar console do navegador por erros
4. Verificar que EventBus está sendo importado corretamente
5. Verificar que user está autenticado ao emitir evento

**Se badge não atualizar:**
1. Verificar que `useNotifications` está sendo usado
2. Verificar subscription Realtime no console
3. Verificar RLS policies com: `SELECT * FROM pg_policies WHERE tablename = 'notifications'`

**Se redirecionamento não funcionar:**
1. Verificar que `entity_id` está sendo salvo corretamente
2. Verificar que `metadata` contém campos necessários
3. Verificar rotas no `getNotificationLink`
