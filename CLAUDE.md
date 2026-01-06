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
