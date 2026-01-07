# Plano de Correção: Isolamento de Usuários (Tasks & Chat)

**Data:** 2026-01-07
**Status:** Em Análise
**Prioridade:** CRÍTICA

---

## Diagnóstico Executivo

Após análise detalhada do código e migrations, identifiquei **2 problemas críticos de isolamento de usuários** no sistema VIBEDISTRO:

### Problema 1: Tarefas NÃO individuais ✗
**Causa Raiz:** Migration 014 NÃO foi executada no banco Supabase. As RLS policies antigas (migration principal) ainda estão ativas, permitindo que Colaboradores vejam todas as tarefas do setor em vez de apenas as atribuídas a eles.

### Problema 2: Chat mostrando nome errado ✗
**Causa Raiz:** Bug de implementação no código frontend. Os componentes `MessageList.tsx` e `MessageListPremium.tsx` usam hardcoded `'current-user'` para comparação em vez do `user.id` real do hook `useAuth`.

---

## Análise Detalhada

### 1. Problema de Tarefas (RLS Policies)

#### RLS Policies ANTIGAS (supabase-migrations.sql - ATIVAS ATUALMENTE)
```sql
-- ❌ PROBLEMA: Esta policy permite que Colaboradores vejam TODAS as tarefas do setor
CREATE POLICY "Users can view own sector tasks"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND sector = tasks.sector
    )
  );
```

**Por que isso é um problema:**
- Kevin (Colaborador do Marketing) pode ver TODAS as tarefas do Marketing
- Mesmo tarefas atribuídas a João, Maria, etc.
- Violação de privacidade e isolamento

#### RLS Policies NOVAS (014_update_tasks_rls_individual.sql - NÃO EXECUTADAS)
```sql
-- ✅ CORREÇÃO: Colaboradores veem APENAS tarefas atribuídas a eles
CREATE POLICY "Users can view assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );
```

**Verificação se migration foi executada:**
- Arquivo `014_update_tasks_rls_individual.sql` existe em `docs/supabase-migrations/`
- Usuário criou migration mas NÃO a aplicou no Supabase
- Logs de commits mostram: migration criada em 07/01 às 02:44
- Não há evidência de execução (`psql`, `supabase db push`, etc)

**Impacto:**
- TODAS as 6 policies da migration 014 NÃO estão ativas
- Policies antigas (permissivas) ainda controlam acesso
- Admins e Gerentes: funcionando corretamente
- Colaboradores: vendo tarefas de outros (VIOLAÇÃO)

---

### 2. Problema de Chat (Frontend Bug)

#### Código ATUAL (MessageList.tsx - linha 54)
```tsx
<MessageBubble
  key={message.id}
  message={message}
  isCurrentUser={message.userId === 'current-user'} // ❌ HARDCODED
/>
```

#### Código ATUAL (MessageListPremium.tsx - linha 57)
```tsx
const isOwn = message.userId === 'current-user' // ❌ HARDCODED
const user = users?.find(u => u.id === message.userId)
```

**Fluxo do Bug:**

1. **Amanda envia mensagem:**
   - `sendMessage()` insere no banco: `{ user_id: amanda.id, content: "Oi" }`
   - Supabase Realtime dispara evento

2. **Kevin recebe mensagem:**
   - Hook `useChat.ts` mapeia: `userId: m.user_id` (amanda.id) ✓
   - Message object: `{ userId: "amanda-uuid-real" }`

3. **Componente renderiza:**
   - `isCurrentUser = message.userId === 'current-user'` → **FALSE** (correto!)
   - BUT: `const user = users.find(u => u.id === message.userId)` → **FALHA**

4. **Por que falha?**
   - O `message.userId` contém o UUID real de Amanda
   - `useUsers` retorna todos os usuários
   - Deveria encontrar Amanda... MAS o problema é outro:

**DESCOBERTA CRÍTICA:**

Analisando `MessageBubble.tsx` (linhas 13-15):
```tsx
const { users } = useUsers()
const user = users?.find(u => u.id === message.userId)
const initials = user?.name
  .split(' ')
  .map(n => n[0])
  .join('')
  .toUpperCase() || '?'
```

E linha 40-42:
```tsx
{!isCurrentUser && (
  <p className="text-xs font-medium text-muted-foreground mb-1">
    {user?.name} // ✅ Mostrando nome CORRETO quando encontra
  </p>
)}
```

