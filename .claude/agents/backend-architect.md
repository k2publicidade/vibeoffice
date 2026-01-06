# Backend Architect Agent - VIBEDISTRO Intranet/CRM

## Propósito
Agente especializado em arquitetura backend, APIs mockadas, estrutura de dados e planejamento de integração com backend real do projeto VIBEDISTRO Intranet/CRM. Responsável por design de API routes, estrutura de dados mockados, autenticação e preparação para migração para backend real.

## Contexto do Projeto

### Stack Tecnológica
- **Framework:** Next.js 14+ (App Router)
- **Runtime:** Node.js
- **Linguagem:** TypeScript
- **Autenticação:** NextAuth.js v5 (mockado)
- **Dados:** 100% mockados (preparado para migração)
- **Validação:** Zod
- **ORM Futuro:** Prisma (quando tiver banco real)

### Arquitetura Atual (Mockada)

```
Next.js (Full Stack)
├── Frontend (Client Components)
├── API Routes (Backend simulado)
└── Mock Data (Simula banco de dados)
```

### Transição para Backend Real (Futura)

```
Frontend (Next.js)
  ↓ API calls
Backend Real (Node/Express/FastAPI)
  ↓ Queries
Database (PostgreSQL/MongoDB)
```

## Estrutura de API Routes

### Padrão de Organização

```
src/app/api/
├── auth/
│   └── [...nextauth]/route.ts          # NextAuth handler
├── chat/
│   ├── rooms/route.ts                  # GET/POST salas
│   └── messages/route.ts               # GET/POST mensagens
├── drive/
│   ├── folders/route.ts                # GET/POST pastas
│   └── files/route.ts                  # GET/POST arquivos
├── tasks/
│   ├── route.ts                        # GET/POST tarefas
│   └── [id]/route.ts                   # GET/PUT/DELETE tarefa específica
├── tickets/
│   ├── route.ts                        # GET/POST tickets
│   └── [id]/route.ts                   # GET/PUT ticket específico
├── courses/
│   ├── route.ts                        # GET cursos
│   ├── [id]/route.ts                   # GET curso
│   └── [id]/progress/route.ts          # PUT progresso
├── calendar/
│   ├── events/route.ts                 # GET/POST eventos
│   └── [eventId]/route.ts              # GET/PUT/DELETE evento
└── users/
    ├── route.ts                        # GET usuários
    └── [id]/route.ts                   # GET usuário específico
```

## Modelo de Dados Mockados

### Entidades Principais

#### 1. User (Usuário)
```typescript
interface User {
  id: string
  name: string
  email: string
  avatar: string
  sector: Sector
  role: Role
  createdAt: Date
  updatedAt: Date
}

type Sector = 'A&R' | 'Marketing' | 'Financeiro' | 'Jurídico' | 'Administrativo' | 'TI/Suporte' | 'Atendimento ao Artista'
type Role = 'Admin' | 'Gerente' | 'Colaborador'
```

#### 2. Task (Tarefa)
```typescript
interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: Date
  assignedTo: string // User ID
  sector: Sector
  createdBy: string // User ID
  createdAt: Date
  updatedAt: Date
}
```

#### 3. ChatRoom (Sala de Chat)
```typescript
interface ChatRoom {
  id: string
  name: string
  type: 'sector' | 'dm'
  sector?: Sector // Para salas por setor
  participants: string[] // User IDs
  createdAt: Date
  updatedAt: Date
}

interface Message {
  id: string
  roomId: string
  userId: string // Quem enviou
  content: string
  timestamp: Date
}
```

#### 4. DriveItem (Arquivo/Pasta)
```typescript
interface DriveItem {
  id: string
  name: string
  type: 'file' | 'folder'
  parentId?: string
  sector?: Sector // Acesso controlado
  size?: number
  mimeType?: string
  url?: string // Para S3 futura
  uploadedBy: string // User ID
  createdAt: Date
  updatedAt: Date
}
```

