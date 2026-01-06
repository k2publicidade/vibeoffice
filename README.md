# VibeOffice - Sistema de Gestão Interna

Sistema completo de gestão interna para distribuidora de música, desenvolvido com Next.js 14+ e Supabase.

## 🚀 Tecnologias

- **Framework:** Next.js 14.2+ (App Router) com TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI:** Shadcn/UI + Radix UI + Tailwind CSS 4
- **Testes:** Jest + React Testing Library
- **Animações:** Framer Motion
- **Validação:** Zod + React Hook Form

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Supabase (gratuita)
- Git

## ⚙️ Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/vibeoffice.git
cd vibeoffice
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

1. Crie um projeto em [https://supabase.com](https://supabase.com)
2. Vá em **Settings > API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Crie o arquivo `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# App Configuration
NEXT_PUBLIC_APP_NAME=VIBEDISTRO Intranet
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **IMPORTANTE - Segurança:**
- **NÃO adicione** `SUPABASE_SERVICE_ROLE_KEY` ao `.env.local`
- A chave de service role bypassa TODAS as políticas de segurança (RLS)
- Use apenas em scripts administrativos server-side (ex: `npm run db:seed`)
- A aplicação usa exclusivamente a `anon key` para todas as operações client-side

### 4. Aplique as migrations no Supabase

No **SQL Editor** do Supabase, execute o arquivo:

```sql
-- Copie e cole todo o conteúdo de:
docs/supabase-migrations.sql
```

Isso criará:
- ✅ 9 tabelas (users, tasks, tickets, chat, drive, courses, calendar, etc.)
- ✅ RLS Policies (segurança por linha)
- ✅ Storage bucket (drive-files)
- ✅ Functions e Triggers

### 5. Popule o banco com dados de teste

```bash
npm run db:seed
```

### 6. Crie usuários de teste no Supabase Auth

No Supabase Dashboard → **Authentication > Users**, adicione:

| Email | Senha | Role |
|-------|-------|------|
| eu@vibedistro.com | password123 | Admin |
| joao.silva@vibedistro.com | password123 | Gerente |
| maria.santos@vibedistro.com | password123 | Colaborador |

### 7. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Modo watch
npm run test:watch

# Cobertura de código
npm run test:coverage
```

**Cobertura atual:** 60-94% nos hooks principais (useUsers, useTasks, useTickets)

## 📦 Build de Produção

```bash
# Build
npm run build

# Rodar em produção
npm start
```

## 📁 Estrutura do Projeto

```
vibeoffice/
├── src/
│   ├── app/                    # Pages (App Router)
│   │   ├── (auth)/            # Rotas públicas (login)
│   │   ├── (dashboard)/       # Rotas protegidas
│   │   ├── error.tsx          # Error boundary
│   │   └── global-error.tsx   # Global error handler
│   ├── components/            # Componentes React
│   │   ├── dashboard/
│   │   ├── chat/
│   │   ├── drive/
│   │   ├── tasks/
│   │   ├── tickets/
│   │   ├── courses/
│   │   └── ui/               # Shadcn UI components
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.ts        # Autenticação
│   │   ├── useTasks.ts       # Tarefas
│   │   ├── useTickets.ts     # Tickets
│   │   ├── useChat.ts        # Chat em tempo real
│   │   ├── useDrive.ts       # Upload/download
│   │   ├── useCourses.ts     # Cursos
│   │   ├── useCalendar.ts    # Calendário
│   │   └── useUsers.ts       # Usuários
│   ├── lib/                  # Utilitários
│   │   ├── supabase/
│   │   │   ├── client.ts     # Client-side
│   │   │   ├── server.ts     # Server-side
│   │   │   └── storage.ts    # Upload de arquivos
│   │   ├── utils.ts
│   │   └── schemas.ts        # Validações Zod
│   └── types/                # TypeScript types
├── scripts/
│   └── seed-supabase.ts      # Script de seed
├── docs/
│   └── supabase-migrations.sql
├── jest.config.js
├── jest.setup.js
└── package.json
```

## 🎯 Módulos Principais

### 1. Dashboard
- Cards de métricas em tempo real
- Gráficos por setor (Recharts)
- Feed de atividades

### 2. Chat
- **Realtime** com Supabase subscriptions
- Salas por setor (7 setores)
- DMs entre usuários
- Auto-scroll, typing indicators

### 3. Drive
- Upload/download **real** (Supabase Storage)
- Navegação hierárquica de pastas
- Compartilhamento de arquivos
- RLS por setor

### 4. Tarefas
- Kanban (drag & drop com dnd-kit)
- Visualização em lista
- Filtros por status, prioridade, setor, responsável

### 5. Tickets
- Workflow: Aberto → Em Análise → Em Execução → Concluído
- Sistema de comentários
- Timeline de histórico
- Categorias por setor

### 6. Cursos
- Player de vídeo embed
- Conteúdo markdown
- Sistema de progresso (%)
- Marcar aula como concluída

### 7. Agenda
- Calendário com React Big Calendar
- Múltiplas visualizações (Mês, Semana, Dia, Agenda)
- Eventos pessoais, de setor e da empresa

## 🔒 Segurança

- **RLS (Row Level Security)** ativado em todas as tabelas
- Autenticação via Supabase Auth
- Middleware protege rotas privadas
- Service role key **nunca** exposta no frontend
- Error boundaries para captura de erros

## 🌐 Deploy

### Vercel (Recomendado)

1. Conecte o repositório no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy automático!

### Outras plataformas

Funciona em qualquer plataforma que suporte Next.js 14+:
- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

## 📝 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm run lint` | Executar ESLint |
| `npm run db:seed` | Popular banco com dados de teste |
| `npm test` | Rodar testes |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Cobertura de testes |

## 🐛 Troubleshooting

### Erro: "User not authenticated"
- Verifique se o usuário está cadastrado no Supabase Auth
- Confirme que as credenciais estão corretas

### Erro: "RLS policy violation"
- Verifique se as policies foram aplicadas corretamente
- Confirme que o usuário tem permissão para acessar os dados

### Erro: "Storage bucket not found"
- Execute a migration que cria o bucket `drive-files`
- Verifique se as políticas de storage estão ativas

### Build falha com erro de types
- Rode `npm run build` localmente primeiro
- Verifique se todas as dependências estão instaladas

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova feature'`
4. Push para a branch: `git push origin feature/nova-feature`
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Time

Desenvolvido com ❤️ por **VIBEDISTRO Tech Team**

---

**Status:** ✅ Produção
**Versão:** 1.0.0
**Última atualização:** Janeiro 2026
