# CLAUDE.md - VIBEDISTRO Intranet/CRM

Este arquivo fornece orientação para Claude Code ao trabalhar neste projeto.

## Visão Geral do Projeto

VIBEDISTRO Intranet/CRM é uma aplicação Next.js 14+ completa para gestão interna de uma distribuidora de música. O sistema inclui 7 módulos principais: Dashboard, Chat, Drive, Tarefas, Tickets, Cursos e Agenda.

## Stack Tecnológica

- **Framework:** Next.js 14.2+ (App Router) com TypeScript
- **Autenticação:** NextAuth.js v5 (beta) com provider customizado mockado
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
```

## Estrutura de Dados Mockados

**IMPORTANTE:** Este projeto usa dados **100% mockados** para simular um backend real. Todos os dados estão centralizados em `src/lib/mock-data.ts`.

### Integrações Futuras

Todos os arquivos que precisarão de integração com backend real estão marcados com comentários:

```typescript
// TODO: Integrar com API real em [URL_DA_API]
// TODO: Substituir mock por chamada ao backend
```

Áreas principais que precisarão de integração:
1. **Autenticação:** Trocar NextAuth CredentialsProvider por OAuth2/JWT real
2. **Chat:** Implementar WebSocket real (Socket.io ou similar)
3. **Drive:** Integrar com S3/Azure Blob Storage para upload real
4. **APIs:** Todas as API routes atualmente retornam dados mockados

## Arquitetura de Autenticação

### NextAuth.js v5 com Provider Mockado

- **Arquivo principal:** `src/app/api/auth/[...nextauth]/route.ts`
- **Middleware:** `src/middleware.ts` protege rotas do grupo `(dashboard)`
- **Hook:** `src/hooks/useAuth.ts` para acessar sessão
- **Credenciais de teste:**
  - Email: qualquer email de `mockUsers` em `src/lib/mock-data.ts`
  - Senha: `password123` (para todos os usuários mockados)

### Estrutura de Usuário

Cada usuário tem:
- `id`, `name`, `email`, `avatar`
- `sector`: Um dos 7 setores (A&R, Marketing, Financeiro, Jurídico, Administrativo, TI/Suporte, Atendimento ao Artista)
- `role`: Admin, Gerente ou Colaborador

### Permissões

- **Admin:** Acesso total a todos os módulos e setores
- **Gerente:** Acesso total ao seu setor + leitura em outros
- **Colaborador:** Acesso limitado ao seu setor

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

### Padrão de API Routes

Todas as API routes seguem este padrão:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  // 1. Verificar autenticação
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Buscar dados mockados (filtrar por permissões)
  const data = mockData.filter(/* filtros baseados em session.user */);

  // 3. Retornar resposta
  return NextResponse.json(data);
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
- Simulação de tempo real com `MockChatSimulator`
- Auto-scroll, indicador de "digitando"

### 3. Drive (`/drive`)
- Navegação hierárquica de pastas
- Upload/download mockado
- Controle de acesso por setor
- Preview de arquivos

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

## TODOs Globais para Produção

Antes de ir para produção, substituir:

1. **Autenticação mockada** por OAuth2/JWT real
2. **Mock data** por chamadas de API reais
3. **Chat simulator** por WebSocket real
4. **Upload mockado** por integração S3/Azure Blob
5. **Variáveis de ambiente** com valores de produção

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
