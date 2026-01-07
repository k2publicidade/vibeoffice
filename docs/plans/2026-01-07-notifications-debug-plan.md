# Análise Completa: Por que Notificações Não Funcionam Entre Contas

**Data:** 2026-01-07
**Status:** 🔍 Análise Completa
**Problema:** Notificações emitidas pelo Usuário A não aparecem para o Usuário B em tempo real

---

## 🔴 PROBLEMA CRÍTICO IDENTIFICADO

### Issue #1: Falta RLS Policy de INSERT na Tabela `notifications`

**Arquivo:** `docs/supabase-migrations/019_notifications_system.sql` (linhas 95-97)

```sql
-- Service role pode inserir notificações
-- (Não criar policy de INSERT para usuários comuns)
```

**Explicação:**

A migration não criou uma RLS policy para INSERT na tabela `notifications`. Isso significa que:

1. ✅ `InAppHandler` tenta inserir notificação com o **client browser** (anon key)
2. ❌ RLS bloqueia o INSERT porque não há policy permitindo
3. ❌ EventBus engole o erro (fire-and-forget) e não propaga
4. ❌ Usuário B nunca recebe a notificação porque ela nunca foi criada no banco

**Evidência no código:**

```typescript
// src/lib/notifications/handlers/InAppHandler.ts (linha 5)
export class InAppHandler {
  private supabase = createClient() // ❌ Usa ANON_KEY (client browser)

  async send(userId: string, event: NotificationEvent): Promise<void> {
    const { data: notification, error } = await this.supabase
      .from('notifications')
      .insert({ ... }) // ❌ INSERT bloqueado pelo RLS
```

**Por que isso é um problema:**

- O `createClient()` usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (autenticado como usuário comum)
- RLS está habilitado: `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`
- Não existe policy para permitir INSERT de usuários autenticados
- Comentário diz "Service role pode inserir" mas **não usa service role**

---

## 🔍 Fluxo Esperado vs Fluxo Real

### Fluxo Esperado (Como Deveria Funcionar)

```
1. User A cria task e atribui para User B
   ↓
2. useTasks.createTask() → EventBus.emit({ type: 'task_assigned', recipientIds: [userB.id] })
   ↓
3. EventBus → NotificationProcessor.process(event)
   ↓
4. NotificationProcessor → getUserPreferences(userB.id)
   ↓
5. Se enable_in_app = true → InAppHandler.send(userB.id, event)
   ↓
6. InAppHandler insere row na tabela notifications com user_id = userB.id
   ↓
7. Supabase Realtime detecta INSERT e emite evento
   ↓
8. useNotifications (do User B) recebe evento via subscription
   ↓
9. Toast aparece + Badge incrementa + Notificação aparece na lista
```

### Fluxo Real (O Que Acontece)

```
1. User A cria task → EventBus.emit() ✅
   ↓
2. EventBus → NotificationProcessor.process() ✅
   ↓
3. NotificationProcessor → getUserPreferences() ✅
   ↓
4. InAppHandler.send() → supabase.from('notifications').insert() ❌
   ↓
5. RLS BLOQUEIA: "new row violates row-level security policy for table 'notifications'"
   ↓
6. EventBus engole erro (fire-and-forget) e loga no console
   ↓
7. ❌ NOTIFICAÇÃO NUNCA É CRIADA NO BANCO
   ↓
8. ❌ REALTIME NÃO TEM NADA PARA EMITIR
   ↓
9. ❌ USER B NUNCA RECEBE A NOTIFICAÇÃO
```

---

## 🐛 Problemas Identificados

### 1. **RLS Policy de INSERT Ausente** (🔴 CRÍTICO)

**Arquivo:** `docs/supabase-migrations/019_notifications_system.sql`

**Problema:**
- Migration não cria policy de INSERT para notificações
- InAppHandler usa client browser (anon key) que é bloqueado pelo RLS

**Fix Necessário:**

Adicionar policy que permite **backend/sistema** inserir notificações para qualquer usuário:

```sql
-- Permitir INSERT de notificações por usuários autenticados
-- (O sistema cria notificações para outros usuários)
CREATE POLICY "Allow authenticated users to insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

**OU** (Opção mais segura):

Criar um Supabase Edge Function com service role key para criar notificações:

```typescript
// supabase/functions/create-notification/index.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // ✅ Usa service role
)

Deno.serve(async (req) => {
  const { userId, event } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, ... })

  return new Response(JSON.stringify(data))
})
```

---

### 2. **InAppHandler Usa Client Browser Ao Invés de Service Role** (🔴 CRÍTICO)

**Arquivo:** `src/lib/notifications/handlers/InAppHandler.ts` (linha 5)

**Problema:**
```typescript
export class InAppHandler {
  private supabase = createClient() // ❌ ANON_KEY
```

**Por que é problema:**
- `createClient()` retorna client autenticado como usuário comum
- RLS policies aplicam-se a esse client
- Não pode inserir notificações para outros usuários (violação de RLS)

**Fix Necessário:**

Opção 1: Criar service role client
```typescript
// src/lib/supabase/admin.ts (NOVO ARQUIVO)
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ Service role bypassa RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

```typescript
// src/lib/notifications/handlers/InAppHandler.ts
import { supabaseAdmin } from '@/lib/supabase/admin'

export class InAppHandler {
  private supabase = supabaseAdmin // ✅ Usa service role
```

**⚠️ IMPORTANTE:** Service role key deve ser usado apenas **server-side** (nunca expor no client)

Opção 2: Mover lógica para Edge Function (recomendado para produção)

---

### 3. **EventBus Fire-and-Forget Oculta Erros** (🟡 MÉDIO)

**Arquivo:** `src/lib/notifications/EventBus.ts` (linhas 22-24)

**Problema:**
```typescript
} catch (error) {
  // Fire-and-forget: nunca propaga erro
  console.error('[EventBus] Error processing event (swallowed):', error)
}
```

**Por que é problema:**
- Desenvolvedor não percebe que notificações falharam
- Erros aparecem apenas no console (fácil de ignorar)
- Não há mecanismo de retry ou alerta

**Fix Sugerido:**

Adicionar opção de debug mode:
```typescript
async emit(event: NotificationEvent, options?: { throwOnError?: boolean }): Promise<void> {
  try {
    await this.processor.process(event)
  } catch (error) {
    console.error('[EventBus] Error processing event:', error)
    if (options?.throwOnError) {
      throw error // Permite teste unitário detectar falhas
    }
  }
}
```

---

### 4. **Falta Verificação de Permissões na Migration** (🟢 MENOR)

**Arquivo:** `docs/supabase-migrations/019_notifications_system.sql` (linha 157)

**Problema:**
- Verificação final não testa se INSERT funciona
- Apenas verifica que tabelas/policies existem

**Fix Sugerido:**

Adicionar teste de INSERT no final da migration:
```sql
-- Verificar que INSERT funciona (usando autenticação do usuário atual)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM public.users LIMIT 1;

  INSERT INTO public.notifications (
    user_id, type, title, message, priority
  ) VALUES (
    test_user_id, 'announcement', 'Test', 'Migration test', 'low'
  );

  DELETE FROM public.notifications WHERE title = 'Test';

  RAISE NOTICE 'INSERT test passed ✅';
END $$;
```

---

### 5. **Realtime Subscription Pode Não Estar Ativa** (🟡 MÉDIO)

**Arquivo:** `src/hooks/useNotifications.ts` (linhas 134-193)

**Problema Potencial:**
- Subscription é criada mas pode falhar silenciosamente
- Não há log de confirmação de subscrição

**Fix Sugerido:**

Adicionar logs de debug:
```typescript
.subscribe((status) => {
  console.log('[useNotifications] Subscription status:', status)
  if (status === 'SUBSCRIBED') {
    console.log('✅ Realtime subscription active for user:', user.id)
  }
})
```

---

## 🧪 Como Debugar (Passo a Passo)

### Debug 1: Verificar se Notificação Foi Criada no Banco

1. Abrir Supabase Dashboard → Table Editor → `notifications`
2. Fazer ação que deveria criar notificação (ex: atribuir task)
3. Verificar se nova row foi inserida

**Resultado Esperado:** ✅ Row aparece com `user_id` do destinatário

**Se falhar:** 🔴 RLS bloqueando INSERT (confirma Issue #1)

---

### Debug 2: Verificar Console do Browser

1. Abrir DevTools → Console
2. Fazer ação que emite notificação
3. Procurar por logs do EventBus

**Logs esperados:**
```
[EventBus] Event emitted: task_assigned for 1 recipient(s)
[EventBus] Event processed successfully
```

**Se aparecer erro:**
```
[EventBus] Error processing event (swallowed): { error: "new row violates row-level security policy" }
[InAppHandler] Failed to insert notification: { code: "42501", ... }
```

**Confirma:** 🔴 RLS bloqueando INSERT

---

### Debug 3: Verificar RLS Policies no Supabase

Executar no SQL Editor:

```sql
-- Verificar policies de INSERT
SELECT
  policyname,
  cmd as comando,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notifications'
  AND cmd = 'INSERT';
```

**Resultado Esperado:** Deveria ter 1 policy de INSERT

**Resultado Real:** 🔴 0 rows (nenhuma policy de INSERT)

---

### Debug 4: Testar INSERT Manual como Usuário Autenticado

No SQL Editor do Supabase:

```sql
-- Tentar inserir notificação manualmente
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  message,
  priority
) VALUES (
  (SELECT id FROM public.users LIMIT 1),
  'announcement',
  'Teste Manual',
  'Testando INSERT direto',
  'low'
);
```

**Se falhar com erro:**
```
new row violates row-level security policy for table "notifications"
```

**Confirma:** 🔴 RLS bloqueando INSERT (Issue #1)

---

### Debug 5: Verificar Realtime Subscription

No console do browser do User B:

1. Abrir DevTools → Console
2. Verificar logs da subscription:

```
[useNotifications] Subscription status: CONNECTING
[useNotifications] Subscription status: SUBSCRIBED
✅ Realtime subscription active for user: <user-id>
```

**Se não aparecer:** 🟡 Subscription não está ativa

---

## ✅ Soluções Recomendadas

### Solução 1: Adicionar RLS Policy de INSERT (Rápido)

**Arquivo:** Criar `docs/supabase-migrations/020_fix_notifications_insert.sql`

```sql
-- ============================================
-- Migration 020: Fix Notifications INSERT Policy
-- Data: 2026-01-07
-- Descrição: Adicionar policy que permite sistema criar notificações
-- ============================================

-- Permitir usuários autenticados criarem notificações para qualquer user_id
-- (Necessário para o sistema criar notificações cross-user)
CREATE POLICY "Allow authenticated to insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verificar que policy foi criada
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notifications'
  AND cmd = 'INSERT';
```

**Executar no Supabase Dashboard → SQL Editor**

**Prós:**
- ✅ Fix rápido (1 comando SQL)
- ✅ Não requer mudanças no código
- ✅ Mantém arquitetura atual

**Contras:**
- ⚠️ Qualquer usuário autenticado pode criar notificações para outros
- ⚠️ Não é a solução mais segura para produção

---

### Solução 2: Usar Service Role Client (Mais Seguro)

**Passos:**

1. **Criar admin client** (server-side only):

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// ⚠️ NUNCA expor no client
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypassa RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

2. **Atualizar InAppHandler:**

```typescript
// src/lib/notifications/handlers/InAppHandler.ts
import { supabaseAdmin } from '@/lib/supabase/admin'

export class InAppHandler {
  private supabase = supabaseAdmin // ✅ Usa service role

  async send(userId: string, event: NotificationEvent): Promise<void> {
    // INSERT agora funciona (bypassa RLS)
    const { data: notification, error } = await this.supabase
      .from('notifications')
      .insert({ ... })
```

**Prós:**
- ✅ Mais seguro (service role bypassa RLS)
- ✅ Não precisa de policy de INSERT frouxa
- ✅ Controle total sobre quem cria notificações

**Contras:**
- ⚠️ Requer cuidado para não expor service role key no client
- ⚠️ NotificationProcessor precisa rodar server-side (não no browser)

---

### Solução 3: Mover para Edge Function (Produção)

**Passos:**

1. **Criar Edge Function:**

```typescript
// supabase/functions/process-notification/index.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const { event } = await req.json()

  // Processar evento e criar notificações
  for (const userId of event.recipientIds) {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: event.type,
      title: generateTitle(event),
      message: generateMessage(event),
      ...
    })
  }

  return new Response(JSON.stringify({ success: true }))
})
```

2. **Atualizar EventBus para chamar Edge Function:**

```typescript
// src/lib/notifications/EventBus.ts
async emit(event: NotificationEvent): Promise<void> {
  try {
    await fetch('/api/process-notification', {
      method: 'POST',
      body: JSON.stringify({ event })
    })
  } catch (error) {
    console.error('[EventBus] Failed to emit:', error)
  }
}
```

**Prós:**
- ✅ Mais seguro (service role nunca exposto)
- ✅ Escalável (Edge Functions são serverless)
- ✅ Separação de concerns (backend isolado do frontend)

**Contras:**
- ⚠️ Mais complexo de implementar
- ⚠️ Requer deploy de Edge Function
- ⚠️ Latência adicional (HTTP request)

---

## 🎯 Recomendação Final

### Para Desenvolvimento (Agora):

**Usar Solução 1** (Adicionar RLS Policy de INSERT)

- Rápido de implementar (5 minutos)
- Suficiente para desenvolvimento e testes
- Não quebra arquitetura atual

### Para Produção (Futuro):

**Migrar para Solução 3** (Edge Function)

- Mais seguro
- Escalável
- Produção-ready

---

## 📋 Checklist de Debugging

Use este checklist para debugar problemas de notificações:

### 1. Verificar RLS Policies

```sql
-- Verificar policies de INSERT
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'INSERT';
```

- [ ] ✅ Existe policy de INSERT
- [ ] ❌ Policy está ausente → Adicionar policy

---

### 2. Verificar Console do Browser

- [ ] ✅ Logs de `[EventBus] Event emitted` aparecem
- [ ] ✅ Logs de `[EventBus] Event processed successfully` aparecem
- [ ] ❌ Erros de RLS aparecem → Issue #1 confirmado

---

### 3. Verificar Banco de Dados

```sql
-- Verificar se notificações foram criadas
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

- [ ] ✅ Rows aparecem após emitir eventos
- [ ] ❌ Nenhuma row criada → INSERT falhou (RLS)

---

### 4. Verificar Realtime Subscription

- [ ] ✅ Logs de `Subscription status: SUBSCRIBED` aparecem
- [ ] ✅ Eventos INSERT são recebidos pelo useNotifications
- [ ] ❌ Subscription não ativa → Verificar Realtime habilitado

---

### 5. Verificar Service Role Key

```bash
# Verificar .env.local
grep SUPABASE_SERVICE_ROLE_KEY .env.local
```

- [ ] ✅ Service role key presente
- [ ] ❌ Key ausente → Adicionar ao .env.local

---

## 🔗 Arquivos Críticos para Implementação

### 1. `docs/supabase-migrations/020_fix_notifications_insert.sql`
**Razão:** Adicionar RLS policy de INSERT ausente

### 2. `src/lib/supabase/admin.ts` (NOVO)
**Razão:** Criar service role client para bypassing RLS

### 3. `src/lib/notifications/handlers/InAppHandler.ts`
**Razão:** Trocar `createClient()` por `supabaseAdmin`

### 4. `src/lib/notifications/EventBus.ts`
**Razão:** Adicionar debug mode e melhor error handling

### 5. `src/hooks/useNotifications.ts`
**Razão:** Adicionar logs de debug da subscription

---

## 📖 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Supabase Service Role Key](https://supabase.com/docs/guides/api#the-service_role-key)

---

**Conclusão:** O problema principal é que **não existe RLS policy de INSERT** na tabela `notifications`, fazendo com que o `InAppHandler` não consiga criar notificações usando o client browser (anon key). A solução mais rápida é adicionar uma policy de INSERT. A solução mais segura para produção é mover a lógica para uma Edge Function com service role key.
