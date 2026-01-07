# CLAUDE.md - VIBEDISTRO Intranet/CRM

Este arquivo fornece orientação para Claude Code ao trabalhar neste projeto.

## Visão Geral do Projeto

VIBEDISTRO Intranet/CRM é uma aplicação Next.js 14+ completa para gestão interna de uma distribuidora de música. O sistema inclui 7 módulos principais: Dashboard, Chat, Drive, Tarefas, Tickets, Cursos e Agenda.

## Stack Tecnológica

- **Framework:** Next.js 14.2+ (App Router) com TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Autenticação:** Supabase Auth (substituiu NextAuth.js)
- **UI:** Shadcn/UI + Radix UI + Tailwind CSS
- **Ícones:** Lucide React
- **Formulários:** React Hook Form + Zod
- **Gráficos:** Recharts
- **Calendário:** React Big Calendar
- **Animações:** Framer Motion
- **Tema:** next-themes (dark/light mode)

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Servidor de produção
npm start

# Linting
npm run lint

# Supabase - Seed do banco de dados
npm run db:seed
```

## Configuração do Supabase

### Variáveis de Ambiente

Certifique-se de ter as seguintes variáveis no arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Migrations

As migrations SQL estão em `docs/supabase-migrations.sql` e incluem:

1. **Enums**: Definições de tipos customizados
2. **Users**: Tabela de usuários (sincronizada com Supabase Auth)
3. **Tasks**: Sistema de tarefas
4. **Tickets**: Sistema de chamados + comentários
5. **Chat**: Salas de chat + mensagens (com Realtime)
6. **Drive**: Arquivos e pastas (com Supabase Storage)
7. **Courses**: Cursos + lições + progresso
8. **Calendar**: Eventos de calendário

### Supabase Storage

- **Bucket**: `drive-files` (público com RLS)
- **RLS Policies**: Upload/download/delete baseado em autenticação

### Seed do Banco

Para popular o banco com dados de teste:

```bash
npm run db:seed
```

Este comando executa `scripts/seed-supabase.ts` que popula todas as tabelas com dados mockados.

## Dados Mock vs Supabase

**Status Atual:** O projeto foi **migrado para Supabase** (completo em Janeiro/2026).

- ✅ **Autenticação**: Supabase Auth (substituiu NextAuth mock)
- ✅ **Chat**: Mensagens com Supabase Realtime subscriptions
- ✅ **Drive**: Upload real para Supabase Storage
- ✅ **Banco de Dados**: PostgreSQL via Supabase
- ⚠️ **Mock Data**: `src/lib/mock-data.ts` ainda existe para referência e seed, mas **não é usado pelos hooks**

### Hooks Migrados (usam Supabase)

Todos os hooks foram migrados para Supabase queries:

1. **useAuth** - Supabase Auth + tabela users
2. **useTasks** - CRUD na tabela tasks
3. **useTickets** - CRUD em tickets + ticket_comments
4. **useChat** - chat_rooms + messages com Realtime
5. **useDrive** - drive_items + Supabase Storage
6. **useCourses** - courses + lessons + course_progress
7. **useCalendar** - calendar_events

## Arquitetura de Autenticação

### Supabase Auth (migrado de NextAuth.js)

- **Auth Backend:** Supabase Auth gerencia sessões e usuários
- **Middleware:** `src/middleware.ts` protege rotas com Supabase SSR
- **Hook:** `src/hooks/useAuth.ts` para acessar sessão e user profile
- **Auth Service:** `src/lib/auth.ts` - funções server-side (getSession, signIn, signOut)

### Usuários de Teste

20 usuários foram criados via migration `009_seed_mock_users.sql`:

- **Email**: eu@vibedistro.com, joao.silva@vibedistro.com, maria.santos@vibedistro.com, etc.
- **Senha**: `password123` (para todos os usuários)

### Estrutura de Usuário

Cada usuário tem:
- `id` (UUID), `email`, `name`, `avatar`
- `sector`: Um dos 7 setores (A&R, Marketing, Financeiro, Jurídico, Administrativo, TI/Suporte, Atendimento ao Artista)
- `role`: Admin, Gerente ou Colaborador

### Permissões

- **Admin:** Acesso total a todos os módulos e setores
- **Gerente:** Acesso total ao seu setor + leitura em outros
- **Colaborador:** Acesso limitado ao seu setor

### Como Funciona

1. **Login**: `useAuth().signIn(email, password)` → Supabase Auth
2. **Sessão**: Supabase SSR gerencia cookies de sessão
3. **Middleware**: Redireciona para `/login` se não autenticado
4. **Profile**: useAuth busca dados de `public.users` após login
5. **RLS**: Row Level Security protege dados por usuário

## Organização de Código

### Grupos de Rotas

- `(auth)`: Rotas públicas (login) - Layout sem sidebar
- `(dashboard)`: Rotas protegidas - Layout com sidebar + header

### Convenções de Nomenclatura

- **Componentes:** PascalCase (ex: `TaskCard.tsx`)
- **Hooks:** camelCase com prefixo `use` (ex: `useTasks.ts`)
- **Tipos:** PascalCase (ex: `User`, `Task`)
- **Enums:** PascalCase (ex: `TaskStatus`)
- **Constantes:** UPPER_SNAKE_CASE (ex: `API_ENDPOINTS`)

### Padrão Supabase

Os hooks do projeto seguem este padrão:

1. **Imports**: `supabase` client + `useAuth` hook
2. **State**: useState para dados + isLoading
3. **useEffect**: Fetch dados quando user estiver autenticado
4. **Queries**: `supabase.from('table').select().eq()...`
5. **CRUD**: Métodos async que atualizam banco + estado local
6. **Filters**: useMemo para derivar dados filtrados do state

Exemplo simplificado:
```typescript
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    fetchTasks()
  }, [user])

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*')
    setTasks(data.map(t => ({ /* mapear campos */ })))
  }

  const createTask = async (taskData) => {
    const { data } = await supabase.from('tasks').insert(taskData).select().single()
    setTasks(prev => [data, ...prev])
  }

  return { tasks, createTask }
}
```


### Componentes Shadcn/UI

Componentes já instalados:
- button, input, card, dialog, dropdown-menu, select, badge, avatar
- separator, tabs, toast, toaster, switch, skeleton, calendar, progress, alert

Para adicionar novos componentes:
```bash
npx shadcn-ui@latest add [component-name]
```

## Módulos Principais

### 1. Dashboard (`/`)
- Cards de métricas
- Gráfico de tarefas por setor (Recharts)
- Feed de tickets recentes
- Próximos eventos

### 2. Chat (`/chat`)
- Salas por setor (7 canais)
- DMs entre usuários
- **Mensagens em tempo real** com Supabase Realtime subscriptions
- Auto-scroll, histórico de mensagens

### 3. Drive (`/drive`)
- Navegação hierárquica de pastas
- **Upload/download REAL** com Supabase Storage
- Controle de acesso por setor (via RLS)
- Compartilhamento de arquivos (JSONB shared_with)

### 4. Tarefas (`/tasks`)
- Visualização Kanban (drag & drop)
- Visualização em Lista
- Filtros por setor, prioridade, responsável
- CRUD completo

### 5. Tickets (`/tickets`)
- Sistema de solicitações internas
- Status workflow: Aberto → Em Análise → Em Execução → Concluído
- Timeline de histórico
- Categorias predefinidas

### 6. Cursos (`/courses`)
- Catálogo de cursos internos
- Player de aulas (vídeo embed + texto markdown)
- Sistema de progresso (% concluído)
- Marcar aula como concluída

### 7. Agenda (`/calendar`)
- Calendário com múltiplas visualizações (Mês, Semana, Dia, Agenda)
- Eventos pessoais, de setor e da empresa
- CRUD de eventos
- Filtros por tipo

## Responsividade

- **Mobile First:** Todos os componentes devem ser responsivos
- **Breakpoints Tailwind:** sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1400px)
- **Sidebar:** Colapsável em mobile (hamburguer menu)

### Padrões de Responsividade Obrigatórios

**IMPORTANTE:** Todos os componentes novos devem seguir estes padrões para garantir responsividade perfeita em mobile, tablet e desktop.

#### 1. Container Pattern (SEMPRE usar)
```tsx
// ✅ CORRETO - Usar max-w com padding responsivo
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
  {children}
