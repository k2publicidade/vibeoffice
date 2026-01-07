# Design: Melhorias do Sistema VIBEDISTRO

**Data:** 2026-01-06
**Autor:** Claude (via Brainstorming Skill)
**Status:** Aprovado para Implementação

## Sumário Executivo

Este documento descreve o design de 5 melhorias críticas identificadas durante testes do sistema:

1. ✅ **Bug: Cadastro de Eventos** - Eventos não aparecem após criação
2. ✅ **Bug: Cadastro de Tickets** - Tickets não aparecem após criação
3. ✅ **Bug: Drag & Drop Kanban** - Cards não soltam entre colunas
4. 🆕 **Feature: Status Online** - Rastreamento de presença em tempo real
5. 🆕 **Feature: Agenda Integrada** - Vincular tasks/tickets a eventos

---

## 1. Bug: Cadastro de Eventos na Agenda

### Problema Identificado

**Arquivo:** `src/app/(dashboard)/calendar/page.tsx:94-107`

O método `handleCreateEvent` apenas faz `console.log` e nunca chama o hook `createEvent`:

```typescript
const handleCreateEvent = (eventData: {...}) => {
  console.log('Create event:', eventData)
  // TODO: Actually create the event  ← Bug aqui!
  setCreateModalOpen(false)
}
```

**Impacto:** Eventos não são salvos no banco de dados e não aparecem na agenda.

### Solução

Implementar corretamente a chamada ao hook com tratamento de erros:

```typescript
const handleCreateEvent = async (eventData: {
  title: string
  date: Date
  startTime: string
  endTime: string
  location?: string
  tags: string[]
  attendees: string[]
}) => {
  try {
    // Combinar data + hora em Date objects
    const [startHour, startMin] = eventData.startTime.split(':')
    const [endHour, endMin] = eventData.endTime.split(':')

    const startTime = new Date(eventData.date)
    startTime.setHours(parseInt(startHour), parseInt(startMin), 0)

    const endTime = new Date(eventData.date)
    endTime.setHours(parseInt(endHour), parseInt(endMin), 0)

    await createEvent({
      title: eventData.title,
      description: '',
      startTime,
      endTime,
      type: 'personal', // Pode ser dinâmico baseado em tags
      location: eventData.location,
      attendees: eventData.attendees,
    })

    setCreateModalOpen(false)
    setSelectedSlot(null)
    toast.success('Evento criado com sucesso!')
  } catch (error) {
    console.error('Erro ao criar evento:', error)
    toast.error('Erro ao criar evento')
  }
}
```

**Arquivos Modificados:**
- `src/app/(dashboard)/calendar/page.tsx`

**Dependências:**
- Adicionar `import { toast } from 'sonner'`

---

## 2. Bug: Cadastro de Tickets

### Problema Identificado

**Arquivo:** `src/app/(dashboard)/tickets/page.tsx:52-59`

O `handleCreateTicket` não aguarda a promise do `createTicket`:

```typescript
const handleCreateTicket = (data: CreateTicketInput) => {
  createTicket({  // ← Faltando await!
    ...data,
    status: 'open',
    requester: 'current-user',
  })
  toast.success('Ticket criado com sucesso!')  // ← Toast antes do insert completar
}
```

**Impacto:** Toast aparece antes do ticket ser inserido no banco. Estado local pode não sincronizar corretamente.

### Solução

Tornar a função async e aguardar a criação:

```typescript
const handleCreateTicket = async (data: CreateTicketInput) => {
  try {
    await createTicket({
      ...data,
      status: 'open',
      requester: user!.id, // Usar user do hook useAuth
    })
    toast.success('Ticket criado com sucesso!')
  } catch (error) {
    console.error('Erro ao criar ticket:', error)
    toast.error('Erro ao criar ticket')
  }
}
```

**Arquivos Modificados:**
- `src/app/(dashboard)/tickets/page.tsx`

**Observação:** O hook `useTickets.createTicket` já está correto (linha 207: `setTickets(prev => [newTicket, ...prev])`).

---

## 3. Bug: Drag & Drop no Kanban

### Problema Identificado