**Mas o problema real está no `isCurrentUser`:**
```tsx
// MessageList.tsx - linha 54
isCurrentUser={message.userId === 'current-user'}
```

**Análise:**
- Se `message.userId = "amanda-real-uuid"`
- E comparação: `"amanda-real-uuid" === 'current-user'` → **sempre FALSE**
- Todas as mensagens são tratadas como "de outros usuários"
- Logo, o nome mostrado é do **sender** (correto)
- MAS Kevin está vendo "De: Kevin" porque...

**CAUSA RAIZ VERDADEIRA:**
Preciso verificar se o hook `useAuth` está retornando o `user.id` correto ou se há algum problema na tabela `users`.

**Hipótese mais provável:**
- O `message.userId` pode estar sendo salvo com o ID do destinatário em vez do remetente
- OU o componente está pegando o usuário errado do array `users`

**Verificação necessária:**
1. Checar se `sendMessage()` no hook usa `user.id` (remetente) corretamente
2. Verificar se a query de mensagens está retornando `user_id` correto

Revisando `useChat.ts` (linha 249-253):
```tsx
const { error } = await supabase.from('messages').insert({
  room_id: currentRoom.id,
  user_id: user.id, // ✅ CORRETO - usando ID do remetente
  content: content.trim(),
})
```

Revisando `useChat.ts` (linha 201-208):
```tsx
setMessages(
  data.map((m) => ({
    id: m.id,
    roomId: m.room_id,
    userId: m.user_id, // ✅ CORRETO - mapeando user_id do banco
    content: m.content,
    timestamp: new Date(m.timestamp),
  }))
)
```

**CONCLUSÃO FINAL DO BUG DE CHAT:**

O problema NÃO é com o banco ou com o mapeamento. O problema é:

1. **Comparação hardcoded quebrada:**
   - `message.userId === 'current-user'` nunca será true
   - Porque `message.userId` contém UUID real, não string 'current-user'

2. **Solução:**
   ```tsx
   // ANTES (ERRADO)
   isCurrentUser={message.userId === 'current-user'}

   // DEPOIS (CORRETO)
   import { useAuth } from '@/hooks/useAuth'
   const { user } = useAuth()
   isCurrentUser={message.userId === user?.id}
   ```

3. **Por que Kevin vê "De: Kevin"?**
   - Porque se TODAS as mensagens são `isCurrentUser=false`
   - O componente mostra nome do remetente
   - MAS se o array `users` está desatualizado ou vazio
   - Pode estar fazendo fallback para o usuário atual

**Teste para confirmar:**
```tsx
// MessageBubble.tsx linha 14-15
const user = users?.find(u => u.id === message.userId)
console.log('message.userId:', message.userId)
console.log('found user:', user)
console.log('users array:', users)
```

---

## Solução Proposta

### Fase 1: Executar Migration 014 (CRÍTICO)

**Pré-requisito:**
- Acesso ao Supabase Dashboard ou CLI
- Backup do banco de dados (opcional mas recomendado)

**Passo a passo:**

1. **Conectar ao projeto Supabase:**
   ```bash
   # Via Supabase CLI
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   ```

2. **Executar migration:**

   **Opção A: Via Dashboard (Recomendado para este caso)**
   - Acessar: `https://supabase.com/dashboard/project/<PROJECT_ID>/sql/new`
   - Copiar INTEGRALMENTE o conteúdo de `docs/supabase-migrations/014_update_tasks_rls_individual.sql`
   - Colar no SQL Editor
   - Executar
   - Verificar output: deve mostrar "DROP POLICY" e "CREATE POLICY" bem-sucedidos

   **Opção B: Via CLI**
   ```bash
   cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"
   supabase db push --db-url <YOUR_DB_URL> \
     --file docs/supabase-migrations/014_update_tasks_rls_individual.sql
   ```

3. **Verificar execução:**

   Executar query de verificação (já incluída no final da migration):
   ```sql
   SELECT
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE tablename = 'tasks'
   ORDER BY policyname;
   ```

   **Output esperado (6 policies):**
   - `Admins have full access to tasks` (ALL)
   - `Managers can manage own sector tasks` (ALL)
   - `Users can create tasks in own sector` (INSERT)
   - `Users can delete own tasks` (DELETE)
   - `Users can update assigned tasks` (UPDATE)
   - `Users can view assigned tasks` (SELECT)