</div>

// ❌ ERRADO - Largura fixa ou percentual
<div className="w-[90%] mx-auto">
  {children}
</div>
```

#### 2. Grid Pattern (Mobile-First)
```tsx
// ✅ SEMPRE adicionar grid-cols-1 explícito
<div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// ❌ NUNCA omitir grid-cols-1
<div className="grid gap-4 md:grid-cols-2">
```

#### 3. Gap Responsivo
```tsx
// ✅ Gap deve escalar com breakpoints
className="gap-2 md:gap-4 lg:gap-6"
className="space-y-4 md:space-y-6 lg:space-y-8"

// ❌ Gap fixo
className="gap-6"
```

#### 4. Touch Targets (Mínimo 44px)
```tsx
// ✅ Botões com altura mínima 44px
<Button className="min-h-11 min-w-11">  {/* 44px */}

// ✅ Icon buttons
<Button size="icon" className="h-11 w-11">

// ❌ Muito pequeno
<Button size="icon">  {/* 36px - abaixo do mínimo */}
```

#### 5. Tipografia Responsiva
```tsx
// ✅ Escalas responsivas
<h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
<p className="text-sm md:text-base">

// ❌ Tamanho fixo
<h1 className="text-3xl">
```

#### 6. Tabelas (Mobile: Cards | Desktop: Table)
```tsx
// ✅ Com scroll horizontal
<div className="overflow-x-auto rounded-lg border -mx-4 md:mx-0">
  <table className="min-w-full">
    <TableHead className="min-w-[180px]">Título</TableHead>

