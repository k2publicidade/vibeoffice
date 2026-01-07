# Design: Sistema de Notificações In-App em Tempo Real

**Data**: 2026-01-07
**Objetivo**: Implementar notificações in-app com Realtime para manter usuários informados sobre eventos importantes

---

## 1. Arquitetura Geral

O sistema de notificações in-app funcionará em 3 camadas:

### **1.1 Camada de Banco de Dados (Supabase)**
- Tabela `notifications`: armazena todas as notificações
- Tabela `notification_preferences`: preferências do usuário (habilitado/desabilitado por tipo)
- RLS policies: usuário só vê suas próprias notificações
- Realtime enabled: mudanças propagam automaticamente para o frontend

### **1.2 Camada de Eventos (EventBus)**
- Hooks (`useTasks`, `useTickets`, `useChat`) emitem eventos via `EventBus.emit()`
- `NotificationProcessor` processa eventos e cria notificações no banco
- `InAppHandler` insere notificação na tabela (dispara Realtime automaticamente)

### **1.3 Camada de UI (React)**
- `useNotifications` hook: carrega notificações + subscription Realtime
- `NotificationBell`: sininho no header com badge de contagem
- `NotificationList`: popover com últimas 20 notificações
- `NotificationItem`: item clicável que marca como lido e redireciona

### **Fluxo de Dados:**
```
Ação do usuário → Hook emite evento → EventBus → Processor →
InAppHandler → INSERT no banco → Realtime → useNotifications →
UI atualiza + Toast aparece
```

---

## 2. Estrutura do Banco de Dados

### **2.1 Tabela `notifications`**

```sql
CREATE TABLE public.notifications (
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
```

**Campos:**
- `id`: UUID gerado automaticamente
- `user_id`: Referência ao usuário destinatário
- `type`: Tipo de notificação (task_assigned, ticket_assigned, message_received, etc.)
- `title`: Título curto da notificação
- `message`: Mensagem descritiva completa
- `priority`: low, medium, high (usado para ordenação futura)
- `entity_type`: task, ticket, message, null
- `entity_id`: ID da entidade relacionada (para redirecionamento)
- `metadata`: JSONB com dados extras (nomes, datas, etc.)
- `read`: Flag indicando se foi lida
- `read_at`: Timestamp de quando foi marcada como lida
- `archived`: Flag para arquivamento (não usado na v1)
- `created_at`: Timestamp de criação

### **2.2 Tabela `notification_preferences`**

```sql
CREATE TABLE public.notification_preferences (
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
```

**Campos:**
- `user_id`: Referência ao usuário
- `notification_type`: Tipo específico de notificação
- `enable_in_app`: Se deve criar notificação in-app (padrão: true)
- `enable_push`: Se deve enviar push notification (não implementado na v1)
- `enable_email`: Se deve enviar email (não implementado na v1)

### **2.3 RLS Policies**

**Notificações:**
```sql
-- SELECT: Usuário só vê suas próprias notificações
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE: Usuário só pode marcar suas notificações como lidas
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- INSERT: Apenas service role (backend)
-- Não criar policy de INSERT para usuários comuns
```

**Preferências:**
```sql
-- SELECT/UPDATE: Usuário gerencia suas próprias preferências
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());
```

### **2.4 Índices**

```sql
-- Query rápida de notificações recentes
CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Contar não lidas rapidamente
CREATE INDEX idx_notifications_user_read
  ON notifications(user_id, read)
  WHERE archived = false;

-- Preferências por usuário
CREATE INDEX idx_preferences_user
  ON notification_preferences(user_id);
```

### **2.5 Realtime**

