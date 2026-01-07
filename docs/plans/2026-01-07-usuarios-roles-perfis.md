# Plano: Correção de Distribuição de Roles e Perfis Individuais

**Data:** 2026-01-07
**Status:** Em Planejamento
**Prioridade:** Alta

---

## 1. Análise do Problema Atual

### 1.1 Situação Identificada

O usuário reportou que:
- Todos os usuários recém-criados estão com o **mesmo role**
- É necessário separar as contas entre os 3 roles disponíveis: Admin, Gerente e Colaborador
- Cada conta precisa ter perfil individual funcional para:
  - Receber mensagens diretas (Chat)
  - Receber tasks atribuídas
  - Gerenciar tarefas de forma individual

### 1.2 Análise da Arquitetura Atual

**Criação de Usuários:**
- Script `create-admin-users.ts`: Cria apenas 2 usuários Admin (dotivomaciel@gmail.com e k2publicidade@yahoo.com.br)
- **PROBLEMA IDENTIFICADO**: Não existe migration ou script para criar os 20 usuários mockados com distribuição de roles

**Mock Data (src/lib/mock-data.ts):**
- Define 20 usuários com distribuição clara de roles:
  - **2 Admins**: "Você" (current-user) e "João Silva" (A&R)
  - **7 Gerentes**: 1 por setor (Ana Costa - A&R, Maria Santos - Marketing, Carlos Oliveira - Financeiro, Patricia Lima - Jurídico, Beatriz Ferreira - Administrativo, Gustavo Ribeiro - TI/Suporte, Isabella Santos - Atendimento ao Artista)
  - **11 Colaboradores**: Restante distribuído pelos setores

**Script de Seed (seed-supabase.ts):**
- Busca usuários existentes no banco e mapeia para IDs mockados
- **PROBLEMA**: Assume que os usuários já existem no banco, mas não há migration para criá-los

**Sistema de Autenticação:**
- Trigger `handle_new_user()` cria profile automaticamente ao fazer signup
- Default: setor "Administrativo" e role "Colaborador"
- **LIMITAÇÃO**: Não há forma de criar usuários com roles específicos em massa

### 1.3 Sistema de Permissões via RLS (Row Level Security)

O sistema já possui RLS Policies robustas:

**Tasks:**
- **Admin**: Full access (SELECT, INSERT, UPDATE, DELETE)
- **Gerente**: Manage own sector tasks + view all sectors
- **Colaborador**: View own sector + update assigned tasks

**Tickets:**
- **Admin e Gerente**: Manage all tickets
- **Colaborador**: View own tickets (requester or assigned_to) + create tickets

**Chat:**
- Todos podem criar DMs
- Apenas Admins podem criar salas de setor
- Usuários veem apenas mensagens de salas em que participam

**Drive:**
- **Admin**: Manage all items
- **Todos**: View public items + own sector items + shared items
- Upload limitado ao próprio setor

**Calendar:**
- **Admin**: View all events
- **Gerente**: Create company events
- **Todos**: View company events + own sector events + events they attend

**Courses:**
- **Admin**: Manage courses/lessons
- **Todos**: View courses + manage own progress

### 1.4 Funcionalidade de Perfis Individuais

**Status Atual: ✅ FUNCIONANDO**

O sistema já suporta perfis individuais:

1. **Tasks:**
   - Campo `assigned_to` (UUID) - atribui task a um usuário específico
   - Campo `created_by` (UUID) - rastreia criador
   - Hooks filtram por `assignedTo` e `createdBy`

2. **Tickets:**
   - Campo `assigned_to` (UUID) - atribui ticket a um usuário
   - Campo `requester` (UUID) - solicitante
   - RLS garante que usuário vê apenas tickets que criou ou foi atribuído

3. **Chat:**
   - DMs funcionam via campo `participants` (UUID[])
   - Hook `useChat` busca todos os usuários disponíveis
   - Cada usuário tem perfil único com ID, nome, email, avatar