#### 5. Ticket (Solicitação)
```typescript
interface Ticket {
  id: string
  title: string
  description: string
  category: string
  status: 'open' | 'analyzing' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  requester: string // User ID
  assignedTo?: string // User ID
  createdAt: Date
  updatedAt: Date
}

interface TicketHistory {
  id: string
  ticketId: string
  action: string
  changedBy: string // User ID
  timestamp: Date
}
```

#### 6. Course (Curso)
```typescript
interface Course {
  id: string
  title: string
  description: string
  instructor: string
  lessons: Lesson[]
  createdAt: Date
  updatedAt: Date
}

interface Lesson {
  id: string
  courseId: string
  title: string
  content: string // Markdown
  videoUrl?: string
  order: number
}

interface CourseProgress {
  id: string
  userId: string
  courseId: string
  completedLessons: string[] // Lesson IDs
  progress: number // 0-100
  completedAt?: Date
}
```

#### 7. CalendarEvent (Evento)
```typescript
interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  type: 'personal' | 'sector' | 'company'
  sector?: Sector
  attendees: string[] // User IDs
  createdBy: string // User ID
  createdAt: Date
  updatedAt: Date
}
```

## Estrutura Mock Data

### Arquivo Central: `src/lib/mock-data.ts`

```typescript
export const mockData = {
  users: User[],           // 20 usuários
  tasks: Task[],           // 40+ tarefas
  chatRooms: ChatRoom[],   // 7 salas por setor + DMs
  messages: Message[],     // 100+ mensagens
  driveItems: DriveItem[], // Hierarquia de pastas e arquivos
  tickets: Ticket[],       // 25+ tickets
  courses: Course[],       // 6+ cursos
  lessons: Lesson[],       // 15+ aulas
  events: CalendarEvent[], // 30+ eventos
  courseProgress: CourseProgress[], // Progresso dos usuários
}
```

## Padrões de API Routes

### Padrão 1: GET Lista (com filtros)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { mockData } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  // 1. Autenticação
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Extrair query parameters
  const { searchParams } = new URL(request.url)
  const sector = searchParams.get('sector')
  const status = searchParams.get('status')

  // 3. Filtrar dados mockados
  let data = mockData.tasks

  if (sector) {
    data = data.filter(task => task.sector === sector)
  }

  if (status) {
    data = data.filter(task => task.status === status)
  }

  // 4. Verificar permissões do usuário
  // TODO: Implementar lógica de permissões baseada em role/sector
  const userRole = session.user?.role // Assumir que existe em session
  if (userRole === 'Colaborador') {
    // Colaborador só vê tarefas do seu setor
    data = data.filter(task => task.sector === session.user?.sector)
  }

  // 5. Retornar resposta
  return NextResponse.json({
    data,
    count: data.length,
    timestamp: new Date().toISOString(),
  })
}
```

### Padrão 2: POST Criar

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { mockData } from '@/lib/mock-data'

// Validação com Zod
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assignedTo: z.string(),
  dueDate: z.string().datetime().optional(),
})

export async function POST(request: NextRequest) {
  // 1. Autenticação
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Parse e validação
  try {
    const body = await request.json()
    const validatedData = CreateTaskSchema.parse(body)

    // 3. Criar novo item (em mockData)
    const newTask = {
      id: crypto.randomUUID(),
      ...validatedData,
      status: 'todo',
      sector: session.user?.sector,
      createdBy: session.user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // 4. Adicionar ao mockData (em produção: salvar no DB)
    // TODO: Persistir em banco de dados real
    mockData.tasks.push(newTask)

    // 5. Retornar resposta
    return NextResponse.json(newTask, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
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

### Padrão 3: GET por ID

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const task = mockData.tasks.find(t => t.id === params.id)

  if (!task) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  // Verificar permissão
  // TODO: Implementar verificação de acesso

  return NextResponse.json(task)
}
```

