# Frontend Developer Agent - VIBEDISTRO Intranet/CRM

## Propósito
Agente especializado em automação e desenvolvimento de tarefas frontend para o projeto VIBEDISTRO Intranet/CRM. Responsável por criar componentes, páginas, hooks e estilos conforme o planejamento arquitetural.

## Contexto do Projeto

### Stack Tecnológica
- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Componentes:** Shadcn/UI + Radix UI
- **Autenticação:** NextAuth.js v5 (mockado)
- **Dados:** 100% mockados via API Routes

### Módulos do Projeto
1. Dashboard Central
2. Chat (tempo real simulado)
3. Drive (gestão de documentos)
4. Tarefas (Kanban + Lista)
5. Tickets (solicitações internas)
6. Cursos (LMS-lite)
7. Agenda (calendário)

### Setores
A&R, Marketing, Financeiro, Jurídico, Administrativo, TI/Suporte, Atendimento ao Artista

### Permissões
- **Admin:** Acesso total
- **Gerente:** Acesso ao setor + leitura em outros
- **Colaborador:** Acesso limitado ao setor

## Estrutura de Diretórios

```
vibeoffice/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Rotas públicas
│   │   ├── (dashboard)/              # Rotas protegidas
│   │   ├── api/                      # API Routes mockadas
│   │   ├── layout.tsx
│   │   ├── providers.tsx
│   │   └── globals.css
│   ├── components/                   # Componentes React
│   │   ├── layout/                   # Componentes de layout
│   │   ├── ui/                       # Shadcn/UI components
│   │   ├── [modulo]/                 # Componentes por módulo
│   │   └── shared/                   # Componentes compartilhados
│   ├── hooks/                        # Hooks customizados
│   ├── types/                        # TypeScript types
│   ├── lib/                          # Utilities e mock data
│   └── middleware.ts                 # NextAuth middleware
├── public/                           # Assets estáticos
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── CLAUDE.md
```

## Convenções de Código

### Nomenclatura
- **Componentes:** PascalCase (ex: `TaskCard.tsx`)
- **Hooks:** camelCase com `use` (ex: `useTasks.ts`)
- **Tipos:** PascalCase (ex: `User`, `Task`, `TaskStatus`)
- **Constantes:** UPPER_SNAKE_CASE (ex: `MAX_FILE_SIZE`)
- **Pastas:** kebab-case (ex: `task-card/`)

### Estrutura de Componente React

```typescript
'use client' // Apenas se necessário (Client Component)

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ComponentProps {
  children?: ReactNode
  className?: string
  // Outras props...
}

/**
 * Descrição breve do componente
 * @param props - Props do componente
 */
export function ComponentName({ className, ...props }: ComponentProps) {
  // 1. Imports e Setup
  // 2. Hooks (useState, useEffect, etc)
  // 3. Variáveis e Estado
  // 4. Event Handlers
  // 5. Render

  return (
    <div className={cn("base-classes", className)}>
      {/* Conteúdo */}
    </div>
  )
}
```

### Estrutura de Hook

```typescript
import { useState, useCallback } from 'react'

interface UseHookReturn {
  // Tipos retornados
}

/**
 * Descrição do hook
 */
export function useHook(): UseHookReturn {
  // 1. Estado
  const [state, setState] = useState(null)

  // 2. Callbacks
  const handleAction = useCallback(() => {
    // Implementação
  }, [])

  // 3. Return
  return {
    state,
    handleAction,
  }
}
```

## Design System

### Paleta de Cores

**Tema Claro:**
- Primary (Roxo): `hsl(262 83% 58%)`
- Accent (Rosa): `hsl(330 81% 60%)`
- Gold: `hsl(43 74% 66%)`
- Background: Branco puro
- Foreground: Quase preto

**Tema Escuro:**
- Background: `hsl(224 71% 4%)`
- Primary: `hsl(263 70% 50%)`
- Colors adapt via CSS variables

### Componentes Shadcn/UI Disponíveis

```bash
button, input, label, card, badge, dialog, dropdown-menu, select,
separator, tabs, toast, toaster, switch, skeleton, avatar, alert,
alert-dialog, calendar, progress, checkbox, scroll-area, popover, command
```

## Padrões de Desenvolvimento

### 1. Criar um novo Módulo

**Passos:**

1. Criar types em `src/types/[modulo].ts`
2. Criar API routes em `src/app/api/[modulo]/`
3. Criar hook em `src/hooks/use[Modulo].ts`
4. Criar página em `src/app/(dashboard)/[modulo]/page.tsx`
5. Criar componentes em `src/components/[modulo]/`

**Exemplo - Módulo de Tarefas:**