4. **Comentários de Tickets:**
   - Campo `user_id` (UUID) - identifica autor do comentário
   - RLS filtra comentários por tickets acessíveis

**Conclusão:** O sistema de perfis individuais já está implementado e funcional. O único problema é a **falta de usuários mockados no banco** com distribuição correta de roles.

---

## 2. Distribuição Proposta de Roles

### 2.1 Quantidades Recomendadas

**Total de Usuários: 20**

- **2 Admins** (10%): Acesso total ao sistema
  - Justificativa: Suficiente para administração sem sobrecarga

- **7 Gerentes** (35%): 1 por setor
  - Justificativa: Cada setor precisa de 1 líder para gerenciar equipe

- **11 Colaboradores** (55%): Maioria da equipe
  - Justificativa: Representação realista de hierarquia empresarial

### 2.2 Distribuição por Setor

| Setor                      | Admin | Gerente | Colaborador | Total |
|----------------------------|-------|---------|-------------|-------|
| Administrativo             | 1     | 1       | 2           | 4     |
| A&R                        | 1     | 1       | 1           | 3     |
| Marketing                  | -     | 1       | 2           | 3     |
| Financeiro                 | -     | 1       | 2           | 3     |
| Jurídico                   | -     | 1       | 1           | 2     |
| TI/Suporte                 | -     | 1       | 1           | 2     |
| Atendimento ao Artista     | -     | 1       | 2           | 3     |
| **TOTAL**                  | **2** | **7**   | **11**      | **20**|

### 2.3 Lista Completa de Usuários com Roles

```
ADMINS (2):
1. eu@vibedistro.com - Você (Administrativo) - Admin
2. joao.silva@vibedistro.com - João Silva (A&R) - Admin

GERENTES (7):
3. ana.costa@vibedistro.com - Ana Costa (A&R) - Gerente
4. maria.santos@vibedistro.com - Maria Santos (Marketing) - Gerente
5. carlos.oliveira@vibedistro.com - Carlos Oliveira (Financeiro) - Gerente
6. patricia.lima@vibedistro.com - Patricia Lima (Jurídico) - Gerente
7. beatriz.ferreira@vibedistro.com - Beatriz Ferreira (Administrativo) - Gerente
8. gustavo.ribeiro@vibedistro.com - Gustavo Ribeiro (TI/Suporte) - Gerente
9. isabella.santos@vibedistro.com - Isabella Santos (Atendimento ao Artista) - Gerente

COLABORADORES (11):
10. lucas.pereira@vibedistro.com - Lucas Pereira (A&R) - Colaborador
11. felipe.alves@vibedistro.com - Felipe Alves (Marketing) - Colaborador
12. camila.rocha@vibedistro.com - Camila Rocha (Marketing) - Colaborador
13. juliana.mendes@vibedistro.com - Juliana Mendes (Financeiro) - Colaborador
14. rafael.gomes@vibedistro.com - Rafael Gomes (Financeiro) - Colaborador
15. eduardo.martins@vibedistro.com - Eduardo Martins (Jurídico) - Colaborador
16. marcus.sousa@vibedistro.com - Marcus Sousa (Administrativo) - Colaborador
17. sophia.dias@vibedistro.com - Sophia Dias (Administrativo) - Colaborador
18. vanessa.tech@vibedistro.com - Vanessa Tech (TI/Suporte) - Colaborador
19. diego.carvalho@vibedistro.com - Diego Carvalho (Atendimento ao Artista) - Colaborador
20. laura.medeiros@vibedistro.com - Laura Medeiros (Atendimento ao Artista) - Colaborador
```

---

## 3. Arquitetura de Permissões Detalhada

### 3.1 Admin (Acesso Total)

**Privilégios:**
- ✅ Ver, criar, editar e deletar TODOS os recursos do sistema
- ✅ Acessar todos os setores
- ✅ Gerenciar usuários (via RLS policy)
- ✅ Criar salas de chat de setor
- ✅ Ver todos os eventos de calendário
- ✅ Gerenciar cursos e lições