```sql
-- Habilitar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## 3. Tipos de Notificações

### **3.1 Tarefas (Tasks)**

| Tipo | Quando dispara | Destinatários | Prioridade |
|------|---------------|---------------|------------|
| `task_assigned` | Task criada com assignedTo | assignedTo | Mesma da task |
| `task_status_changed` | Status da task muda | assignedTo | medium |
| `task_due_soon` | Task vence em 24h (futuro) | assignedTo | high |

**Metadata:**
- `taskTitle`: Título da task
- `taskId`: ID da task
- `assignedByName`: Nome de quem atribuiu
- `dueDate`: Data de vencimento (ISO string)
- `oldStatus`, `newStatus`: Status anterior/novo (para status_changed)

### **3.2 Tickets**

| Tipo | Quando dispara | Destinatários | Prioridade |
|------|---------------|---------------|------------|
| `ticket_created` | Novo ticket criado | Admins + Gerentes do setor | medium |
| `ticket_assigned` | Ticket atribuído | assignedTo | Mesma do ticket |
| `ticket_status_changed` | Status muda | assignedTo + requester | medium |

**Metadata:**
- `ticketTitle`: Título do ticket
- `ticketId`: ID do ticket
- `requester`: ID do solicitante
- `requesterName`: Nome do solicitante
- `assignedToName`: Nome do responsável
- `oldStatus`, `newStatus`: Status anterior/novo

### **3.3 Chat**

| Tipo | Quando dispara | Destinatários | Prioridade |
|------|---------------|---------------|------------|
| `message_received` | Nova mensagem em DM | Participantes (exceto sender) | medium |
| `mentioned_in_chat` | @mention no chat | Usuário mencionado | high |

**Metadata:**
- `senderName`: Nome de quem enviou
- `senderId`: ID de quem enviou
- `messagePreview`: Primeiros 100 chars da mensagem
- `roomId`: ID da sala
- `roomName`: Nome da sala (para sector rooms)

---

## 4. Integração com Hooks Existentes

### **4.1 useTasks.ts**

**Localização das emissões:**

**1. `createTask` (após inserção bem-sucedida):**
```typescript
// Linha ~220 (após criar task no banco)
if (taskData.assignedTo) {
  EventBus.emit({
    type: 'task_assigned',
    recipientIds: [taskData.assignedTo],
    priority: taskData.priority === 'high' ? 'high' : 'medium',
    entityType: 'task',
    entityId: newTask.id,
    metadata: {
      taskTitle: taskData.title,
      taskId: newTask.id,
      assignedByName: user?.name,
      dueDate: taskData.dueDate?.toISOString(),
    },
  }).catch((err) => {
    console.error('[useTasks] Failed to emit notification:', err)
  })
}
```

**2. `updateTask` (quando status muda):**
```typescript
// Linha ~260 (após update no banco)
const task = tasks.find(t => t.id === taskId)
if (task && updates.status && task.status !== updates.status && task.assignedTo) {
  EventBus.emit({
    type: 'task_status_changed',
    recipientIds: [task.assignedTo],
    priority: 'medium',
    entityType: 'task',
    entityId: taskId,
    metadata: {
      taskTitle: task.title,
      taskId: task.id,
      oldStatus: task.status,
      newStatus: updates.status,
    },
  }).catch((err) => {
    console.error('[useTasks] Failed to emit notification:', err)
  })
}
```

### **4.2 useTickets.ts**

**1. `createTicket` (após inserção):**
```typescript
// Notificar Admins e Gerentes do setor do requester
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
  }).catch((err) => console.error('[useTickets] Failed to emit:', err))
}
```

**2. `updateTicket` (quando assignedTo é definido ou status muda):**
```typescript
// Quando assignedTo muda
if (updates.assignedTo && ticket.assignedTo !== updates.assignedTo) {
  EventBus.emit({
    type: 'ticket_assigned',
    recipientIds: [updates.assignedTo],
    priority: ticket.priority === 'high' ? 'high' : 'medium',
    entityType: 'ticket',
    entityId: ticketId,
    metadata: {
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      assignedByName: user?.name,
    },
  })
}

// Quando status muda
if (updates.status && ticket.status !== updates.status) {
  const recipients = [ticket.assignedTo, ticket.requester].filter(Boolean)
  EventBus.emit({
    type: 'ticket_status_changed',
    recipientIds: recipients,
    priority: 'medium',
    entityType: 'ticket',
    entityId: ticketId,
    metadata: {
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      oldStatus: ticket.status,
      newStatus: updates.status,
    },
  })
}
```

### **4.3 useChat.ts**

**1. `sendMessage` (após enviar mensagem):**
```typescript
// Buscar participantes da sala (exceto sender)
const { data: roomMembers } = await supabase
  .from('chat_room_members')
  .select('user_id')
  .eq('room_id', roomId)
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
      roomId: roomId,
      roomName: room?.name,
    },
  })
}

