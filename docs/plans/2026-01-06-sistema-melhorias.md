# Sistema de Melhorias - Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir 3 bugs críticos (eventos, tickets, kanban) e implementar 2 features (status online, agenda integrada)

**Architecture:** Bug fixes são mudanças pontuais em handlers. Features usam Supabase Realtime Presence e campos relacionais.

**Tech Stack:** Next.js 14, TypeScript, Supabase, dnd-kit, Shadcn UI

---

## Phase 1: Bug Fixes (High Priority)

### Task 1: Fix Calendar Event Creation

**Goal:** Eventos devem aparecer na agenda após criação

**Files:**
- Modify: `src/app/(dashboard)/calendar/page.tsx:94-107`

**Step 1: Add toast import**

```typescript
// No topo do arquivo, adicionar:
import { toast } from 'sonner'
```

**Step 2: Verify createEvent is available from hook**

Check that line 14-17 has:
```typescript
const {
  events,
  getEventsByType,
} = useCalendar()
```

Add `createEvent` to destructuring:
```typescript
const {
  events,
  getEventsByType,
  createEvent, // ← Add this
} = useCalendar()
```

**Step 3: Replace handleCreateEvent with working implementation**

Replace lines 94-107:
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
      type: 'personal',
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

**Step 4: Test creating an event**

1. Run dev server: `npm run dev`
2. Navigate to `/calendar`
3. Click on a time slot to open modal
4. Fill form and click "Criar evento"
5. Expected: Event appears in calendar immediately + success toast

**Step 5: Commit**

```bash
git add src/app/(dashboard)/calendar/page.tsx
git commit -m "fix(calendar): implement handleCreateEvent to save events to database

- Add async/await to createEvent hook call
- Parse time strings and combine with date
- Add error handling with toast notifications
- Fixes issue where events were not persisting"
```

---

### Task 2: Fix Ticket Creation

**Goal:** Tickets devem aparecer na lista após criação

**Files:**
- Modify: `src/app/(dashboard)/tickets/page.tsx:52-59`

**Step 1: Add useAuth hook import**

At top of file, verify `useAuth` is imported:
```typescript
import { useAuth } from '@/hooks/useAuth'
```

**Step 2: Extract user from useAuth hook**

After line 26, add:
```typescript
const { user } = useAuth()
```

**Step 3: Make handleCreateTicket async**

Replace lines 52-59:
```typescript
const handleCreateTicket = async (data: CreateTicketInput) => {
  if (!user) {
    toast.error('Usuário não autenticado')
    return
  }

  try {
    await createTicket({
      ...data,
      status: 'open',
      requester: user.id,
    })
    toast.success('Ticket criado com sucesso!')
  } catch (error) {
    console.error('Erro ao criar ticket:', error)
    toast.error('Erro ao criar ticket')
  }
}
```

**Step 4: Test creating a ticket**

1. Navigate to `/tickets`
2. Click "Novo Ticket"
3. Fill form and submit
4. Expected: Ticket appears in list immediately + success toast

**Step 5: Commit**

```bash
git add src/app/(dashboard)/tickets/page.tsx
git commit -m "fix(tickets): await createTicket promise before showing success

- Make handleCreateTicket async
- Add await to createTicket call
- Use authenticated user ID instead of hardcoded string
- Add error handling
- Fixes race condition where toast showed before DB insert"
```

---

### Task 3: Fix Kanban Drag & Drop

**Goal:** Cards devem soltar em colunas de destino

**Files:**
- Modify: `src/components/tasks/PremiumKanbanBoard.tsx:15,230`
- Modify: `src/components/tasks/PremiumTaskCard.tsx:27`

**Step 1: Change collision detection algorithm**

In `PremiumKanbanBoard.tsx`, line 15:
```typescript
// Change from:
import { closestCorners } from "@dnd-kit/core"

// To:
import { closestCenter } from "@dnd-kit/core"
```

Line 230:
```typescript
<DndContext
    sensors={sensors}
    collisionDetection={closestCenter} // ← Change from closestCorners
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
    onDragEnd={handleDragEnd}
>
```

**Step 2: Add debug metadata to sortable**

In `PremiumTaskCard.tsx`, line 27:
```typescript
const { ... } = useSortable({
    id: task.id,
    data: {
        task,
        type: 'task'
    }
})
```