**Filtros nos Hooks:**
- Nenhum filtro aplicado
- Queries retornam todos os registros

**Casos de Uso:**
- Supervisão geral da empresa
- Resolução de conflitos entre setores
- Configuração e manutenção do sistema

### 3.2 Gerente (Acesso ao Setor + Leitura Cross-Setor)

**Privilégios:**
- ✅ Gerenciar TUDO no próprio setor
- ✅ Ver (read-only) recursos de outros setores
- ✅ Criar e atribuir tasks/tickets para equipe
- ✅ Criar eventos de empresa (company events)
- ✅ Gerenciar todos os tickets (não só do setor)

**Filtros nos Hooks:**
- **Tasks**: Full access no próprio setor, read-only em outros
- **Tickets**: Full access (conforme RLS)
- **Drive**: Manage own sector items, view public/shared
- **Calendar**: Create company events

**Casos de Uso:**
- Liderar equipe do setor
- Coordenar projetos cross-setor
- Reportar para Admins

### 3.3 Colaborador (Acesso Limitado)

**Privilégios:**
- ✅ Ver tasks/tickets do próprio setor
- ✅ Atualizar tasks atribuídas a si
- ✅ Criar tickets e comentários
- ✅ Participar de DMs e sala de setor
- ✅ Ver e upload de arquivos do setor
- ✅ Ver cursos e gerenciar próprio progresso

**Filtros nos Hooks:**
- **Tasks**: View own sector + assigned tasks
- **Tickets**: View own tickets (requester or assigned_to)
- **Drive**: View public + own sector + shared items
- **Calendar**: View company/sector events + own events

**Casos de Uso:**
- Executar tarefas atribuídas
- Colaborar com equipe do setor
- Solicitar suporte via tickets

---

## 4. RLS Policies - Status Atual

### 4.1 Verificação das Policies Existentes

**✅ TODAS AS POLICIES NECESSÁRIAS JÁ EXISTEM**

As migrations já implementam RLS completo para:
- ✅ users (view all, update own, admins manage)
- ✅ tasks (role-based: admin/gerente/colaborador)
- ✅ tickets (admin/gerente full access, users view own)
- ✅ chat_rooms (participants-based)
- ✅ messages (room participants-based)
- ✅ drive_items (role + sector + sharing-based)
- ✅ courses/lessons/progress (admin manage, users view/progress)
- ✅ calendar_events (role + type + attendees-based)

### 4.2 Nenhuma Alteração Necessária

**Conclusão:** As RLS policies atuais já suportam perfeitamente o sistema de roles proposto. Não é necessário criar ou modificar nenhuma policy.

---

## 5. Ajustes nos Hooks (Não Necessário)

### 5.1 Verificação dos Hooks Existentes

**useAuth:**
- ✅ Busca perfil do usuário da tabela `public.users`
- ✅ Retorna `user.role` corretamente
- ✅ Nenhum ajuste necessário

**useTasks:**
- ✅ Busca todas as tasks (RLS filtra automaticamente)
- ✅ Filtros manuais por `sector`, `assignedTo`, etc.
- ✅ RLS policies já garantem acesso correto por role
- ✅ Nenhum ajuste necessário

**useTickets:**
- ✅ Busca todos os tickets (RLS filtra automaticamente)
- ✅ RLS policies garantem que Admin/Gerente veem tudo, Colaborador vê apenas próprios
- ✅ Nenhum ajuste necessário

**useChat:**
- ✅ Busca rooms onde user está em `participants`
- ✅ Busca todos os usuários disponíveis (para criar DMs)
- ✅ RLS filtra mensagens automaticamente
- ✅ Nenhum ajuste necessário

**useDrive, useCourses, useCalendar:**
- ✅ Todos os hooks confiam nas RLS policies
- ✅ Nenhum ajuste necessário

### 5.2 Conclusão

**Nenhum hook precisa ser modificado.** O sistema foi bem arquitetado para confiar nas RLS policies do Supabase, que já implementam toda a lógica de permissões por role.

---