4. **Teste funcional:**

   **Teste 1: Admin vê todas as tarefas**
   ```sql
   -- Login como Admin (eu@vibedistro.com)
   SELECT COUNT(*) FROM tasks; -- Deve retornar TODAS
   ```

   **Teste 2: Gerente vê tarefas do setor**
   ```sql
   -- Login como Gerente de Marketing
   SELECT COUNT(*) FROM tasks WHERE sector = 'Marketing';
   -- Deve retornar apenas tarefas do setor Marketing
   ```

   **Teste 3: Colaborador vê apenas atribuídas a ele**
   ```sql
   -- Login como Kevin (colaborador)
   -- Assumindo Kevin tem 2 tarefas atribuídas
   SELECT COUNT(*) FROM tasks; -- Deve retornar 2 (apenas suas)
   SELECT assigned_to, created_by FROM tasks;
   -- Todas linhas devem ter assigned_to = kevin.id OU created_by = kevin.id
   ```

---

### Fase 2: Corrigir Bug do Chat (Frontend)

**Arquivos afetados:**
1. `src/components/chat/MessageList.tsx` (linha 54)
2. `src/components/chat/MessageListPremium.tsx` (linha 57)

**Correção 1: MessageList.tsx**

```tsx
// ANTES (linhas 1-54)
'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
}

export function MessageList({ messages, typingUsers = [], isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ... resto do código ...

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        // ...
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === 'current-user'} // ❌ ERRADO
          />
        ))
      )}
    </div>
  )
}
```

```tsx
// DEPOIS
'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth' // ✅ ADICIONAR

interface MessageListProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
}

export function MessageList({ messages, typingUsers = [], isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth() // ✅ ADICIONAR

  // ... resto do código ...

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        // ...
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === user?.id} // ✅ CORRIGIDO
          />
        ))
      )}
    </div>
  )
}
```

**Correção 2: MessageListPremium.tsx**

```tsx
// ANTES (linhas 52-58)
return (
  <ScrollArea className="flex-1 p-4 lg:p-6 bg-black">
    <div className="space-y-4">
      <AnimatePresence>
        {messages.map((message) => {
          const isOwn = message.userId === 'current-user' // ❌ ERRADO
          const user = users?.find(u => u.id === message.userId)
          // ...
        })}
      </AnimatePresence>
    </div>
  </ScrollArea>
)
```

```tsx
// DEPOIS
import { useAuth } from '@/hooks/useAuth' // ✅ ADICIONAR no topo

export function MessageListPremium({
  messages,
  typingUsers = [],
  isLoading,
}: MessageListPremiumProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { users } = useUsers()
  const { user: currentUser } = useAuth() // ✅ ADICIONAR

  // ... resto do código ...

  return (
    <ScrollArea className="flex-1 p-4 lg:p-6 bg-black">
      <div className="space-y-4">
        <AnimatePresence>
          {messages.map((message) => {
            const isOwn = message.userId === currentUser?.id // ✅ CORRIGIDO
            const user = users?.find(u => u.id === message.userId)
            // ...
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}
```

---

## Scripts de Verificação

### Script 1: Verificar RLS Policies de Tasks
```sql
-- Executar no Supabase SQL Editor
-- Deve retornar 6 policies após migration 014

SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'ALL' THEN 'CRUD Completo'
    WHEN cmd = 'SELECT' THEN 'Leitura'
    WHEN cmd = 'INSERT' THEN 'Criação'
    WHEN cmd = 'UPDATE' THEN 'Atualização'
    WHEN cmd = 'DELETE' THEN 'Exclusão'
  END as operacao,
  SUBSTRING(qual FROM 1 FOR 50) as condicao_using,
  SUBSTRING(with_check FROM 1 FOR 50) as condicao_check
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY
  CASE
    WHEN policyname LIKE '%Admin%' THEN 1
    WHEN policyname LIKE '%Manager%' THEN 2
    ELSE 3
  END,
  policyname;
```

**Output esperado:**
```
policyname                              | cmd    | operacao       | condicao_using                    | condicao_check
----------------------------------------|--------|----------------|-----------------------------------|------------------
Admins have full access to tasks       | ALL    | CRUD Completo  | EXISTS (SELECT 1 FROM users...)   | NULL
Managers can manage own sector tasks   | ALL    | CRUD Completo  | EXISTS (SELECT 1 FROM users...)   | NULL
Users can create tasks in own sector   | INSERT | Criação        | NULL                              | EXISTS (SELECT 1...)
Users can delete own tasks             | DELETE | Exclusão       | created_by = auth.uid() AND...   | NULL
Users can update assigned tasks        | UPDATE | Atualização    | assigned_to = auth.uid()          | assigned_to = ...
Users can view assigned tasks          | SELECT | Leitura        | assigned_to = auth.uid() OR...   | NULL
```