// Detectar @mentions (futuro)
const mentions = messageData.content.match(/@(\w+)/g)
if (mentions) {
  // Buscar usuários mencionados e enviar mentioned_in_chat
}
```

---

## 5. Componentes de UI

### **5.1 NotificationBell.tsx** (já existe, manter)

**Localização**: `src/components/notifications/NotificationBell.tsx`

- Ícone de sino com badge de contagem
- Usa `useNotifications().unreadCount`
- Abre popover ao clicar

### **5.2 NotificationList.tsx** (precisa ajustes)

**Localização**: `src/components/notifications/NotificationList.tsx`

**Estrutura:**
```tsx
<div className="w-[380px]">
  {/* Header */}
  <div className="flex items-center justify-between p-4 border-b">
    <h3>Notificações</h3>
    <Button onClick={markAllAsRead}>
      Marcar todas como lidas
    </Button>
  </div>

  {/* Lista */}
  <ScrollArea className="h-[400px]">
    {loading ? (
      <LoadingSkeleton />
    ) : notifications.length === 0 ? (
      <EmptyState />
    ) : (
      notifications.slice(0, 20).map(notif => (
        <NotificationItem key={notif.id} notification={notif} />
      ))
    )}
  </ScrollArea>

  {/* Footer */}
  <div className="p-2 border-t text-center">
    <Link href="/settings/notifications">
      Configurar notificações
    </Link>
  </div>