## 6. Ajustes no Frontend (Opcional)

### 6.1 Filtros de UI por Role (Opcional)

Embora as RLS policies garantam segurança, podemos melhorar a UX ocultando opções que o usuário não pode acessar:

**Exemplos:**

1. **Admin Dashboard:**
   - Mostrar estatísticas de todos os setores
   - Botões de "Gerenciar Usuários", "Configurações Globais"

2. **Gerente Dashboard:**
   - Estatísticas detalhadas do próprio setor
   - Visão resumida de outros setores
   - Botão "Criar Evento da Empresa"

3. **Colaborador Dashboard:**
   - Foco em tasks/tickets atribuídos
   - Estatísticas apenas do próprio setor

**Implementação:**
```typescript
// Exemplo de filtro no frontend (opcional)
const { user } = useAuth()

if (user?.role === 'Admin') {
  // Mostrar todas as opções
} else if (user?.role === 'Gerente') {
  // Mostrar opções de gerente
} else {
  // Mostrar opções básicas
}
```

**Status:** Opcional - o sistema funciona sem isso, mas melhora UX.

---

## 7. Migration para Criar Usuários Mockados

### 7.1 Nova Migration: 013_seed_mock_users.sql

**Objetivo:** Criar 20 usuários mockados com distribuição correta de roles.

**Desafio:**
- Supabase Auth não aceita INSERT direto em `auth.users` via SQL
- É necessário usar Admin API do Supabase

**Solução:** Criar script TypeScript que usa Supabase Admin API.

### 7.2 Script: create-mock-users.ts

**Localização:** `scripts/create-mock-users.ts`

**Funcionalidade:**
1. Usar `supabase.auth.admin.createUser()` para criar usuário em `auth.users`
2. Criar perfil correspondente em `public.users` com role correto
3. Criar os 20 usuários com distribuição de roles

**Senha Padrão:** `password123` (igual ao mencionado no CLAUDE.md)

### 7.3 Pseudocódigo

```typescript
const mockUsers = [
  {
    email: 'eu@vibedistro.com',
    name: 'Você',
    sector: 'Administrativo',
    role: 'Admin',
  },
  {
    email: 'joao.silva@vibedistro.com',
    name: 'João Silva',
    sector: 'A&R',
    role: 'Admin',
  },
  // ... (18 usuários restantes)
]

for (const userData of mockUsers) {
  // 1. Criar em auth.users
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: userData.name }
  })

  // 2. Criar em public.users (bypass RLS com service_role_key)
  await supabase.from('users').insert({
    id: authUser.user.id,
    email: userData.email,
    name: userData.name,
    sector: userData.sector,
    role: userData.role,
    avatar: null,
  })
}
```

---

## 8. Atualização do Script de Seed

### 8.1 Ajustes em seed-supabase.ts

**Problema Atual:**
- Script assume que usuários já existem
- Mapeia por ordem alfabética de email (pode não corresponder aos IDs mockados)

**Solução:**
- Mapear usuários por **email** ao invés de índice
- Garantir que seed funcione após criar os 20 usuários

**Ajuste no Mapeamento:**

```typescript
async function getUserMapping() {
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .order('email')

  // Mapear por email para garantir correspondência
  const emailToIdMap = users.reduce((acc, user) => {
    acc[user.email] = user.id
    return acc
  }, {} as Record<string, string>)

  // Criar mapeamento de mock IDs para UUIDs reais
  const mockToRealIdMap = {
    'current-user': emailToIdMap['eu@vibedistro.com'],
    'user-001': emailToIdMap['joao.silva@vibedistro.com'],
    'user-002': emailToIdMap['ana.costa@vibedistro.com'],
    // ... (mapeamento completo)
  }

  return mockToRealIdMap
}
```

---

## 9. Checklist de Implementação

### Fase 1: Preparação
- [ ] Ler arquivo `src/lib/mock-data.ts` para confirmar lista de 20 usuários
- [ ] Verificar que RLS policies estão corretas (já verificado ✅)
- [ ] Verificar que hooks estão funcionando (já verificado ✅)