**Step 3: Test drag & drop**

1. Navigate to `/tasks`
2. Switch to Board View
3. Try dragging a card from "A Fazer" to "Em Progresso"
4. Expected: Card moves smoothly and stays in new column
5. Refresh page
6. Expected: Card remains in new column (persisted)

**Step 4: Commit**

```bash
git add src/components/tasks/PremiumKanbanBoard.tsx src/components/tasks/PremiumTaskCard.tsx
git commit -m "fix(kanban): improve drag & drop collision detection

- Change from closestCorners to closestCenter algorithm
- Add task metadata to sortable for better debugging
- Improves drop zone detection for side-by-side columns
- Fixes issue where cards couldn't be dropped in target column"
```

---

## Phase 2: Status Online Feature

### Task 4: Create usePresence Hook

**Goal:** Hook para rastrear usuários online via Supabase Realtime

**Files:**
- Create: `src/hooks/usePresence.ts`

**Step 1: Create hook file with imports**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
```

**Step 2: Add interfaces**

```typescript
export interface OnlineUser {
  userId: string
  onlineAt: string
}
```

**Step 3: Implement usePresence hook**

```typescript
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

**Step 4: Test hook in console**

1. Open browser console
2. Import and test: `const { onlineUsers } = usePresence()`
3. Expected: Hook returns array of user IDs

**Step 5: Commit**

```bash
git add src/hooks/usePresence.ts
git commit -m "feat(presence): add usePresence hook for real-time online status

- Uses Supabase Realtime Presence API
- Tracks user connection/disconnection automatically
- Returns array of online user IDs
- Auto-cleanup on unmount"
```

---

### Task 5: Create OnlineUsersSidebar Component

**Goal:** Componente visual para mostrar usuários online

**Files:**
- Create: `src/components/presence/OnlineUsersSidebar.tsx`

**Step 1: Create component file with imports**

```typescript
'use client'

import { usePresence } from '@/hooks/usePresence'
import { useUsers } from '@/hooks/useUsers'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Circle } from 'lucide-react'
```

**Step 2: Implement component**

```typescript
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

**Step 3: Commit**

```bash
git add src/components/presence/OnlineUsersSidebar.tsx
git commit -m "feat(presence): add OnlineUsersSidebar component

- Displays list of currently online users
- Shows avatar, name, and sector
- Green pulse indicator for online status
- Scrollable list with max height
- Empty state when no users online"
```

---

### Task 6: Integrate OnlineUsersSidebar

**Goal:** Adicionar componente na sidebar do dashboard

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (ou arquivo de sidebar do projeto)

**Step 1: Find sidebar component**

```bash
# Search for sidebar file
npx glob "**/*sidebar*.tsx" --ignore node_modules
```

**Step 2: Add import**

```typescript
import { OnlineUsersSidebar } from '@/components/presence/OnlineUsersSidebar'
```

**Step 3: Add component at bottom of sidebar**

Find the closing `</div>` of the sidebar and add before it:
```typescript
      {/* Existing sidebar content */}

      {/* Online Users */}
      <OnlineUsersSidebar />
    </div>
```

**Step 4: Test presence feature**

1. Open app in two browsers (Chrome + Firefox)
2. Login with different users
3. Expected: Both should appear in "Online agora" list
4. Close one tab
5. Expected: User disappears from list in other browser

**Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(presence): integrate OnlineUsersSidebar into dashboard

- Add OnlineUsersSidebar at bottom of main sidebar
- Real-time updates when users connect/disconnect
- Completes presence feature implementation"
```

---

## Phase 3: Agenda Integrada Feature

### Task 7: Create Database Migration

**Goal:** Adicionar campos de vínculo na tabela calendar_events

**Files:**
- Create: `docs/supabase-migrations/011_agenda_integrada.sql`

**Step 1: Create migration file**

```sql
-- Migration: Agenda Integrada com Tasks/Tickets
-- Data: 2026-01-06
-- Descrição: Adiciona campos para vincular eventos a tasks ou tickets

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

-- Comentários
COMMENT ON COLUMN calendar_events.linked_task_id IS 'ID da tarefa vinculada (opcional)';
COMMENT ON COLUMN calendar_events.linked_ticket_id IS 'ID do ticket vinculado (opcional)';
COMMENT ON CONSTRAINT check_single_link ON calendar_events IS 'Garante que evento tenha no máximo uma task OU um ticket vinculado';
```