// ❌ Sem overflow
<table className="w-full">
```

#### 7. Sidebars (Mobile: Hidden | Desktop: Visible)
```tsx
// ✅ Sidebar colapsável
<div className="hidden lg:block lg:w-64 xl:w-80">
  <Sidebar />
</div>

// Mobile: Drawer alternativo (quando necessário)
<Sheet>
  <SheetTrigger>Filtros</SheetTrigger>
  <SheetContent>
    <Sidebar />
  </SheetContent>
</Sheet>

// ❌ Sempre visível
<div className="w-80">
  <Sidebar />
</div>
```

#### 8. Modais Responsivos
```tsx
// ✅ Max-width responsivo com viewport limit
<DialogContent className="max-w-md sm:max-w-lg w-[95vw] max-h-[95vh] overflow-y-auto">

// ❌ Largura fixa
<DialogContent className="max-w-md">
```

#### 9. Spacing Responsivo
```tsx
// ✅ Padding responsivo
className="p-2 sm:p-4 md:p-6"

// ✅ Margin responsivo
className="mb-4 md:mb-6 lg:mb-8"

// ❌ Fixo
className="p-6"
```

#### 10. Imagens e SVGs Responsivos
```tsx
// ✅ Tamanhos responsivos
<div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
  <svg className="w-full h-full">