### Fase 2: Criar Script de Usuários
- [ ] Criar `scripts/create-mock-users.ts`
- [ ] Implementar função para criar 20 usuários via Admin API
- [ ] Adicionar distribuição correta de roles
- [ ] Testar criação de 1 usuário de cada role

### Fase 3: Atualizar Script de Seed
- [ ] Modificar `scripts/seed-supabase.ts`
- [ ] Ajustar mapeamento de IDs para usar emails
- [ ] Criar mapeamento completo de mock IDs → UUIDs reais

### Fase 4: Executar Scripts
- [ ] Executar `npx tsx scripts/create-mock-users.ts`
- [ ] Verificar que 20 usuários foram criados no Supabase
- [ ] Executar `npx tsx scripts/seed-supabase.ts`
- [ ] Verificar que tasks, tickets, chat, etc. foram populados

### Fase 5: Testes
- [ ] Login com Admin (`eu@vibedistro.com`)
  - [ ] Verificar acesso total a todos os setores
  - [ ] Verificar que vê todas as tasks/tickets
- [ ] Login com Gerente (`maria.santos@vibedistro.com`)
  - [ ] Verificar acesso total ao setor Marketing
  - [ ] Verificar leitura em outros setores
  - [ ] Verificar que pode criar eventos de empresa
- [ ] Login com Colaborador (`felipe.alves@vibedistro.com`)
  - [ ] Verificar que vê apenas tasks do setor Marketing
  - [ ] Verificar que só atualiza tasks atribuídas a ele
  - [ ] Verificar que vê apenas tickets que criou ou foi atribuído

### Fase 6: Verificação de Perfis Individuais
- [ ] Criar task atribuída a usuário específico
  - [ ] Verificar que aparece no perfil do usuário atribuído
- [ ] Criar DM entre 2 usuários
  - [ ] Verificar que apenas eles veem a conversa
- [ ] Atribuir ticket a usuário específico
  - [ ] Verificar notificação individual
- [ ] Verificar upload de arquivo
  - [ ] Verificar que `uploaded_by` identifica usuário correto

### Fase 7: Documentação
- [ ] Atualizar `CLAUDE.md` com informações de roles
- [ ] Atualizar `README.md` se necessário
- [ ] Documentar credenciais dos 20 usuários

---

## 10. Arquivos a Criar/Modificar

### Criar:
1. **`scripts/create-mock-users.ts`**
   - Script principal para criar 20 usuários com roles corretos
   - Usa Supabase Admin API

### Modificar:
2. **`scripts/seed-supabase.ts`**
   - Ajustar mapeamento de IDs de usuários
   - Usar emails para mapear ao invés de índices

### Opcional (Melhoria de UX):
3. **`src/app/(dashboard)/page.tsx`**
   - Adicionar filtros de UI baseados em role
   - Mostrar estatísticas relevantes por role

4. **`src/components/layout/Sidebar.tsx`**
   - Ocultar opções não disponíveis para cada role

---

## 11. Credenciais dos Usuários (Para Testes)

**Senha Padrão para Todos:** `password123`

### Admins:
- `eu@vibedistro.com` - Você (Administrativo)
- `joao.silva@vibedistro.com` - João Silva (A&R)

### Gerentes (1 por setor):
- `ana.costa@vibedistro.com` - Ana Costa (A&R)
- `maria.santos@vibedistro.com` - Maria Santos (Marketing)
- `carlos.oliveira@vibedistro.com` - Carlos Oliveira (Financeiro)
- `patricia.lima@vibedistro.com` - Patricia Lima (Jurídico)
- `beatriz.ferreira@vibedistro.com` - Beatriz Ferreira (Administrativo)
- `gustavo.ribeiro@vibedistro.com` - Gustavo Ribeiro (TI/Suporte)
- `isabella.santos@vibedistro.com` - Isabella Santos (Atendimento ao Artista)

