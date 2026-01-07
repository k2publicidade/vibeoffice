# Guia Passo-a-Passo: Correção de Isolamento de Usuários

**Data:** 2026-01-07
**Prioridade:** CRÍTICA
**Tempo estimado:** 50 minutos
**Pré-requisitos:** Acesso ao Supabase Dashboard + acesso ao código

---

## Índice

1. [Preparação](#1-preparação)
2. [Correção do Backend (Supabase)](#2-correção-do-backend-supabase)
3. [Correção do Frontend (React)](#3-correção-do-frontend-react)
4. [Testes de Validação](#4-testes-de-validação)
5. [Rollback (Se Necessário)](#5-rollback-se-necessário)

---

## 1. Preparação

### 1.1. Backup do Banco de Dados (Recomendado)

**Via Supabase Dashboard:**
1. Acesse: `https://supabase.com/dashboard/project/<PROJECT_ID>`
2. Menu lateral → **Database** → **Backups**
3. Clique em **"Trigger backup now"**
4. Aguarde confirmação (leva ~1-5 minutos)

**Via CLI (alternativa):**
```bash
supabase db dump -f backup-antes-migration-014.sql
```

### 1.2. Verificar Estado Atual

Execute no **Supabase SQL Editor**:
```sql
-- Quantas policies de tasks existem atualmente?
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'tasks';
```

**Resultado esperado:** 5 policies (antigas)
**Se retornar 6:** Migration 014 já foi executada (pule para seção 3)

### 1.3. Criar Branch Git

```bash
cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"
git checkout -b fix/user-isolation-critical
git status
```

---

## 2. Correção do Backend (Supabase)

### 2.1. Executar Migration 014

**Método 1: Via Supabase Dashboard (RECOMENDADO)**

1. Abra o arquivo `docs/supabase-migrations/014_update_tasks_rls_individual.sql` no editor
2. Selecione **TODO o conteúdo** (Ctrl+A) e copie (Ctrl+C)
3. Acesse Supabase Dashboard → **SQL Editor**
4. Clique em **"New query"**
5. Cole o conteúdo da migration
6. Clique em **"Run"** (ou F5)

**Método 2: Via Supabase CLI**

```bash
cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"

# Login (se ainda não estiver logado)
supabase login

# Link ao projeto (se ainda não estiver linkado)
supabase link --project-ref <SEU_PROJECT_REF>

# Executar migration
supabase db push --db-url postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres \
  --file docs/supabase-migrations/014_update_tasks_rls_individual.sql
```

### 2.2. Verificar Execução

**Query de verificação:**
```sql
SELECT
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admin%' THEN '1-Admin'
    WHEN policyname LIKE '%Manager%' THEN '2-Gerente'
    ELSE '3-Colaborador'
  END as categoria
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY categoria, policyname;
```

**Output esperado (6 linhas):**
```
policyname                              | cmd    | categoria
----------------------------------------|--------|-------------
Admins have full access to tasks       | ALL    | 1-Admin
Managers can manage own sector tasks   | ALL    | 2-Gerente
Users can create tasks in own sector   | INSERT | 3-Colaborador
Users can delete own tasks             | DELETE | 3-Colaborador
Users can update assigned tasks        | UPDATE | 3-Colaborador
Users can view assigned tasks          | SELECT | 3-Colaborador
```

✅ **Se aparecer 6 policies:** Migration executada com sucesso!
❌ **Se aparecer 5 ou menos:** Algo deu errado, veja seção de Troubleshooting

### 2.3. Teste Rápido de Isolamento

```sql
-- Criar tarefa de teste atribuída ao Kevin
INSERT INTO tasks (
  title, description, status, priority,
  assigned_to, sector, created_by
) VALUES (
  '[TESTE] Verificação de Isolamento',
  'Esta tarefa deve ser visível apenas para Kevin e Admins',
  'todo',
  'high',
  (SELECT id FROM users WHERE email = 'kevin.costa@vibedistro.com'),
  'Marketing',
  auth.uid()
) RETURNING id, title, assigned_to;
```

**Agora, abra o app em modo anônimo:**

1. Login como Kevin: `kevin.costa@vibedistro.com` / `password123`
2. Navegue para `/tasks`
3. **Esperado:** Ver a tarefa "[TESTE] Verificação de Isolamento"

4. Logout e login como outro colaborador (ex: Maria)
5. Navegue para `/tasks`
6. **Esperado:** NÃO ver a tarefa do Kevin

7. Delete a tarefa de teste:
```sql
DELETE FROM tasks WHERE title LIKE '[TESTE]%';
```

---

## 3. Correção do Frontend (React)

### 3.1. Editar MessageList.tsx

**Arquivo:** `src/components/chat/MessageList.tsx`

**Mudanças:**
1. Adicionar import do hook `useAuth`
2. Declarar `const { user } = useAuth()`
3. Corrigir comparação de `isCurrentUser`

**Código ANTES:**
```tsx
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

  // ... código do meio ...

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8">
          Seja o primeiro a enviar uma mensagem
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === 'current-user'}
          />
        ))
      )}
      {/* resto do código... */}
    </div>
  )
}
```

**Código DEPOIS:**
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth' // ✅ ADICIONADO

interface MessageListProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
}

export function MessageList({ messages, typingUsers = [], isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth() // ✅ ADICIONADO

  // ... código do meio ...

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8">
          Seja o primeiro a enviar uma mensagem
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === user?.id} // ✅ CORRIGIDO
          />
        ))
      )}
      {/* resto do código... */}
    </div>
  )
}
```

### 3.2. Editar MessageListPremium.tsx

**Arquivo:** `src/components/chat/MessageListPremium.tsx`

**Mudanças:**
1. Adicionar import do hook `useAuth`
2. Declarar `const { user: currentUser } = useAuth()`
3. Corrigir comparação de `isOwn`

**Código ANTES (linhas 1-25 e 52-65):**
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUsers } from '@/hooks/useUsers'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MessageListPremiumProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
}

export function MessageListPremium({
  messages,
  typingUsers = [],
  isLoading,
}: MessageListPremiumProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { users } = useUsers()

  // ... código do meio ...

  return (
    <ScrollArea className="flex-1 p-4 lg:p-6 bg-black">
      <div className="space-y-4">
        <AnimatePresence>
          {messages.map((message) => {
            const isOwn = message.userId === 'current-user' // ❌ ERRADO
            const user = users?.find(u => u.id === message.userId)
            // ... resto do map
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}
```