</div>
```

### **5.3 NotificationItem.tsx** (precisa ajustes)

**Localização**: `src/components/notifications/NotificationItem.tsx`

**Funcionalidade:**
1. Layout: ícone (baseado em type) + título + mensagem + timestamp relativo
2. Visual diferente para lidas (opacidade 60%) vs não lidas (opacidade 100%)
3. Click handler:
   - Marcar como lida: `markAsRead(notification.id)`
   - Redirecionar para entidade
   - Fechar popover

**Redirecionamento:**
```typescript
const getNotificationLink = (notification: Notification) => {
  switch (notification.entity_type) {
    case 'task':
      return `/tasks?open=${notification.entity_id}`
    case 'ticket':
      return `/tickets?open=${notification.entity_id}`
    case 'message':
      return `/chat?room=${notification.metadata.roomId}`
    default:
      return null
  }
}
```

**Ícones por tipo:**
```typescript
const icons = {
  task_assigned: CheckSquare,
  task_status_changed: RefreshCw,
  ticket_assigned: Ticket,
  ticket_created: Plus,
  ticket_status_changed: RefreshCw,
  message_received: MessageSquare,
  mentioned_in_chat: AtSign,
}
```

### **5.4 Toast de Nova Notificação**

**Localização**: `src/hooks/useNotifications.ts` (já implementado)

- Linha 152: Toast automático ao receber notificação via Realtime
- Usa `sonner` com título + mensagem, duração de 5 segundos

---

## 6. Comportamento do Sistema

### **6.1 Carregamento Inicial**
1. Usuário faz login
2. `useNotifications` busca últimas 50 notificações não arquivadas
3. Calcula `unreadCount` (notificações com `read = false`)
4. Badge atualiza no header

### **6.2 Recebimento de Notificação em Tempo Real**
1. Evento acontece (ex: task atribuída)
2. Hook emite via `EventBus`
3. `NotificationProcessor` processa evento
4. `InAppHandler` insere notificação no banco
5. **Realtime propaga INSERT** para todos os clientes conectados
6. `useNotifications` recebe novo registro via subscription
7. Adiciona notificação ao state: `setNotifications(prev => [new, ...prev])`
8. Toast aparece automaticamente
9. Badge de contagem atualiza

### **6.3 Marcar como Lida**
1. Usuário clica em notificação
2. `markAsRead(id)` executa:
   ```typescript
   await supabase
     .from('notifications')
     .update({ read: true, read_at: new Date().toISOString() })
     .eq('id', id)
   ```
3. State local atualiza otimisticamente
4. Usuário é redirecionado para a entidade
5. Popover fecha

### **6.4 Marcar Todas como Lidas**
1. Usuário clica em "Marcar todas como lidas"
2. `markAllAsRead()` executa:
   ```typescript
   await supabase
     .from('notifications')
     .update({ read: true })
     .eq('user_id', user.id)
     .eq('read', false)
   ```
3. State local atualiza todas para `read: true`
4. Toast de confirmação aparece
5. Badge zera

---

## 7. Tratamento de Erros

### **7.1 EventBus (Fire-and-Forget)**
- Erros no processamento de eventos **nunca propagam** para o código que emitiu
- Apenas log no console: `console.error('[EventBus] Error processing event:', error)`
- Aplicação continua funcionando mesmo se notificação falhar

### **7.2 useNotifications Hook**
- Erros ao carregar notificações: toast de erro + estado `error` no hook
- Erros ao marcar como lida: toast de erro, mas não quebra UI
- Realtime desconecta: reconnect automático pelo Supabase client

### **7.3 Processor e Handlers**
- Se preferências não existirem, usar defaults (in-app habilitado)
- Se inserção falhar, log e swallow error
- Processamento paralelo com `Promise.allSettled` (não bloqueia outros destinatários)

---

## 8. Melhorias Futuras (Não Implementadas na v1)

1. **Paginação infinita** no NotificationList
2. **Filtros por tipo** de notificação
3. **Arquivamento** de notificações antigas
4. **Página dedicada** `/notifications` com histórico completo
5. **task_due_soon** via cron job/edge function
6. **@mentions no chat** com detecção automática
7. **Push notifications** no navegador
8. **Email notifications** com templates
9. **Notificações agrupadas** (ex: "3 novas tarefas atribuídas")
10. **Preferências granulares** por tipo de notificação

---

## 9. Checklist de Implementação

### **Fase 1: Banco de Dados**
- [ ] Criar migration `019_notifications_system.sql`
- [ ] Criar tabela `notifications` com campos e índices
- [ ] Criar tabela `notification_preferences` com constraint unique
- [ ] Criar RLS policies para ambas as tabelas
- [ ] Habilitar Realtime para `notifications`
- [ ] Executar migration no Supabase

### **Fase 2: Integração com Hooks**
- [ ] Modificar `useTasks.ts` para emitir `task_assigned` e `task_status_changed`
- [ ] Modificar `useTickets.ts` para emitir `ticket_created`, `ticket_assigned`, `ticket_status_changed`
- [ ] Modificar `useChat.ts` para emitir `message_received`
- [ ] Testar emissões de eventos no console

### **Fase 3: Componentes UI**
- [ ] Ajustar `NotificationList.tsx` com header/footer/limite de 20
- [ ] Ajustar `NotificationItem.tsx` com ícones, redirecionamento e marcação
- [ ] Testar popover de notificações
- [ ] Testar toast de nova notificação
- [ ] Testar redirecionamento para tasks/tickets/chat

### **Fase 4: Testes**
- [ ] Criar task atribuída → verificar notificação aparece
- [ ] Atualizar status de task → verificar notificação de mudança
- [ ] Criar ticket → verificar Admins/Gerentes recebem
- [ ] Atribuir ticket → verificar assignedTo recebe
- [ ] Enviar mensagem DM → verificar destinatário recebe
- [ ] Marcar como lida → verificar badge atualiza
- [ ] Marcar todas como lidas → verificar badge zera
- [ ] Clicar em notificação → verificar redirecionamento

---

## 10. Decisões de Design

### **Por que não usar Service Worker para Push?**
- v1 foca em notificações in-app (mais simples, não requer permissão)
- Push notifications requerem HTTPS, service worker, permissão do usuário
- Pode ser adicionado na v2 se houver demanda

### **Por que limitar a 20 notificações no popover?**
- Performance: não sobrecarregar UI com centenas de itens
- UX: usuário não precisa scrollar muito
- Histórico completo pode ser adicionado em página dedicada (v2)

### **Por que usar JSONB para metadata?**
- Flexibilidade: cada tipo de notificação pode ter campos diferentes
- Não requer mudanças no schema ao adicionar novos tipos
- Supabase indexa JSONB eficientemente

### **Por que separar notification_preferences?**
- Permite configuração granular por usuário
- Facilita adicionar push/email no futuro
- Mantém tabela notifications simples e otimizada

---

## Conclusão

Este design implementa um sistema completo de notificações in-app em tempo real com:
- ✅ Arquitetura em 3 camadas (banco + eventos + UI)
- ✅ Realtime via Supabase
- ✅ 8 tipos de notificações (tasks, tickets, chat)
- ✅ UI simples e direta (popover + toast)
- ✅ Tratamento robusto de erros
- ✅ Preparado para expansão futura (push, email)

Total estimado de implementação: **4-6 horas** (desenvolvimento + testes).