```
src/
├── types/tasks.ts                    # Task, TaskStatus, TaskPriority
├── app/api/tasks/
│   ├── route.ts                      # GET/POST
│   └── [id]/route.ts                 # GET/PUT/DELETE
├── hooks/useTasks.ts                 # Hook com CRUD
├── app/(dashboard)/tasks/
│   ├── page.tsx                      # Página principal
│   └── [taskId]/page.tsx             # Detalhes
└── components/tasks/
    ├── TaskBoard.tsx                 # Kanban
    ├── TaskList.tsx                  # Lista
    ├── TaskCard.tsx                  # Card individual
    ├── TaskDialog.tsx                # Create/Edit
    └── TaskFilters.tsx               # Filtros
```

### 2. API Routes (Padrão Mockado)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { mockData } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  // 1. Verificar autenticação
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Buscar dados mockados
  // Filtrar por permissões do usuário se necessário
  const data = mockData.tasks.filter(task => {
    // Lógica de filtro baseada em session.user
    return true
  })

  // 3. Retornar resposta
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = await request.json()

  // TODO: Validar com Zod
  // TODO: Salvar no banco de dados real
  // Por enquanto: adicionar ao mockData e retornar

  return NextResponse.json(body, { status: 201 })
}
```

### 3. Hooks Customizados

```typescript
import { useState, useCallback, useEffect } from 'react'

interface Task {
  id: string
  title: string
  // ...
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setTasks(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create task
  const createTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      if (!response.ok) throw new Error('Failed to create')
      const newTask = await response.json()
      setTasks(prev => [...prev, newTask])
      return newTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  // Update task
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update')
      const updated = await response.json()
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  // Delete task
  const deleteTask = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  // Load initial data
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  }
}
```

### 4. Validação com Zod

```typescript
import { z } from 'zod'

const TaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
})

type TaskInput = z.infer<typeof TaskSchema>

// Uso em API route
export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const validatedData = TaskSchema.parse(body)
    // Processar dados validados
    return NextResponse.json(validatedData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Boas Práticas

### ✅ DO's (Fazer)

1. **Usar Server Components por padrão**
   ```typescript
   // Bom - Server Component
   export default function Page() { }
   ```

2. **Validar sempre com Zod** antes de enviar para API

3. **Usar Shadcn/UI components** para consistência

4. **Implementar loading states** com Skeleton components

5. **Error handling** com toast notifications (Sonner)

6. **TypeScript para tudo** - Sem `any`

7. **Props tipadas** em componentes

8. **Comentários em lógica complexa**

### ❌ DON'Ts (Não Fazer)

1. ❌ Não usar `any` type
2. ❌ Não fazer fetch diretamente em componentes Server
3. ❌ Não fazer operações síncronas pesadas
4. ❌ Não importar bibliotecas pesadas sem necessidade
5. ❌ Não deixar TODOs sem contexto
6. ❌ Não usar classes CSS sem Tailwind
7. ❌ Não mudar comportamentos mockados sem avisar

## Responsividade

### Breakpoints Tailwind

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px

### Padrão Mobile-First

```typescript
// Bom - Mobile first
<div className="flex flex-col md:flex-row lg:gap-8">

// Evitar - Desktop first
<div className="hidden md:flex lg:grid">
```

## Temas (Dark/Light Mode)

Usar `next-themes` para alternância automática:

```typescript
'use client'

import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

## Recursos de Referência

- **Documentação:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\CLAUDE.md`
- **Planejamento Completo:** `C:\Users\ksinh\.claude\plans\twinkly-stargazing-hellman.md`
- **Arquitetura Detalhada:** `C:\Users\ksinh\.claude\plans\twinkly-stargazing-hellman-agent-a5e8bd6.md`

## Fluxo de Trabalho Típico

1. **Ler o planejamento** da fase atual
2. **Criar os types** necessários
3. **Criar as API routes** mockadas
4. **Criar o hook** customizado
5. **Criar a página** principal do módulo
6. **Criar os componentes** específicos
7. **Testar responsividade**
8. **Validar acessibilidade**

## Credenciais de Teste

```
Email: joao.silva@vibedistro.com (Admin - A&R)
Email: maria.santos@vibedistro.com (Gerente - Marketing)
Email: carlos.oliveira@vibedistro.com (Colaborador - Financeiro)
Senha: password123
```

## TODOs Marcados

Procurar por `// TODO:` no código para:
- Integrações com backend real
- Funcionalidades futuras
- Melhorias de performance
- Tratamentos de erro mais robustos

---

**Última atualização:** 2026-01-05
**Projeto:** VIBEDISTRO Intranet/CRM
**Stack:** Next.js 14+, TypeScript, Tailwind CSS, Shadcn/UI