**Step 2: Apply migration to Supabase**

Run via Supabase Dashboard SQL Editor or CLI:
```bash
# If using Supabase CLI:
supabase db push
```

**Step 3: Verify migration**

Check in Supabase Dashboard:
- Table `calendar_events` has new columns
- Constraints are active
- Indexes were created

**Step 4: Commit**

```bash
git add docs/supabase-migrations/011_agenda_integrada.sql
git commit -m "feat(calendar): add database migration for task/ticket links

- Add linked_task_id and linked_ticket_id columns
- Add constraint to allow only one link per event
- Add indexes for query performance
- ON DELETE SET NULL prevents orphaned events"
```

---

### Task 8: Update CalendarEvent Type

**Goal:** Adicionar campos de vínculo no tipo TypeScript

**Files:**
- Modify: `src/types/calendar.ts`

**Step 1: Add fields to CalendarEvent interface**

Find the `CalendarEvent` interface and add:
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

**Step 2: Commit**

```bash
git add src/types/calendar.ts
git commit -m "feat(calendar): add link fields to CalendarEvent type

- Add optional linkedTaskId field
- Add optional linkedTicketId field
- Supports upcoming agenda integration feature"
```

---

### Task 9: Update useCalendar Hook

**Goal:** Suportar leitura/escrita de vínculos no hook

**Files:**
- Modify: `src/hooks/useCalendar.ts`

**Step 1: Update createEvent to save links**

In `createEvent` function (around line 116), update insert:
```typescript
const { data, error } = await supabase
  .from('calendar_events')
  .insert({
    title: event.title,
    description: event.description,
    start_time: event.startTime.toISOString(),
    end_time: event.endTime.toISOString(),
    type: event.type,
    location: event.location,
    attendees: event.attendees || [],
    created_by: user.id,
    linked_task_id: event.linkedTaskId || null,  // ← Add
    linked_ticket_id: event.linkedTicketId || null,  // ← Add
  })
```

**Step 2: Update mapping to read links**

In both `fetchEvents` (line 45) and `createEvent` (line 133), add to mapping:
```typescript
linkedTaskId: data.linked_task_id || undefined,
linkedTicketId: data.linked_ticket_id || undefined,
```

**Step 3: Update updateEvent to handle links**

In `updateEvent` function (around line 156):
```typescript
const { data, error } = await supabase
  .from('calendar_events')
  .update({
    title: updates.title,
    description: updates.description,
    start_time: updates.startTime?.toISOString(),
    end_time: updates.endTime?.toISOString(),
    type: updates.type,
    location: updates.location,
    attendees: updates.attendees,
    linked_task_id: updates.linkedTaskId || null,  // ← Add
    linked_ticket_id: updates.linkedTicketId || null,  // ← Add
  })
```

And in the mapping (line 183):
```typescript
linkedTaskId: data.linked_task_id || undefined,
linkedTicketId: data.linked_ticket_id || undefined,
```

**Step 4: Commit**

```bash
git add src/hooks/useCalendar.ts
git commit -m "feat(calendar): support task/ticket links in useCalendar hook

- Update createEvent to save linkedTaskId and linkedTicketId
- Update fetchEvents to read links from database
- Update updateEvent to handle link changes
- Map snake_case DB fields to camelCase TS fields"
```

---

### Task 10: Update CreateEventModal UI

**Goal:** Adicionar interface para vincular tasks/tickets

**Files:**
- Modify: `src/components/calendar/CreateEventModal.tsx`

**Step 1: Add imports**

At top of file:
```typescript
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
```

**Step 2: Add state and hooks**

After existing state declarations (around line 89):
```typescript
// Estados para vinculação
const [linkType, setLinkType] = useState<'none' | 'task' | 'ticket'>('none')
const [selectedTaskId, setSelectedTaskId] = useState<string>()
const [selectedTicketId, setSelectedTicketId] = useState<string>()

const { tasks } = useTasks()
const { tickets } = useTickets()
```

**Step 3: Update handleSave**