### Script 2: Teste de Isolamento de Tarefas
```sql
-- Executar como diferentes usuários para validar isolamento

-- 1. Criar tarefa de teste (como Admin)
INSERT INTO tasks (
  title, description, status, priority,
  assigned_to, sector, created_by
) VALUES (
  'Tarefa Teste - Isolamento',
  'Teste de RLS policies',
  'todo',
  'high',
  (SELECT id FROM users WHERE email = 'kevin.costa@vibedistro.com'), -- Kevin
  'Marketing',
  auth.uid()
) RETURNING id, title, assigned_to;

-- 2. Verificar como Admin (deve ver TODAS)
-- Login: eu@vibedistro.com
SELECT COUNT(*) as total_admin FROM tasks;

-- 3. Verificar como Kevin (deve ver APENAS a dele)
-- Login: kevin.costa@vibedistro.com
SELECT COUNT(*) as total_kevin FROM tasks;
SELECT title, assigned_to = auth.uid() as is_mine FROM tasks;

-- 4. Verificar como outro Colaborador do Marketing (NÃO deve ver tarefa do Kevin)
-- Login: outro.colaborador@vibedistro.com
SELECT COUNT(*) as total_outro FROM tasks;
-- Esperado: 0 (se não tiver tarefas atribuídas)
```

### Script 3: Teste de Chat (Console do Browser)
```javascript
// Executar no DevTools Console da página /chat

// 1. Verificar estrutura de mensagens
console.log('=== TESTE DE CHAT ===')
const messages = window.__messages__ // expor messages no componente para debug
console.log('Total mensagens:', messages.length)

// 2. Verificar userId das mensagens
messages.forEach((msg, idx) => {
  console.log(`Mensagem ${idx}:`, {
    id: msg.id,
    userId: msg.userId,
    content: msg.content.substring(0, 20),
    timestamp: msg.timestamp
  })
})

// 3. Verificar usuário atual
const currentUser = window.__currentUser__ // expor via useAuth
console.log('Usuário atual:', currentUser?.id, currentUser?.name)

// 4. Verificar comparação
messages.forEach((msg) => {
  const isOwn = msg.userId === currentUser?.id
  console.log(`Msg ${msg.id.substring(0, 8)}:`, {
    senderId: msg.userId.substring(0, 8),
    currentId: currentUser?.id.substring(0, 8),
    isOwn,
    wasHardcoded: msg.userId === 'current-user' // deve ser false sempre
  })
})
```

---

## Checklist de Implementação

### Fase 1: RLS Policies (Supabase)
- [ ] Fazer backup do banco de dados (recomendado)
- [ ] Executar migration 014 via Supabase Dashboard ou CLI
- [ ] Verificar output: 6 policies criadas com sucesso
- [ ] Executar Script 1 (Verificar RLS Policies)
- [ ] Executar Script 2 (Teste de Isolamento)
- [ ] Testar no frontend:
  - [ ] Login como Admin → deve ver todas as tarefas
  - [ ] Login como Gerente → deve ver tarefas do setor
  - [ ] Login como Colaborador → deve ver APENAS tarefas atribuídas a ele
  - [ ] Login como Colaborador 2 → NÃO deve ver tarefas do Colaborador 1

### Fase 2: Correção de Chat (Frontend)
- [ ] Criar branch: `git checkout -b fix/chat-sender-name`
- [ ] Editar `src/components/chat/MessageList.tsx`:
  - [ ] Adicionar import `useAuth`
  - [ ] Adicionar `const { user } = useAuth()`
  - [ ] Substituir `message.userId === 'current-user'` por `message.userId === user?.id`
- [ ] Editar `src/components/chat/MessageListPremium.tsx`:
  - [ ] Adicionar import `useAuth`
  - [ ] Adicionar `const { user: currentUser } = useAuth()`
  - [ ] Substituir `message.userId === 'current-user'` por `message.userId === currentUser?.id`
- [ ] Testar localmente:
  - [ ] Login como Amanda
  - [ ] Enviar mensagem para Kevin
  - [ ] Login como Kevin
  - [ ] Verificar: mensagem mostra "De: Amanda" (não "De: Kevin")
  - [ ] Verificar: mensagens próprias aparecem à direita com fundo colorido
  - [ ] Verificar: mensagens de outros aparecem à esquerda com avatar
