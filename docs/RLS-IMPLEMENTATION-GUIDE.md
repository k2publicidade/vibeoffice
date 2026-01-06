# 🔐 Guia Completo de Implementação de RLS - VIBEDISTRO

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Estrutura de Permissões](#estrutura-de-permissões)
3. [Como Executar](#como-executar)
4. [Estrutura de Políticas por Tabela](#estrutura-de-políticas-por-tabela)
5. [Testando as Políticas](#testando-as-políticas)
6. [Troubleshooting](#troubleshooting)
7. [Boas Práticas](#boas-práticas)

---

## Visão Geral

RLS (Row Level Security) é um mecanismo do PostgreSQL que permite controlar o acesso a linhas de dados específicas baseado na identidade do usuário e seus atributos.

### Por que RLS é importante?

- **Segurança**: Dados sensíveis ficam protegidos no banco de dados
- **Escalabilidade**: Controle de acesso não precisa ser implementado na aplicação
- **Compliance**: Atende requisitos de proteção de dados (LGPD, etc)
- **Performance**: Queries retornam apenas dados que o usuário pode acessar

### Arquitetura do VIBEDISTRO

```
┌─────────────────┐
│   Frontend      │ Next.js (Client Components)
│   (Browser)     │
└────────┬────────┘
         │
    Supabase Client
         │
┌────────▼────────┐
│   Supabase      │ Auth + API
│   (API/Auth)    │
└────────┬────────┘
         │
┌────────▼────────────────────┐
│   PostgreSQL + RLS          │
│                             │
│  ┌─────────────────────┐   │
│  │ Users (Roles)       │   │
│  │ - Admin             │   │
│  │ - Gerente           │   │
│  │ - Colaborador       │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Políticas RLS       │   │
│  │ Validam acesso por: │   │
│  │ - Role              │   │
│  │ - Setor             │   │
│  │ - Propriedade       │   │
│  │ - Compartilhamento  │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

---

## Estrutura de Permissões

### 🎭 Roles (Papéis)

| Role | Descrição | Permissões |
|------|-----------|-----------|
| **Admin** | Administrador do sistema | Acesso total a tudo |
| **Gerente** | Responsável pelo setor | Acesso total ao setor + leitura em outros |
| **Colaborador** | Membro da equipe | Acesso limitado ao setor + compartilhado |

### 🏢 Setores

```
1. A&R - Artistas e Repertório
2. Marketing - Promação e Comunicação
3. Financeiro - Gestão Financeira
4. Jurídico - Assuntos Legais
5. Administrativo - Operações Gerais
6. TI/Suporte - Suporte Técnico
7. Atendimento ao Artista - Relacionamento
```

### 📊 Matriz de Permissões

#### Tabela: USERS (Perfis de Usuários)

| Ação | Admin | Gerente | Colaborador |
|------|-------|---------|-------------|
| Visualizar Todos | ✅ | ✅ | ✅ |
| Atualizar Próprio | ✅ | ✅ | ✅ |
| Criar Novos | ✅ | ❌ | ❌ |
| Deletar | ✅ | ❌ | ❌ |

#### Tabela: TASKS (Tarefas)

| Ação | Admin | Gerente Setor | Gerente Outro | Colab Setor | Colab Outro |
|------|-------|---|---|---|---|
| Visualizar Setor | ✅ | ✅ | ❌ | ✅ | ❌ |
| Visualizar Outro | ✅ | ✅ | ❌ | ❌ | ❌ |
| Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar Própria | ✅ | ✅ | ✅ | ✅ | ❌ |
| Atualizar Atribuída | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Tabela: TICKETS (Chamados)

| Ação | Admin | Gerente | Colab(Criador) | Colab(Atribuído) |
|------|-------|---------|---|---|
| Visualizar Todos | ✅ | ✅ | ❌ | ❌ |
| Visualizar Próprio | ✅ | ✅ | ✅ | ✅ |
| Criar | ✅ | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅(Próprio) | ❌ |

#### Tabela: CHAT (Mensagens)

| Ação | Admin | Gerente | Colaborador |
|------|-------|---------|-------------|
| Ver Sala Dm | Se participante | Se participante | Se participante |
| Ver Sala Setor | ✅ | Próprio setor | Próprio setor |
| Enviar Mensagem | Se participante | Se participante | Se participante |

#### Tabela: DRIVE (Arquivos)

| Ação | Admin | Gerente | Colaborador |
|------|-------|---------|-------------|
| Ver Públicos | ✅ | ✅ | ✅ |
| Ver Setor | ✅ | ✅ | ✅ |
| Ver Compartilhados | ✅ | ✅ | ✅ |
| Fazer Upload | ✅ | ✅ | ✅ |
| Deletar Próprio | ✅ | ✅ | ✅ |
| Compartilhar Próprio | ✅ | ✅ | ✅ |

#### Tabela: COURSES (Cursos)

| Ação | Admin | Gerente | Colaborador |
|------|-------|---------|-------------|
| Visualizar | ✅ | ✅ | ✅ |
| Criar/Editar | ✅ | ❌ | ❌ |
| Progresso Próprio | ✅ | ✅ | ✅ |
| Progresso Outros | ✅ | ❌ | ❌ |

#### Tabela: CALENDAR (Eventos)

| Ação | Admin | Gerente | Colaborador |
|------|-------|---------|-------------|
| Ver Empresa | ✅ | ✅ | ✅ |
| Ver Setor | ✅ | Próprio | Próprio |
| Criar Empresa | ✅ | ❌ | ❌ |
| Criar Setor | ✅ | Próprio | ❌ |
| Criar Pessoal | ✅ | ✅ | ✅ |

---

## Como Executar

### 1️⃣ Preparação

Antes de executar o script, certifique-se de:

```bash
# ✅ Variáveis de ambiente configuradas
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 2️⃣ Acesso ao Supabase

1. Abra [Supabase Console](https://supabase.com/dashboard)
2. Selecione seu projeto `vibedistro`
3. Vá para `SQL Editor`
4. Clique em `New Query`

### 3️⃣ Executar o Script

**OPÇÃO A: Executar tudo de uma vez**

```sql
-- Copie TODO o conteúdo de: docs/rls-policies-complete.sql
-- Cole no SQL Editor do Supabase
-- Pressione: Ctrl+Enter ou clique em "Run"
```

**OPÇÃO B: Resetar e executar (CUIDADO!)**

Se você quer garantir que não há políticas antigas conflitantes:

1. Descomente a **PARTE 1** do script (seção "LIMPEZA")
2. Execute apenas a PARTE 1 primeiro
3. Depois execute o resto do script

### 4️⃣ Verificar Execução

```sql
-- Verificar que todas as policies foram criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Contar políticas por tabela
SELECT
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## Estrutura de Políticas por Tabela

### 🧑 USERS (Tabela de Usuários)

**Propósito**: Gerenciar perfis de usuários com roles e setores

**Políticas**:
- `users_select_all`: Todos podem visualizar todos os usuários
- `users_update_own`: Cada um atualiza apenas seu perfil
- `users_insert_admin_only`: Apenas admins criam usuários
- `users_delete_admin_only`: Apenas admins deletam usuários

**Lógica de Acesso**:
```
SELECT → Qualquer um (necessário para atribuições)
UPDATE → Próprio registro
INSERT → Admin
DELETE → Admin
```

---

### 📋 TASKS (Tarefas/Kanban)

**Propósito**: Gerenciar tarefas por setor com prioridades

**Políticas**:
- `tasks_admin_all`: Admins têm acesso total
- `tasks_manager_own_sector`: Gerentes gerenciam setor deles
- `tasks_manager_view_all`: Gerentes leem outros setores
- `tasks_collaborator_view_own_sector`: Colaboradores leem setor
- `tasks_update_assigned_to_me`: Qualquer um atualiza atribuída
- `tasks_insert_own_sector`: Criação por setor

**Lógica de Acesso**:
```
SELECT:
  ├─ Admin: Tudo
  ├─ Gerente: Próprio setor + outros (leitura)
  └─ Colaborador: Próprio setor

UPDATE:
  ├─ Atribuído a mim: Sim
  ├─ Meu setor + Gerente: Sim
  └─ Outro setor: Não

INSERT:
  ├─ Admin: Sim
  ├─ Gerente: Sim (próprio setor)
  └─ Colaborador: Sim (próprio setor)
```

---

### 🎫 TICKETS (Chamados)

**Propósito**: Sistema de solicitações com workflow

**Políticas**:
- `tickets_admin_manager_all`: Admin/Gerente acesso total
- `tickets_user_own`: Próprios tickets (criador/atribuído)
- `tickets_insert_authenticated`: Qualquer um cria
- `tickets_update_own`: Atualizar próprio

**Lógica de Acesso**:
```
SELECT:
  ├─ Admin/Gerente: Tudo
  └─ Colaborador: Próprio (criou ou atribuído)

INSERT:
  └─ Qualquer um: Sim (você é o requester)

UPDATE:
  └─ Criador: Seu ticket
```

**Relação com TICKET_HISTORY e TICKET_COMMENTS**:
- Histórico é auto-gerado pelo sistema
- Comentários internos (is_internal=true) só vistos por Admin/Gerente

---

### 💬 CHAT (Mensagens em Tempo Real)

**Propósito**: Comunicação por setor e DMs

**Políticas de CHAT_ROOMS**:
- `chat_rooms_select`: Visualizar salas onde participa
- `chat_rooms_insert_dm`: Criar DMs
- `chat_rooms_insert_sector_admin`: Admins criam salas setoriais

**Políticas de MESSAGES**:
- `messages_select`: Ler mensagens de salas acessíveis
- `messages_insert`: Enviar mensagens em salas participantes

**Lógica de Acesso**:
```
CHAT_ROOMS:
  SELECT: Participante da sala
  INSERT: Tipo DM (você participa) ou Admin (setor)

MESSAGES:
  SELECT: Participante da sala
  INSERT: Participante + seu user_id
```

---

### 📁 DRIVE (Armazenamento de Arquivos)

**Propósito**: Compartilhamento hierárquico de arquivos

**Políticas de DRIVE_ITEMS**:
- `drive_items_admin_all`: Admin acesso total
- `drive_items_select_public`: Arquivos públicos
- `drive_items_select_own_sector`: Arquivos do setor
- `drive_items_select_shared`: Arquivos compartilhados
- `drive_items_insert`: Criar no próprio setor
- `drive_items_update`: Atualizar próprios
- `drive_items_delete`: Deletar próprios

**Políticas de SHARED_ACCESS**:
- Compartilhamento com view/edit/manage
- Revogar apenas quem compartilhou

**Lógica de Acesso**:
```
DRIVE_ITEMS:
  SELECT:
    ├─ Admin: Tudo
    ├─ Público: Todos
    ├─ Setor: Próprio setor
    └─ Compartilhado: Se em shared_access

  INSERT: Próprio setor
  UPDATE: Próprio arquivo
  DELETE: Próprio arquivo

SHARED_ACCESS:
  INSERT: Proprietário do arquivo
  DELETE: Quem compartilhou
  UPDATE: Quem compartilhou
```

---

### 🎓 COURSES (Cursos)

**Propósito**: Treinamento interno com progresso

**Políticas de COURSES e LESSONS**:
- Todos visualizam
- Apenas Admin gerencia

**Políticas de COURSE_PROGRESS**:
- Usuário vê apenas seu progresso
- Admin vê tudo
- Atualizar apenas próprio

**Lógica de Acesso**:
```
COURSES/LESSONS:
  SELECT: Todos
  INSERT/UPDATE/DELETE: Admin

COURSE_PROGRESS:
  SELECT: Próprio + Admin
  INSERT/UPDATE: Próprio
```

---

### 📅 CALENDAR (Agenda)

**Propósito**: Eventos da empresa, setor e pessoais

**Políticas**:
- Admins veem tudo
- Eventos de empresa: todos veem
- Eventos de setor: setor vê
- Eventos pessoais: criador + participantes
- Criar respeitando restrições por tipo

**Lógica de Acesso**:
```
SELECT:
  ├─ Admin: Tudo
  ├─ Empresa: Todos veem
  ├─ Setor: Usuários do setor
  └─ Pessoal: Participantes

INSERT:
  ├─ Pessoal: Qualquer um
  ├─ Setor: Gerente do setor ou Admin
  └─ Empresa: Admin

UPDATE/DELETE: Criador do evento
```

---

## Testando as Políticas

### ✅ Teste 1: Verificar Estrutura

```sql
-- Verificar que todas as tabelas têm RLS habilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Resultado esperado: rowsecurity = true para todas
```

### ✅ Teste 2: Contar Políticas

```sql
-- Contar políticas por tabela
SELECT
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Esperado:
-- calendar_events: 9
-- chat_rooms: 4
-- courses: 4
-- course_progress: 5
-- drive_items: 7
-- messages: 2
-- shared_access: 4
-- tasks: 6
-- ticket_comments: 4
-- ticket_history: 2
-- tickets: 4
-- users: 4
```

### ✅ Teste 3: Testar Login e Acesso

```bash
# No seu aplicativo, teste:

# 1. Login como Admin
npm run dev
# → Acessar /login
# → Email: eu@vibedistro.com (Admin)
# → Senha: password123
# → Verificar acesso a TUDO

# 2. Login como Gerente
# → Email: joao.silva@vibedistro.com (Gerente - A&R)
# → Senha: password123
# → Verificar acesso limitado ao setor

# 3. Login como Colaborador
# → Email: maria.santos@vibedistro.com (Colaborador - Marketing)
# → Senha: password123
# → Verificar acesso ainda mais limitado
```

### ✅ Teste 4: Verificar Bloqueio de Acesso

```typescript
// Seu hook (ex: useTasks.ts) tentará buscar dados
// Se a query retornar vazia = RLS está bloqueando corretamente

// Teste no navegador Console:
const supabase = createClient(...)
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('sector', 'Financeiro')  // Você não está neste setor

// Resultado esperado:
// - data = [] (vazio)
// - error = null (sem erro, mas acesso negado)
```

---

## Troubleshooting

### ❌ Problema: "Permission denied" ao fazer query

**Causa**: RLS está bloqueando porque usuário não tem acesso

**Solução**:
1. Verificar que usuário está autenticado: `auth.uid()`
2. Verificar que usuário existe em `public.users`
3. Verificar setor/role do usuário
4. Revisar a política RLS relevante

```sql
-- Debug: Ver qual é o current_user
SELECT auth.uid();

-- Debug: Ver dados do usuário
SELECT id, email, sector, role
FROM public.users
WHERE id = auth.uid();

-- Debug: Tentar query com todos os filtros
SELECT * FROM public.tasks
WHERE sector = 'Seu Setor';
```

### ❌ Problema: "Violação de CHECK constraint"

**Causa**: Tentando inserir dados que violam regras

**Exemplo**: Setor na tabela não existe, ou role inválido

**Solução**: Verificar enums:
```sql
-- Ver valores válidos de sector
SELECT enum_range(NULL::sector_type);

-- Ver valores válidos de role
SELECT enum_range(NULL::role_type);
```

### ❌ Problema: Usuário não consegue compartilhar arquivo

**Causa**: `shared_by` precisa ser o proprietário do arquivo

**Solução**:
```sql
-- Verificar que o arquivo é seu
SELECT id, name, uploaded_by
FROM public.drive_items
WHERE id = 'seu-arquivo-id'
AND uploaded_by = auth.uid();

-- Se vazio = arquivo não é seu
```

### ❌ Problema: Manager não consegue ver tarefas de outro setor

**Causa**: Política está limitando view

**Solução**:
```sql
-- Verificar policy de tasks
SELECT * FROM pg_policies
WHERE tablename = 'tasks'
AND policyname LIKE 'manager%';

-- Tentar como manager (sem filtro de setor)
SELECT DISTINCT sector FROM public.tasks;
```

### ❌ Problema: Chat room não aparece

**Causa**: Usuário não é participante

**Solução**:
```sql
-- Verificar se você está no array de participantes
SELECT id, name, participants
FROM public.chat_rooms
WHERE auth.uid() = ANY(participants);

-- Adicionar a si mesmo:
UPDATE public.chat_rooms
SET participants = array_append(participants, auth.uid())
WHERE id = 'room-id';
```

---

## Boas Práticas

### 🎯 Desenvolvimento

1. **Sempre testar com diferentes roles**
   ```bash
   # Teste com 3 contas diferentes:
   # - 1 Admin
   # - 1 Gerente
   # - 1 Colaborador
   ```

2. **Usar variáveis de query parametrizadas**
   ```typescript
   // ✅ BOM - Supabase cuida da sanitização
   const { data } = await supabase
     .from('tasks')
     .select('*')
     .eq('id', taskId)

   // ❌ RUIM - SQL injection possível
   const query = `SELECT * FROM tasks WHERE id = '${taskId}'`
   ```

3. **Verificar resultados vazios com cuidado**
   ```typescript
   // RLS pode retornar vazio sem erro
   const { data, error } = await supabase
     .from('tasks')
     .select('*')
     .eq('sector', 'Financeiro')

   if (!data?.length) {
     // Pode ser: sem acesso (RLS) ou realmente vazio?
     // Sempre assumir: sem acesso
   }
   ```

4. **Logar erros de RLS**
   ```typescript
   const { data, error } = await supabase...

   if (error?.message.includes('permission')) {
     console.error('RLS denied access:', error)
     // Usuário não tem permissão
   }
   ```

### 🔐 Segurança

1. **Nunca confie apenas no frontend**
   - Frontend pode ser hackeado
   - RLS é a última linha de defesa
   - Use RLS para dados sensíveis

2. **Revisar policies regularmente**
   ```bash
   # Script para gerar relatório de policies
   npm run audit:rls
   ```

3. **Testar com SQL injection**
   ```typescript
   // Tentar quebrar com payload
   const malicious = "'; DROP TABLE users; --"
   const { data } = await supabase
     .from('users')
     .select('*')
     .eq('email', malicious)

   // Resultado esperado: Query com escape, sem erro
   ```

4. **Usar service_role apenas no backend**
   ```typescript
   // ❌ NUNCA exponha service role key no frontend
   // ✅ Use apenas no servidor (API routes)
   const adminClient = createClient(
     supabaseUrl,
     supabaseServiceRoleKey  // Apenas no servidor!
   )
   ```

### 📊 Monitoramento

1. **Verificar logs de erro**
   ```bash
   # Supabase Console → Logs → Filter by "permission"
   ```

2. **Contar queries bloqueadas**
   ```sql
   -- Query para ver quantas vezes RLS bloqueou
   -- (requer pg_stat_statements habilitado)
   SELECT query, calls
   FROM pg_stat_statements
   WHERE query LIKE '%permission%'
   ```

3. **Performance das policies**
   ```sql
   -- Se query está lenta, revisar indexes
   -- Garantir que existem indexes em:
   -- - sector (para filtros)
   -- - role (para verificações)
   -- - participants (para chat)

   \d+ public.users
   \d+ public.tasks
   -- Ver section "Indexes"
   ```

### 🚀 Deployment

1. **Antes de ir para produção**
   ```bash
   ✅ Rodar todos os testes
   ✅ Testar com diferentes roles
   ✅ Revisar policies com time
   ✅ Backup do banco de dados
   ✅ Plano de rollback
   ```

2. **Documentar mudanças**
   ```markdown
   # Release v1.5.0

   ## RLS Changes
   - Added new policy for shared_access.update
   - Modified task_collaborator_view_own_sector
   - Removed deprecated calendar_events_select_old

   ## Testing Checklist
   - [ ] Admin access working
   - [ ] Manager access limited correctly
   - [ ] Collaborator cannot access other sectors
   - [ ] Shared files accessible
   ```

3. **Monitorar após deploy**
   ```bash
   # Primeira hora: Monitorar logs
   # Primeira semana: Monitorar performance
   # Sempre: Monitorar erros de "permission"
   ```

---

## 📞 Suporte

Se tiver dúvidas sobre RLS:

1. **Documentação Oficial**
   - [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
   - [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

2. **Testes**
   - Execute o script `rls-policies-complete.sql`
   - Use as queries de validação fornecidas
   - Teste com 3 usuários de roles diferentes

3. **Checklist de Implementação**
   - [ ] Script executado sem erros
   - [ ] Todas as 15 tabelas com RLS habilitado
   - [ ] 70+ políticas criadas
   - [ ] Funções auxiliares working
   - [ ] Testes de acesso passando
   - [ ] Documentação atualizada
   - [ ] Team revisou policies
   - [ ] Backup realizado

---

**Versão**: 1.0
**Data**: Janeiro 2026
**Status**: ✅ Pronto para Produção