**Sintoma:** Usuário consegue arrastar cards mas não consegue soltar na coluna destino.

**Análise do código:**

1. `PremiumTaskCard` usa `useSortable` (para reordenar dentro de lista)
2. `KanbanColumn` usa `useDroppable` (para receber drops)
3. Detecção de colisão usa `closestCorners` (não ideal para colunas lado a lado)

### Solução

**Ajuste 1: Melhorar detecção de colisão**

```typescript
// src/components/tasks/PremiumKanbanBoard.tsx
import { closestCenter } from "@dnd-kit/core"

<DndContext
    sensors={sensors}
    collisionDetection={closestCenter} // ← Mudar de closestCorners
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
    onDragEnd={handleDragEnd}
>
```

**Ajuste 2: Adicionar dados ao sortable para debug**

```typescript
// src/components/tasks/PremiumTaskCard.tsx
const { ... } = useSortable({
    id: task.id,
    data: { task, type: 'task' } // ← Adicionar metadata
})
```

**Ajuste 3: Garantir que onTaskMove está sendo chamado**

O handler já está correto no `tasks/page.tsx:104-109`:

```typescript
const handleTaskMove = (taskId: string, toStatus: TaskStatus) => {
  const task = filteredTasks.find(t => t.id === taskId)
  if (task) {
    updateTask(taskId, { ...task, status: toStatus })
  }
}
```

**Arquivos Modificados:**
- `src/components/tasks/PremiumKanbanBoard.tsx`
- `src/components/tasks/PremiumTaskCard.tsx`

---

## 4. Feature: Status Online em Tempo Real

### Requisito

Exibir na sidebar uma lista de colaboradores online em tempo real.

### Arquitetura

Usar **Supabase Realtime Presence** para rastrear presença de usuários conectados.

**Como funciona:**
1. Usuário faz login → registra presença no canal "online-users"
2. Supabase mantém lista de usuários ativos
3. Usuário fecha aba/logout → remove automaticamente
4. Todos conectados recebem updates em tempo real (WebSocket)

### Implementação

**Novo Hook: `src/hooks/usePresence.ts`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export interface OnlineUser {
  userId: string
  onlineAt: string
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('online-users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state).flatMap(key =>
          state[key].map((presence: any) => presence.user_id)
        )
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  return { onlineUsers }
}
```

**Novo Componente: `src/components/presence/OnlineUsersSidebar.tsx`**

```typescript
'use client'

import { usePresence } from '@/hooks/usePresence'
import { useUsers } from '@/hooks/useUsers'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Circle } from 'lucide-react'