// ❌ Tamanho fixo
<div className="w-48 h-48">
```

### Breakpoints de Teste

Sempre testar nos seguintes viewports:
- **320px** - Galaxy Fold (edge case)
- **375px** - iPhone SE, iPhone 12/13/14 mini
- **768px** - iPad Mini portrait
- **1024px** - Desktop breakpoint
- **1920px** - Desktop full HD

### Checklist para Novos Componentes

Antes de considerar um componente completo:
- [ ] Testado em < 375px (iPhone SE)
- [ ] Usa padrão de container correto
- [ ] Grids têm grid-cols-1 explícito
- [ ] Gaps são responsivos
- [ ] Touch targets ≥ 44px
- [ ] Tipografia escala com breakpoints
- [ ] Tabelas têm overflow ou cards mobile
- [ ] Sidebars colapsam em mobile
- [ ] Sem larguras fixas (w-[500px], w-[90%])
- [ ] Funciona em dark mode

## Boas Práticas

1. **Sempre validar inputs com Zod** antes de enviar para API
2. **Usar Shadcn/UI components** quando possível (consistência)
3. **Server Components por padrão**, Client Components apenas quando necessário (`'use client'`)
4. **Otimistic updates** em hooks para UX fluida
5. **Loading states** com Skeleton components
6. **Error handling** com toast notifications (Sonner)
7. **Acessibilidade:** ARIA labels, navegação por teclado

## Status da Migração Supabase

✅ **COMPLETO** (Janeiro 2026):

1. ✅ **Autenticação**: Supabase Auth implementado
2. ✅ **Banco de Dados**: PostgreSQL com 8 migrations
3. ✅ **Realtime**: Chat com subscriptions em tempo real
4. ✅ **Storage**: Upload/download real de arquivos
5. ✅ **Hooks**: Todos os 6 hooks migrados
6. ✅ **Seed**: Script de dados mockados criado

## Novas Features (Janeiro 2026)

### Presença Online

O sistema rastreia automaticamente usuários online via Supabase Realtime Presence:

- **Hook**: `usePresence()` retorna `onlineUsers: string[]` (array de user IDs online)
- **Componente**: `OnlineUsersSidebar` exibido na sidebar principal
- **Auto-tracking**: Usuário é registrado ao fazer login
- **Auto-cleanup**: Removido ao fazer logout ou fechar aba
- **Atualização em tempo real**: Lista atualiza automaticamente quando usuários conectam/desconectam

**Implementação:**
```typescript
import { usePresence } from '@/hooks/usePresence'

const { onlineUsers } = usePresence()
// onlineUsers: ['user-id-1', 'user-id-2', ...]
```

### Agenda Integrada

Eventos podem ser vinculados a tasks ou tickets para melhor organização:

- **Campos DB**: `linked_task_id`, `linked_ticket_id` (mutuamente exclusivos)
- **Migration**: `docs/supabase-migrations/011_agenda_integrada.sql`
- **UI**: Tabs no CreateEventModal para selecionar vínculo (Nenhum/Tarefa/Ticket)
- **Visual**: Badges azuis (📋) para tasks, laranjas (🎫) para tickets em todas as views do calendário
- **Filtros**: Apenas items não-concluídos aparecem nos dropdowns
- **Integridade**: Constraint garante que evento tenha no máximo UM vínculo

**Como usar:**
1. Ao criar evento, selecione aba "Tarefa" ou "Ticket"
2. Escolha o item desejado no dropdown
3. Evento aparecerá com badge visual correspondente
4. Vínculo salvo em `calendar_events.linked_task_id` ou `linked_ticket_id`

**Constraint de segurança:**
- ON DELETE SET NULL: Se task/ticket for deletado, evento permanece mas vínculo é limpo
- CHECK: Garante apenas um vínculo por evento

### Bug Fixes Implementados

**1. Calendar Event Creation**
- ✅ Eventos agora persistem corretamente no banco de dados
- ✅ Aparecem imediatamente após criação
- ✅ Toast notifications para feedback ao usuário

**2. Ticket Creation**
- ✅ handleCreateTicket agora aguarda insert antes de mostrar sucesso
- ✅ Usa user.id autenticado em vez de string hardcoded
- ✅ Error handling com try/catch

**3. Kanban Drag & Drop**
- ✅ Mudança de `closestCorners` para `closestCenter` para melhor detecção
- ✅ Metadata adicionada ao sortable para debugging
- ✅ Cards movem suavemente e persistem após refresh

## TODOs Futuros (Opcional)

Para melhorias futuras:

1. **RLS Policies**: Refinar políticas de segurança por setor/role
2. **Testes**: Implementar Jest + React Testing Library
3. **Performance**: Adicionar indexes no banco para queries complexas
4. **Monitoramento**: Integrar Sentry para error tracking
5. **CI/CD**: Configurar GitHub Actions para deploy automático

## Estrutura de Testes (Futura)

```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   └── lib/
```

Usar Jest + React Testing Library quando implementar testes.

## Deploy

**Recomendado:** Vercel (otimizado para Next.js)

```bash
# Build local
npm run build

# Verificar build
npm start
```

Configurar variáveis de ambiente na plataforma de deploy.

---

**Última atualização:** 2026-01-05