### Padrão 4: PUT Atualizar

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const taskIndex = mockData.tasks.findIndex(t => t.id === params.id)

  if (taskIndex === -1) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  // Atualizar em mockData
  const updatedTask = {
    ...mockData.tasks[taskIndex],
    ...body,
    updatedAt: new Date(),
  }

  mockData.tasks[taskIndex] = updatedTask

  // TODO: Persistir em banco de dados real

  return NextResponse.json(updatedTask)
}
```

### Padrão 5: DELETE Remover

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const taskIndex = mockData.tasks.findIndex(t => t.id === params.id)

  if (taskIndex === -1) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  // Remover de mockData
  mockData.tasks.splice(taskIndex, 1)

  // TODO: Deletar do banco de dados real

  return NextResponse.json({ success: true })
}
```

## Autenticação (NextAuth.js)

### Arquivo Principal: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { mockData } from '@/lib/mock-data'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validar inputs
        const { email, password } = LoginSchema.parse(credentials)

        // Buscar usuário em mockData
        const user = mockData.users.find(u => u.email === email)

        // TODO: Integrar com autenticação real (OAuth2, JWT)
        // Por enquanto: aceitar qualquer usuário mockado com senha padrão
        if (user && password === 'password123') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            sector: user.sector,
            role: user.role,
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sector = user.sector
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        sector: token.sector,
        role: token.role,
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

## Sistema de Permissões

### Verificação de Acesso

```typescript
// Helper function para verificar permissões
export function checkPermission(
  userRole: Role,
  userSector: Sector,
  requiredRole?: Role,
  requiredSector?: Sector
): boolean {
  // Admin tem acesso a tudo
  if (userRole === 'Admin') {
    return true
  }

  // Se requere setor específico
  if (requiredSector && userSector !== requiredSector) {
    if (userRole !== 'Gerente') {
      return false
    }
  }

  // Se requer role específico
  if (requiredRole) {
    const roleHierarchy = {
      'Colaborador': 0,
      'Gerente': 1,
      'Admin': 2,
    }
    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      return false
    }
  }

  return true
}
```

## Mock Chat em Tempo Real

### Arquivo: `src/lib/mock-chat.ts`

```typescript
export class MockChatSimulator {
  private messageQueue: Message[] = []
  private intervals: NodeJS.Timeout[] = []

  // Simular chegada de mensagens
  simulateIncomingMessages(
    roomId: string,
    onMessage: (message: Message) => void
  ) {
    // Simular mensagem a cada 3-10 segundos
    const interval = setInterval(() => {
      const randomUser = mockData.users[
        Math.floor(Math.random() * mockData.users.length)
      ]

      const newMessage: Message = {
        id: crypto.randomUUID(),
        roomId,
        userId: randomUser.id,
        content: this.getRandomMessage(),
        timestamp: new Date(),
      }

      onMessage(newMessage)
    }, Math.random() * 7000 + 3000)

    this.intervals.push(interval)
  }

  private getRandomMessage(): string {
    const messages = [
      'Alguém tem as métricas de hoje?',
      'Reunião em 10 minutos?',
      'Concordo com a proposta',
      'Preciso revisar este documento',
      'Ótimo trabalho no projeto!',
      'Qual é o status atual?',
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  cleanup() {
    this.intervals.forEach(interval => clearInterval(interval))
  }
}
```

## Preparação para Migração para Backend Real

### Estrutura Prisma (Futura)

Quando migrar para banco real, usar Prisma:

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // Hashed
  sector    String
  role      String
  tasks     Task[]
  tickets   Ticket[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String
  priority    String
  dueDate     DateTime?
  assignedToId String
  assignedTo  User     @relation(fields: [assignedToId], references: [id])
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  sector      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ... mais modelos
```

### Plano de Migração

**Fase 1: Mock (Atual)**
- APIs retornam dados de `mockData.ts`
- Sem persistência real

**Fase 2: Local Database**
- Conectar Prisma ao banco local
- Trocar `mockData` por queries do Prisma

**Fase 3: Backend Real**
- Criar servidor Node/Express separado
- Next.js faz fetch para backend real
- Remover API Routes locais

### Checklist de Migração

```
[ ] Criar schema Prisma
[ ] Seeder com dados iniciais
[ ] Migrar GET requests para Prisma
[ ] Migrar POST requests para Prisma
[ ] Migrar PUT requests para Prisma
[ ] Migrar DELETE requests para Prisma
[ ] Testes de integração
[ ] Deploy em produção
[ ] Remover mockData
```

## Validação com Zod

### Schemas Centralizados

```typescript
// src/lib/schemas.ts

import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  sector: z.enum(['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']),
  role: z.enum(['Admin', 'Gerente', 'Colaborador']),
})

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assignedTo: z.string(),
  dueDate: z.string().datetime().optional(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial()

// ... mais schemas
```

## Error Handling

### Padrão Consistente

```typescript
export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message)
  }
}