export function OnlineUsersSidebar() {
  const { onlineUsers } = usePresence()
  const { users } = useUsers()

  const onlineUsersList = users?.filter(u => onlineUsers.includes(u.id)) || []

  return (
    <div className="p-4 border-t border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-semibold text-zinc-400">
          Online agora ({onlineUsersList.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {onlineUsersList.length > 0 ? (
          onlineUsersList.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user.sector}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-500 text-center py-4">
            Nenhum usuário online
          </p>
        )}
      </div>
    </div>
  )
}
```

**Integração:**

Adicionar no layout da dashboard (sidebar):

```typescript
// src/components/layout/DashboardSidebar.tsx (ou equivalente)
import { OnlineUsersSidebar } from '@/components/presence/OnlineUsersSidebar'

// No final da sidebar, antes do </div> de fechamento:
<OnlineUsersSidebar />
```

**Arquivos Criados:**
- `src/hooks/usePresence.ts`
- `src/components/presence/OnlineUsersSidebar.tsx`

**Arquivos Modificados:**
- `src/components/layout/DashboardSidebar.tsx` (ou similar)

**Dependências:**
- Supabase Realtime já está configurado no projeto

---

## 5. Feature: Agenda Integrada com Tasks/Tickets

### Requisito

Permitir vincular tasks ou tickets existentes a eventos da agenda.

### Arquitetura

Adicionar campos opcionais `linked_task_id` e `linked_ticket_id` na tabela `calendar_events`.

**Regra de negócio:** Um evento pode ter NO MÁXIMO uma task OU um ticket vinculado (não ambos).

### Implementação

**Migration SQL: `docs/supabase-migrations/011_agenda_integrada.sql`**

```sql
-- Adicionar campos de vínculo
ALTER TABLE calendar_events
ADD COLUMN linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN linked_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

-- Constraint: apenas um vínculo por evento
ALTER TABLE calendar_events
ADD CONSTRAINT check_single_link
CHECK (
  (linked_task_id IS NULL AND linked_ticket_id IS NULL) OR
  (linked_task_id IS NOT NULL AND linked_ticket_id IS NULL) OR
  (linked_task_id IS NULL AND linked_ticket_id IS NOT NULL)
);

-- Índices para performance
CREATE INDEX idx_calendar_events_linked_task ON calendar_events(linked_task_id);
CREATE INDEX idx_calendar_events_linked_ticket ON calendar_events(linked_ticket_id);
```

**Atualizar Type: `src/types/calendar.ts`**

```typescript
export interface CalendarEvent {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  type: 'personal' | 'sector' | 'company'
  location?: string
  attendees: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  // Novos campos:
  linkedTaskId?: string
  linkedTicketId?: string
}
```

**Atualizar Hook: `src/hooks/useCalendar.ts`**

```typescript
// No createEvent, adicionar campos:
const { data, error } = await supabase
  .from('calendar_events')
  .insert({
    // ... campos existentes
    linked_task_id: event.linkedTaskId || null,
    linked_ticket_id: event.linkedTicketId || null,
  })

// No mapping de retorno:
linkedTaskId: data.linked_task_id || undefined,
linkedTicketId: data.linked_ticket_id || undefined,
```

**Melhorar Modal: `src/components/calendar/CreateEventModal.tsx`**

```typescript
// Adicionar imports
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// No componente:
export function CreateEventModal({ ... }) {
  // ... estados existentes

  // Novos estados para vinculação
  const [linkType, setLinkType] = useState<'none' | 'task' | 'ticket'>('none')
  const [selectedTaskId, setSelectedTaskId] = useState<string>()
  const [selectedTicketId, setSelectedTicketId] = useState<string>()

  const { tasks } = useTasks()
  const { tickets } = useTickets()

  const handleSave = () => {
    onSave({
      // ... campos existentes
      linkedTaskId: linkType === 'task' ? selectedTaskId : undefined,
      linkedTicketId: linkType === 'ticket' ? selectedTicketId : undefined,
    })
    handleReset()
    onClose()
  }

  // No JSX, adicionar antes dos Participantes:
  return (
    <PremiumModal>
      {/* ... campos existentes ... */}

      {/* Nova seção de vinculação */}
      <motion.div variants={itemVariants}>
        <Label className="text-sm font-medium mb-2 block">
          Vincular a (opcional)
        </Label>
        <Tabs value={linkType} onValueChange={(v) => setLinkType(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="none">Nenhum</TabsTrigger>
            <TabsTrigger value="task">Tarefa</TabsTrigger>
            <TabsTrigger value="ticket">Ticket</TabsTrigger>
          </TabsList>

          {linkType === 'task' && (
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione uma tarefa" />
              </SelectTrigger>
              <SelectContent>
                {tasks.filter(t => t.status !== 'done').map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    📋 {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {linkType === 'ticket' && (
            <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione um ticket" />
              </SelectTrigger>
              <SelectContent>
                {tickets.filter(t => t.status !== 'completed').map(ticket => (
                  <SelectItem key={ticket.id} value={ticket.id}>
                    🎫 {ticket.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Tabs>
      </motion.div>

      {/* ... resto do modal ... */}
    </PremiumModal>
  )
}
```

**Melhorar Visualização de Eventos**

Adicionar badges nos eventos para indicar vínculo:

```typescript
// Nos componentes WeekView, MonthView, DayView, AgendaView:
{event.linkedTaskId && (
  <Badge className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
    📋 Tarefa
  </Badge>
)}
{event.linkedTicketId && (
  <Badge className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
    🎫 Ticket
  </Badge>
)}
```

**Arquivos Criados:**
- `docs/supabase-migrations/011_agenda_integrada.sql`

**Arquivos Modificados:**
- `src/types/calendar.ts`
- `src/hooks/useCalendar.ts`
- `src/components/calendar/CreateEventModal.tsx`
- `src/components/calendar/WeekView.tsx`
- `src/components/calendar/MonthView.tsx`
- `src/components/calendar/DayView.tsx`
- `src/components/calendar/AgendaView.tsx`

### Benefícios

1. **Contexto imediato:** "Essa reunião é sobre qual ticket?"
2. **Planejamento visual:** Ver todas as reuniões relacionadas a uma task
3. **Rastreabilidade:** Histórico completo de quando discutiu-se cada item
4. **Filtros futuros:** Filtrar agenda por task/ticket específico

---

## Arquivos Críticos a Modificar

### Bugs (Alta Prioridade)
1. `src/app/(dashboard)/calendar/page.tsx` - Fix handleCreateEvent
2. `src/app/(dashboard)/tickets/page.tsx` - Fix handleCreateTicket
3. `src/components/tasks/PremiumKanbanBoard.tsx` - Fix drag & drop

### Novas Features
4. `src/hooks/usePresence.ts` - Novo hook de presença
5. `src/components/presence/OnlineUsersSidebar.tsx` - Novo componente
6. `src/types/calendar.ts` - Adicionar campos de vínculo
7. `src/hooks/useCalendar.ts` - Suporte a vínculos
8. `src/components/calendar/CreateEventModal.tsx` - UI de vinculação
9. `docs/supabase-migrations/011_agenda_integrada.sql` - Nova migration

---

## Ordem de Implementação Recomendada

### Fase 1: Correção de Bugs (1-2 horas)
1. ✅ Fix cadastro de eventos (simples)
2. ✅ Fix cadastro de tickets (simples)
3. ✅ Fix drag & drop Kanban (médio)

### Fase 2: Status Online (2-3 horas)
4. ✅ Criar hook usePresence
5. ✅ Criar componente OnlineUsersSidebar
6. ✅ Integrar na sidebar do dashboard

### Fase 3: Agenda Integrada (3-4 horas)
7. ✅ Criar migration SQL
8. ✅ Atualizar types e hook useCalendar
9. ✅ Melhorar CreateEventModal com vinculação
10. ✅ Adicionar badges nos componentes de visualização

**Tempo Total Estimado:** 6-9 horas

---

## Riscos e Mitigações

### Risco 1: Drag & drop ainda não funcionar
**Mitigação:** Adicionar logs extensivos no handleDragEnd para debug. Se necessário, usar biblioteca alternativa (react-beautiful-dnd).

### Risco 2: Presence API exceder limites do Supabase free tier
**Mitigação:** Supabase Realtime tem limite generoso. Em produção, considerar desconectar após 30min de inatividade.

### Risco 3: Performance com muitos eventos vinculados
**Mitigação:** Índices já criados na migration. Se necessário, implementar paginação nos selects.

---

## Testes Manuais Requeridos

### Bug Fixes
- [ ] Criar evento na agenda → Verificar que aparece imediatamente
- [ ] Criar ticket → Verificar que aparece na lista
- [ ] Arrastar task entre colunas → Verificar que move e persiste

### Status Online
- [ ] Login em 2 navegadores → Verificar lista atualiza
- [ ] Fechar uma aba → Verificar que remove da lista
- [ ] Verificar performance com 20+ usuários online

### Agenda Integrada
- [ ] Criar evento vinculado a task → Verificar badge azul
- [ ] Criar evento vinculado a ticket → Verificar badge laranja
- [ ] Deletar task vinculada → Verificar evento mantém mas remove vínculo
- [ ] Filtrar tasks pendentes no select → Verificar apenas não-concluídas aparecem

---

## Documentação Adicional

Após implementação, atualizar:
- `CLAUDE.md` - Adicionar info sobre presença e vínculos de agenda
- `docs/testing/notifications-manual-test.md` - Adicionar casos de teste

---

**Aprovado por:** Usuário (via validação no brainstorming)
**Data de Aprovação:** 2026-01-06
**Pronto para Implementação:** ✅ Sim