- [ ] Executar `npm run build` para garantir que não há erros de TypeScript
- [ ] Commit e push

### Fase 3: Validação Final
- [ ] Revalidar Script 2 (isolamento de tasks) em produção
- [ ] Revalidar chat com 3 usuários diferentes
- [ ] Documentar mudanças no CLAUDE.md se necessário
- [ ] Marcar migration 014 como executada (criar arquivo `.executed` ou similar)

---

## Riscos e Mitigações

### Risco 1: Migration 014 quebrar tarefas existentes
**Probabilidade:** Baixa
**Impacto:** Alto
**Mitigação:**
- Fazer backup do banco antes
- Testar em ambiente de staging se disponível
- A migration usa `DROP POLICY IF EXISTS`, então é idempotente
- Rollback manual: reverter para policies antigas (disponíveis em supabase-migrations.sql)

### Risco 2: Frontend quebrar após mudança no chat
**Probabilidade:** Baixa
**Impacto:** Médio
**Mitigação:**
- Testar em dev antes de deploy
- `user?.id` usa optional chaining, então não quebra se user for null
- Build do Next.js vai detectar erros de TypeScript

### Risco 3: Performance degradada com novas RLS policies
**Probabilidade:** Baixa
**Impacto:** Baixo
**Mitigação:**
- Policies usam `auth.uid()` que é indexado automaticamente
- Policies antigas também usavam `EXISTS` com mesmo custo
- Monitorar queries lentas no Supabase Dashboard após deploy

---

## Arquivos Críticos

### Migration (SQL)
1. **`docs/supabase-migrations/014_update_tasks_rls_individual.sql`**
   - Contém 6 novas RLS policies para tasks
   - DEVE ser executada no Supabase
   - Status: Criada mas NÃO executada

### Frontend (TypeScript/React)
2. **`src/components/chat/MessageList.tsx`**
   - Linha 54: `isCurrentUser={message.userId === 'current-user'}`
   - Precisa adicionar `useAuth` hook
   - Corrigir comparação para `message.userId === user?.id`

3. **`src/components/chat/MessageListPremium.tsx`**
   - Linha 57: `const isOwn = message.userId === 'current-user'`
   - Precisa adicionar `useAuth` hook
   - Corrigir comparação para `message.userId === currentUser?.id`

### Hooks (Contexto)
4. **`src/hooks/useAuth.ts`**
   - Fornece `user.id` atual
   - Já funciona corretamente, NÃO precisa edição

5. **`src/hooks/useChat.ts`**
   - Mapeamento de mensagens está correto
   - `userId: m.user_id` está correto
   - NÃO precisa edição

6. **`src/hooks/useTasks.ts`**
   - Query `SELECT *` confia nas RLS policies
   - Funciona corretamente APÓS migration 014 ser executada
   - NÃO precisa edição

### Referência (Somente Leitura)
7. **`docs/supabase-migrations.sql`**
   - Linhas 256-264: RLS policies ANTIGAS de tasks
   - Contexto para entender o problema
   - NÃO executar novamente (já está em produção)

---

## Estimativa de Tempo

| Fase | Tarefa | Tempo Estimado |
|------|--------|----------------|
| 1    | Backup do banco | 5 min |
| 1    | Executar migration 014 | 2 min |
| 1    | Verificar policies criadas | 3 min |
| 1    | Testar isolamento (3 usuários) | 10 min |
| 2    | Editar MessageList.tsx | 3 min |
| 2    | Editar MessageListPremium.tsx | 3 min |
| 2    | Testar chat localmente | 10 min |
| 2    | Build e validação | 5 min |
| 3    | Validação final em prod | 10 min |
| **TOTAL** | | **~50 min** |

---

## Conclusão

Ambos os problemas têm **causas raiz identificadas** e **soluções claras**:

1. **Tasks:** Executar migration 014 que já foi criada (2 minutos)
2. **Chat:** Corrigir 2 linhas de código em 2 arquivos (6 minutos)

Após correções, o sistema terá:
- ✅ Isolamento completo de tarefas por usuário
- ✅ Mensagens de chat exibindo remetente correto
- ✅ Permissões adequadas para Admin/Gerente/Colaborador

**Próximos passos:**
1. Revisar este plano
2. Confirmar acesso ao Supabase
3. Executar Fase 1 (migration)
4. Executar Fase 2 (frontend)
5. Validar em produção