Replace `handleSave` function (around line 113):
```typescript
const handleSave = () => {
  onSave({
    title,
    date,
    startTime,
    endTime,
    location: location || undefined,
    tags: selectedTags,
    attendees: selectedAttendees,
    linkedTaskId: linkType === 'task' ? selectedTaskId : undefined,
    linkedTicketId: linkType === 'ticket' ? selectedTicketId : undefined,
  })
  handleReset()
  onClose()
}
```

**Step 4: Update handleReset**

Add to `handleReset` (around line 127):
```typescript
const handleReset = () => {
  setTitle('')
  setStartTime('09:00')
  setEndTime('10:00')
  setLocation('')
  setSelectedTags([])
  setSelectedAttendees([])
  setLinkType('none')  // ← Add
  setSelectedTaskId(undefined)  // ← Add
  setSelectedTicketId(undefined)  // ← Add
}
```

**Step 5: Add UI section for links**

In the JSX, before the Attendees section (around line 264), add:
```typescript
          {/* Vincular a Task/Ticket */}
          <motion.div variants={itemVariants}>
            <Label className="text-sm font-medium mb-2 block">
              Vincular a (opcional)
            </Label>
            <Tabs value={linkType} onValueChange={(v) => setLinkType(v as 'none' | 'task' | 'ticket')}>
              <TabsList className="grid w-full grid-cols-3 bg-zinc-800 border-zinc-700">
                <TabsTrigger value="none">Nenhum</TabsTrigger>
                <TabsTrigger value="task">Tarefa</TabsTrigger>
                <TabsTrigger value="ticket">Ticket</TabsTrigger>
              </TabsList>

              {linkType === 'task' && (
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="mt-2 bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Selecione uma tarefa" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
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
                  <SelectTrigger className="mt-2 bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Selecione um ticket" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
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
```

**Step 6: Test link UI**

1. Navigate to `/calendar`
2. Open create event modal
3. Switch between "Nenhum", "Tarefa", "Ticket" tabs
4. Expected: Dropdowns show when task/ticket tab selected
5. Select a task and create event
6. Check database to verify `linked_task_id` was saved

**Step 7: Commit**

```bash
git add src/components/calendar/CreateEventModal.tsx
git commit -m "feat(calendar): add task/ticket linking UI to CreateEventModal

- Add tabs for None/Task/Ticket selection
- Add dropdowns to select existing tasks/tickets
- Filter out completed items from selects
- Include link IDs in onSave callback
- Reset link state when modal closes"
```

---

### Task 11: Add Link Badges to Event Views

**Goal:** Mostrar badges nos eventos para indicar vínculos

**Files:**
- Modify: `src/components/calendar/WeekView.tsx`
- Modify: `src/components/calendar/MonthView.tsx`
- Modify: `src/components/calendar/DayView.tsx`
- Modify: `src/components/calendar/AgendaView.tsx`

**Step 1: Add Badge import to each view**

```typescript
import { Badge } from '@/components/ui/badge'
```

**Step 2: Add badge rendering in WeekView**

Find where events are rendered (likely in a map function), add after event title:
```typescript
{event.linkedTaskId && (
  <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 px-1.5 py-0">
    📋
  </Badge>
)}
{event.linkedTicketId && (
  <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30 px-1.5 py-0">
    🎫
  </Badge>
)}
```

**Step 3: Repeat for MonthView**

Same badge code as WeekView

**Step 4: Repeat for DayView**

Same badge code as WeekView

**Step 5: Repeat for AgendaView**

Same badge code as WeekView

**Step 6: Test badges**

1. Create event linked to a task
2. Expected: Blue badge with 📋 appears on event
3. Create event linked to a ticket
4. Expected: Orange badge with 🎫 appears on event
5. Create normal event
6. Expected: No badge appears

**Step 7: Commit**

```bash
git add src/components/calendar/WeekView.tsx src/components/calendar/MonthView.tsx src/components/calendar/DayView.tsx src/components/calendar/AgendaView.tsx
git commit -m "feat(calendar): add visual badges for linked tasks/tickets

- Add blue badge (📋) for events linked to tasks
- Add orange badge (🎫) for events linked to tickets
- Apply to all calendar views (Week, Month, Day, Agenda)
- Small badge size to not clutter UI"
```

---

## Phase 4: Final Testing & Documentation

### Task 12: Run Complete Test Suite

**Goal:** Verificar que todas as melhorias funcionam corretamente

**Files:**
- None (testing only)