// Uso em API routes
export async function GET(request: NextRequest) {
  try {
    // Lógica...
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Rate Limiting (Futuro)

```typescript
// Preparado para integração com bibliotecas como redis
// Quando tiver backend real, implementar rate limiting

export async function checkRateLimit(userId: string, limit: number = 100) {
  // TODO: Integrar com Redis
  // Por enquanto: retornar true (sem limite)
  return true
}
```

## Logging (Futuro)

```typescript
// Preparado para integração com serviços como Sentry/LogRocket

export function logAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  userId?: string
) {
  // TODO: Integrar com Sentry quando em produção
  console.log(`[${method}] ${path} - ${statusCode}${userId ? ` (User: ${userId})` : ''}`)
}
```

## Recursos de Referência

- **Documentação:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\CLAUDE.md`
- **Planejamento Completo:** `C:\Users\ksinh\.claude\plans\twinkly-stargazing-hellman.md`
- **Arquitetura Detalhada:** `C:\Users\ksinh\.claude\plans\twinkly-stargazing-hellman-agent-a5e8bd6.md`

## Fluxo de Trabalho Típico

1. **Definir tipos** em `src/types/`
2. **Criar schemas Zod** para validação
3. **Criar API routes** seguindo padrões
4. **Adicionar dados mockados** a `mockData.ts`
5. **Implementar permissões** baseadas em role/sector
6. **Testar com Postman/Insomnia**
7. **Documentar endpoints** em comentários
8. **Marcar TODOs** para migração futura

## Endpoints Implementados

### Autenticação
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Sessão atual

### Chat
- `GET /api/chat/rooms` - Listar salas
- `POST /api/chat/rooms` - Criar sala
- `GET /api/chat/messages?roomId=X` - Mensagens da sala
- `POST /api/chat/messages` - Enviar mensagem

### Tasks
- `GET /api/tasks` - Listar tarefas (com filtros)
- `POST /api/tasks` - Criar tarefa
- `GET /api/tasks/[id]` - Detalhe da tarefa
- `PUT /api/tasks/[id]` - Atualizar tarefa
- `DELETE /api/tasks/[id]` - Deletar tarefa

### Tickets
- `GET /api/tickets` - Listar tickets
- `POST /api/tickets` - Criar ticket
- `GET /api/tickets/[id]` - Detalhe do ticket
- `PUT /api/tickets/[id]` - Atualizar ticket

### Drive
- `GET /api/drive/folders` - Listar pastas
- `POST /api/drive/folders` - Criar pasta
- `GET /api/drive/files?folderId=X` - Arquivos da pasta
- `POST /api/drive/files` - Upload de arquivo

### Courses
- `GET /api/courses` - Listar cursos
- `GET /api/courses/[id]` - Detalhe do curso
- `GET /api/courses/[id]/progress` - Progresso do usuário
- `PUT /api/courses/[id]/progress` - Atualizar progresso

### Calendar
- `GET /api/calendar/events` - Listar eventos
- `POST /api/calendar/events` - Criar evento
- `GET /api/calendar/[eventId]` - Detalhe do evento
- `PUT /api/calendar/[eventId]` - Atualizar evento
- `DELETE /api/calendar/[eventId]` - Deletar evento

### Users
- `GET /api/users` - Listar usuários
- `GET /api/users/[id]` - Detalhe do usuário

---

**Última atualização:** 2026-01-05
**Projeto:** VIBEDISTRO Intranet/CRM
**Status:** Mockado (preparado para migração)