### Colaboradores:
- `lucas.pereira@vibedistro.com` - Lucas Pereira (A&R)
- `felipe.alves@vibedistro.com` - Felipe Alves (Marketing)
- `camila.rocha@vibedistro.com` - Camila Rocha (Marketing)
- `juliana.mendes@vibedistro.com` - Juliana Mendes (Financeiro)
- `rafael.gomes@vibedistro.com` - Rafael Gomes (Financeiro)
- `eduardo.martins@vibedistro.com` - Eduardo Martins (Jurídico)
- `marcus.sousa@vibedistro.com` - Marcus Sousa (Administrativo)
- `sophia.dias@vibedistro.com` - Sophia Dias (Administrativo)
- `vanessa.tech@vibedistro.com` - Vanessa Tech (TI/Suporte)
- `diego.carvalho@vibedistro.com` - Diego Carvalho (Atendimento ao Artista)
- `laura.medeiros@vibedistro.com` - Laura Medeiros (Atendimento ao Artista)

---

## 12. Riscos e Mitigações

### Risco 1: Conflito de IDs ao Criar Usuários
**Mitigação:**
- Deletar todos os usuários antes de criar (como faz `create-admin-users.ts`)
- Ou verificar se email já existe antes de criar

### Risco 2: Mapeamento Incorreto no Seed
**Mitigação:**
- Usar emails como chave de mapeamento (mais confiável que índices)
- Validar que todos os 20 emails foram mapeados antes de inserir dados

### Risco 3: RLS Policies Impedem Seed
**Mitigação:**
- Script usa `service_role_key` que bypassa RLS
- Já implementado corretamente em `seed-supabase.ts`

### Risco 4: Usuários Não Conseguem Logar
**Mitigação:**
- Usar `email_confirm: true` ao criar usuário
- Senha simples (`password123`) para testes
- Documentar credenciais claramente

---

## 13. Próximos Passos (Pós-Implementação)

1. **Adicionar Filtros de UI por Role** (Opcional)
   - Melhorar UX ocultando opções não disponíveis
   - Customizar dashboard por role

2. **Adicionar Notificações Baseadas em Role** (Futuro)
   - Admins recebem notificações críticas
   - Gerentes recebem resumos do setor
   - Colaboradores recebem apenas tasks atribuídas

3. **Relatórios por Role** (Futuro)
   - Admin vê relatórios globais
   - Gerente vê relatórios do setor
   - Colaborador vê próprio desempenho

4. **Onboarding por Role** (Futuro)
   - Tours diferentes para cada role
   - Documentação específica

---

## 14. Conclusão

### Status do Sistema

**✅ Arquitetura PRONTA:**
- RLS Policies completas e funcionais
- Hooks configurados corretamente
- Sistema de perfis individuais implementado
- Suporte a tasks, tickets, chat, drive por usuário

**❌ Falta APENAS:**
- Criar os 20 usuários mockados no banco
- Distribuir roles corretamente (2 Admins, 7 Gerentes, 11 Colaboradores)
- Atualizar script de seed para mapear usuários corretamente

### Impacto da Implementação

**Baixo Risco:**
- Nenhuma alteração em código existente (hooks, components)
- Apenas criação de script novo e ajuste mínimo no seed
- RLS policies já garantem segurança

**Alto Valor:**
- Sistema ficará completo com usuários realistas
- Testes de permissões serão possíveis
- Demonstração do sistema será mais profissional

**Tempo Estimado:** 2-3 horas de desenvolvimento + 1 hora de testes

---

## 15. Critical Files for Implementation

- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\scripts\create-mock-users.ts` - [Razão: Script novo a ser criado para popular usuários com roles corretos]
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\scripts\seed-supabase.ts` - [Razão: Ajustar mapeamento de IDs de usuários por email]
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\mock-data.ts` - [Razão: Referência para lista completa de 20 usuários e distribuição de roles]
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\docs\supabase-migrations.sql` - [Razão: Referência para RLS policies existentes que suportam o sistema de roles]
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\CLAUDE.md` - [Razão: Atualizar documentação com informações de roles e credenciais]