**Step 1: Test Bug Fixes**

Run through checklist:
- [ ] Create event in calendar → appears immediately
- [ ] Create ticket → appears in list
- [ ] Drag task between kanban columns → moves and persists

**Step 2: Test Presence Feature**

- [ ] Login in 2 browsers → both appear in "Online agora"
- [ ] Close one tab → user disappears from list
- [ ] Wait 30s → verify presence persists

**Step 3: Test Agenda Integration**

- [ ] Create event linked to task → blue badge appears
- [ ] Create event linked to ticket → orange badge appears
- [ ] Verify only non-completed tasks appear in dropdown
- [ ] Verify only non-completed tickets appear in dropdown
- [ ] Check database: `linked_task_id` and `linked_ticket_id` saved correctly

**Step 4: Document any issues**

If any test fails, create a note in:
```
docs/testing/2026-01-06-melhorias-issues.md
```

---

### Task 13: Update Documentation

**Goal:** Atualizar documentação do projeto

**Files:**
- Modify: `vibeoffice/CLAUDE.md`
- Modify: `docs/testing/notifications-manual-test.md`

**Step 1: Update CLAUDE.md with new features**

Add section about presence:
```markdown
### Presença Online

O sistema rastreia automaticamente usuários online via Supabase Realtime Presence:
- Hook: `usePresence()` retorna `onlineUsers: string[]`
- Componente: `OnlineUsersSidebar` na sidebar principal
- Auto-tracking: Usuário é registrado ao fazer login
- Auto-cleanup: Removido ao fazer logout ou fechar aba
```

Add section about calendar links:
```markdown
### Agenda Integrada

Eventos podem ser vinculados a tasks ou tickets:
- Campos DB: `linked_task_id`, `linked_ticket_id` (mutuamente exclusivos)
- UI: Tabs no CreateEventModal para selecionar vínculo
- Visual: Badges azuis (📋) para tasks, laranjas (🎫) para tickets
- Filtros: Apenas items não-concluídos aparecem nos selects
```

**Step 2: Update test document**

Add test cases to `notifications-manual-test.md`:
```markdown
## Presença Online
- [ ] Usuário aparece em "Online agora" ao fazer login
- [ ] Usuário desaparece ao fazer logout
- [ ] Lista atualiza em tempo real em múltiplas abas

## Agenda Integrada
- [ ] Criar evento vinculado a task exibe badge azul
- [ ] Criar evento vinculado a ticket exibe badge laranja
- [ ] Deletar task vinculada não quebra evento
```

**Step 3: Commit**

```bash
git add vibeoffice/CLAUDE.md docs/testing/notifications-manual-test.md
git commit -m "docs: update documentation for new features

- Document usePresence hook and OnlineUsersSidebar component
- Document calendar task/ticket linking feature
- Add test cases for presence and agenda integration
- Update CLAUDE.md with architecture notes"
```

---

## Final Commit: Release

**Step 1: Verify all tests pass**

Go through all checkboxes from Task 12.

**Step 2: Create final commit**

```bash
git add -A
git commit -m "release: sistema de melhorias v1.0

Implemented 5 critical improvements:

Bug Fixes:
- Calendar events now save to database and appear immediately
- Tickets creation properly awaits database insert
- Kanban drag & drop now works correctly between columns

New Features:
- Real-time online user presence tracking in sidebar
- Calendar events can be linked to tasks or tickets

Technical Details:
- Added Supabase Realtime Presence integration
- Database migration for calendar_events link fields
- Improved dnd-kit collision detection for Kanban
- Comprehensive error handling and user feedback

Testing: All manual test cases passing
Documentation: Updated CLAUDE.md and test docs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 13
**Estimated Time:** 6-9 hours
**Commits:** 13+ (one per step where specified)

**Key Principles Applied:**
- ✅ DRY: Reused badge code pattern across views
- ✅ YAGNI: No over-engineering, just what's needed
- ✅ Frequent commits: After each logical step
- ✅ Error handling: Try/catch + toast notifications
- ✅ TypeScript safety: Proper types throughout

**Files Created:** 4
**Files Modified:** 13

**Risk Mitigation:**
- Drag & drop has fallback debugging data
- Presence has auto-cleanup to prevent leaks
- Calendar links use ON DELETE SET NULL for safety