**Código DEPOIS:**
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth' // ✅ ADICIONADO
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MessageListPremiumProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
}

export function MessageListPremium({
  messages,
  typingUsers = [],
  isLoading,
}: MessageListPremiumProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { users } = useUsers()
  const { user: currentUser } = useAuth() // ✅ ADICIONADO

  // ... código do meio ...

  return (
    <ScrollArea className="flex-1 p-4 lg:p-6 bg-black">
      <div className="space-y-4">
        <AnimatePresence>
          {messages.map((message) => {
            const isOwn = message.userId === currentUser?.id // ✅ CORRIGIDO
            const user = users?.find(u => u.id === message.userId)
            // ... resto do map
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}
```

### 3.3. Verificar Build

```bash
cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"
npm run build
```

✅ **Se build passar:** Mudanças estão corretas!
❌ **Se build falhar:** Verifique erros de TypeScript no output

### 3.4. Testar Localmente

```bash
npm run dev
```

**Teste do Chat:**

1. Login como Amanda: `amanda.rodrigues@vibedistro.com` / `password123`
2. Navegue para `/chat`
3. Selecione uma sala ou DM
4. Envie mensagem: "Teste de remetente - Amanda"
5. **Esperado:** Mensagem aparece à DIREITA com fundo colorido

6. Abra navegador em modo anônimo (Ctrl+Shift+N)
7. Login como Kevin: `kevin.costa@vibedistro.com` / `password123`
8. Navegue para `/chat` → mesma sala
9. **Esperado:** Ver mensagem "Teste de remetente - Amanda" à ESQUERDA
10. **Esperado:** Nome do remetente: "Amanda" (não "Kevin")

11. Kevin envia: "Resposta do Kevin"
12. **Esperado:** Mensagem do Kevin à DIREITA
13. Volte ao navegador da Amanda (F5 para refresh)
14. **Esperado:** Ver "Resposta do Kevin" à ESQUERDA com nome "Kevin"

✅ **Se tudo funcionar:** Frontend corrigido!

---

## 4. Testes de Validação

### 4.1. Script de Verificação Completo

**Execute:**
```bash
cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"

# Abrir SQL no Supabase Dashboard e colar:
cat docs/verification-scripts/verify-tasks-isolation.sql
```

**Ou execute manualmente:**
1. Acesse Supabase Dashboard → SQL Editor
2. Abra arquivo `docs/verification-scripts/verify-tasks-isolation.sql`
3. Execute cada seção (Parte 1 a 6)
4. Verifique outputs esperados

### 4.2. Teste de Tarefas (3 Usuários)

**Terminal 1 - Admin:**
```bash
# Login: eu@vibedistro.com / password123
# Criar tarefa para Kevin
```
1. Navegue: `/tasks`
2. Clique "Nova Tarefa"
3. Preencha:
   - Título: "Tarefa para Kevin - Teste Isolamento"
   - Setor: Marketing
   - Atribuir para: Kevin Costa
   - Prioridade: Alta
4. Criar tarefa
5. **Verificar:** Tarefa aparece na lista (Admin vê todas)

**Terminal 2 - Kevin (Colaborador):**
```bash
# Login: kevin.costa@vibedistro.com / password123
```
1. Navegue: `/tasks`
2. **Verificar:** Ver tarefa "Tarefa para Kevin - Teste Isolamento"
3. **Verificar:** NÃO ver tarefas de outros colaboradores

**Terminal 3 - Maria (Colaborador):**
```bash
# Login: maria.santos@vibedistro.com / password123
```
1. Navegue: `/tasks`
2. **Verificar:** NÃO ver tarefa "Tarefa para Kevin - Teste Isolamento"
3. **Verificar:** Ver apenas tarefas atribuídas a Maria

### 4.3. Checklist Final

- [ ] Migration 014 executada (6 policies visíveis)
- [ ] Admin vê todas as tarefas
- [ ] Gerente vê tarefas do setor
- [ ] Colaborador vê apenas atribuídas a ele
- [ ] Colaborador NÃO vê tarefas de outros
- [ ] Chat mostra nome do remetente correto
- [ ] Mensagens próprias aparecem à direita
- [ ] Mensagens de outros aparecem à esquerda
- [ ] Build do projeto passa sem erros

---

## 5. Rollback (Se Necessário)

### 5.1. Reverter Migration 014 (Backend)

**ATENÇÃO:** Isso remove o isolamento individual! Use apenas em emergência!

```sql
-- 1. Remover policies novas
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;

-- 2. Recriar policies antigas (ver seção 7 do verify-tasks-isolation.sql)
```

### 5.2. Reverter Mudanças Frontend

```bash
cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"
git checkout master -- src/components/chat/MessageList.tsx
git checkout master -- src/components/chat/MessageListPremium.tsx
npm run dev
```

---

## 6. Commit e Deploy

### 6.1. Commit das Mudanças

```bash
cd "C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice"

# Verificar mudanças
git status
git diff src/components/chat/MessageList.tsx
git diff src/components/chat/MessageListPremium.tsx

# Adicionar arquivos
git add src/components/chat/MessageList.tsx
git add src/components/chat/MessageListPremium.tsx
git add docs/plans/2026-01-07-fix-user-isolation.md
git add docs/verification-scripts/verify-tasks-isolation.sql
git add docs/guides/GUIDE-FIX-USER-ISOLATION.md

# Commit
git commit -m "fix(critical): correct user isolation in tasks and chat

- Execute migration 014 to implement individual task assignment policies
  - Colaboradores now see ONLY tasks assigned to them (not all sector tasks)
  - Admins and Gerentes permissions remain unchanged
- Fix chat sender name display bug
  - Replace hardcoded 'current-user' comparison with actual user.id
  - Messages now correctly show sender name instead of recipient name
- Add verification scripts and implementation guides

Fixes: Tasks visible to all users in sector, Chat showing wrong sender name
Refs: docs/plans/2026-01-07-fix-user-isolation.md"

# Push
git push origin fix/user-isolation-critical
```

### 6.2. Criar Pull Request

1. Acesse GitHub: `https://github.com/<USER>/vibeoffice/pulls`
2. Clique "New Pull Request"
3. Base: `master` ← Compare: `fix/user-isolation-critical`
4. Título: `fix(critical): correct user isolation in tasks and chat`
5. Descrição:
```markdown
## Problema
- Tarefas aparecendo para todos os usuários do setor (violação de privacidade)
- Chat mostrando nome do destinatário em vez do remetente

## Solução
- Executada migration 014 (RLS policies individuais)
- Corrigido comparação hardcoded no chat (useAuth integration)

## Testes
- [x] Admin vê todas as tarefas
- [x] Gerente vê tarefas do setor
- [x] Colaborador vê apenas atribuídas a ele
- [x] Chat mostra remetente correto
- [x] Build passa sem erros

## Arquivos modificados
- `src/components/chat/MessageList.tsx`
- `src/components/chat/MessageListPremium.tsx`
- Supabase: Migration 014 executada

## Checklist
- [x] Migration 014 executada com sucesso
- [x] Testes de isolamento passaram
- [x] Build do projeto passou
- [x] Documentação atualizada
```

6. Clique "Create Pull Request"
7. Merge após aprovação

---

## 7. Troubleshooting

### Problema: Migration 014 não executa

**Sintoma:** Erro ao executar migration no Supabase

**Possíveis causas:**
1. Policies antigas não existem (já foram removidas)
2. Permissões insuficientes no banco

**Solução:**
```sql
-- Verificar policies atuais
SELECT policyname FROM pg_policies WHERE tablename = 'tasks';

-- Se não houver policies, comentar seção DROP POLICY da migration
-- E executar apenas a seção CREATE POLICY
```

### Problema: auth.uid() retorna NULL

**Sintoma:** Teste retorna "current_user_id: NULL"

**Causa:** Usuário não autenticado no SQL Editor

**Solução:**
- Não é possível autenticar como usuário final no SQL Editor
- Testes de auth.uid() devem ser feitos via frontend (app)
- No SQL Editor, use queries que simulem IDs conhecidos

### Problema: Chat ainda mostra nome errado

**Sintoma:** Após correção, chat continua mostrando nome do destinatário

**Possíveis causas:**
1. Cache do browser
2. Hot reload não aplicou mudanças
3. Arquivo não foi salvo corretamente

**Solução:**
```bash
# 1. Hard refresh no browser
Ctrl+Shift+R (Chrome/Edge)
Cmd+Shift+R (Mac)

# 2. Reiniciar dev server
npm run dev (Ctrl+C e reiniciar)

# 3. Verificar arquivo foi salvo
cat src/components/chat/MessageList.tsx | grep "useAuth"
# Esperado: import { useAuth } from '@/hooks/useAuth'

# 4. Clear build cache
rm -rf .next
npm run dev
```

### Problema: Build falha com erro TypeScript

**Sintoma:** `npm run build` falha com erro de tipo

**Possíveis causas:**
1. Import incorreto
2. Tipo de `user` incompatível

**Solução:**
```tsx
// Verificar import
import { useAuth } from '@/hooks/useAuth' // ✓ Correto
import useAuth from '@/hooks/useAuth'     // ✗ Errado

// Verificar comparação
isCurrentUser={message.userId === user?.id}  // ✓ Correto (optional chaining)
isCurrentUser={message.userId === user.id}   // ✗ Pode quebrar se user for null
```

---

## 8. Contato e Suporte

**Documentação:**
- Plano completo: `docs/plans/2026-01-07-fix-user-isolation.md`
- Scripts SQL: `docs/verification-scripts/verify-tasks-isolation.sql`

**Referências:**
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Auth: https://nextjs.org/docs/app/building-your-application/authentication

---

**FIM DO GUIA**

Estimativa de tempo: ~50 minutos
Última atualização: 2026-01-07
