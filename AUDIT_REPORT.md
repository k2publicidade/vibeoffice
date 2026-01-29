# 🔍 AUDITORIA COMPLETA — VibeOffice
**Data:** 2026-01-11 | **Auditor:** Claude (Subagent)
**Stack:** Next.js 16 + React 19 + Supabase + Shadcn/UI + Tailwind CSS 4

---

## 📊 RESUMO EXECUTIVO

| Severidade | Quantidade |
|------------|-----------|
| 🔴 CRÍTICO | 8 |
| 🟠 MÉDIO | 14 |
| 🟡 BAIXO | 12 |
| 💡 MELHORIAS | 18 |

---

## 🔴 BUGS CRÍTICOS

### C01 — Tabela `company_announcements` não existe no banco
- **Arquivo:** `src/hooks/useAnnouncements.ts` (linhas ~65-85)
- **Descrição:** O hook referencia `company_announcements` que NÃO existe em `database.types.ts`. Todo o módulo de avisos está desabilitado com `// FIXME`. O Realtime subscription escuta uma tabela inexistente (linha ~45), gerando erros silenciosos.
- **Impacto:** Módulo de Avisos 100% inoperante. O `AnnouncementsCarousel` no dashboard mostra nada.
- **Fix:** Criar migration `company_announcements`, gerar types (`supabase gen types`), remover comentários FIXME.

### C02 — Tabela `modules` não existe no database.types.ts
- **Arquivo:** `src/hooks/useCourses.ts` (linha ~36)
- **Descrição:** `supabase.from('modules' as any)` — o `as any` é usado para contornar a falta da tabela no type system. Se `modules` não existir no banco, crash silencioso. Mesmo problema com `user_course_progress` (linha ~63).
- **Impacto:** Módulo de Cursos potencialmente quebrado. Sem type-safety nenhuma.
- **Fix:** Adicionar tabelas `modules` e `user_course_progress` ao `database.types.ts` via `supabase gen types`.

### C03 — Tabela `task_assignees` não existe no database.types.ts
- **Arquivo:** `src/hooks/useTasks.ts` (linhas ~113, ~268, ~333)
- **Descrição:** `supabase.from('task_assignees' as any)` — mesma situação. O sistema tenta fazer JOIN com `task_assignees` na query (`.select('*, task_assignees(user_id)')`) mas esse tipo não existe nos types gerados.
- **Impacto:** Se a tabela não existir no banco, todas as tasks terão `assignees: []`. Se existir, funciona mas sem type-safety.
- **Fix:** Regenerar types. Se a tabela não existir, criar migration.

### C04 — Tabela `studio_bookings` não existe no database.types.ts
- **Arquivo:** `src/hooks/useStudio.ts` (linha ~13)
- **Descrição:** `supabase.from('studio_bookings' as any)` — módulo Studio inteiro sem type-safety.
- **Impacto:** Módulo Studio potencialmente quebrado.
- **Fix:** Criar migration ou regenerar types.

### C05 — Singleton `supabase` client causa problemas de auth stale
- **Arquivo:** `src/lib/supabase/client.ts` (linhas 9-12)
- **Descrição:** `export const supabase = createClient()` cria um singleton global. Em Next.js com React Server Components, o browser client NÃO deve ser singleton — deve ser criado por chamada. Isso pode causar:
  1. Auth token stale após refresh
  2. Cookies de sessão não atualizados
  3. Múltiplas tabs compartilhando estado incorretamente
- **Impacto:** Sessões perdidas aleatoriamente. Bugs de "User not authenticated" reportados.
- **Fix:** Usar `createClient()` em cada hook (como `useArchiveChat` já faz corretamente). Remover `export const supabase`.

### C06 — `next-auth` instalado mas NÃO usado (dependência fantasma)
- **Arquivo:** `package.json` (linha dependencies)
- **Descrição:** `"next-auth": "^5.0.0-beta.30"` está instalado, mas todo o auth é feito via Supabase. Este pacote beta pode conflitar com middleware ou cookies.
- **Impacto:** Bundle maior (~200KB), possível conflito de middleware.
- **Fix:** `npm uninstall next-auth`

### C07 — `mapTaskStatusToTicketStatus` duplicada com tipos conflitantes
- **Arquivo:** `src/hooks/useTasks.ts` (linhas ~215 e ~508)
- **Descrição:** A função é declarada DUAS vezes: uma como método dentro do hook (com return type correto `TicketStatus`) e outra como function declaration no final do arquivo (com return type `string`). O JS usará a function declaration por hoisting, que retorna tipo genérico.
- **Impacto:** Possível bug de tipagem no sync task→ticket.
- **Fix:** Remover a duplicata no final do arquivo.

### C08 — `useChat` fetchRooms não mapeia `description`/`createdBy`/`sector`
- **Arquivo:** `src/hooks/useChat.ts` (linhas ~70-80)
- **Descrição:** O `fetchRooms` mapeia apenas `id, name, type, participants, createdAt, updatedAt`. Campos como `description`, `createdBy` (`created_by`), `sector` são ignorados, então grupos de projeto (`type: 'project'`) terão `description: undefined`, `createdBy: undefined`.
- **Impacto:** `canManageGroup(room, userId)` sempre retorna `false` porque `room.createdBy` é `undefined`. Ninguém consegue editar grupos de projeto.
- **Fix:** Incluir `sector: r.sector || undefined, description: r.description || undefined, createdBy: r.created_by || undefined` no map.

---

## 🟠 BUGS MÉDIOS

### M01 — `useAuth.signUp` não trata conflito de email existente
- **Arquivo:** `src/hooks/useAuth.ts` (linha ~93)
- **Descrição:** Se o email já existir no Supabase Auth, o erro é genérico. O user não sabe o que aconteceu.
- **Fix:** Detectar `error.message.includes('already registered')` e dar feedback específico.

### M02 — `useCalendar.updateEvent` passa `undefined` para campos não fornecidos
- **Arquivo:** `src/hooks/useCalendar.ts` (linhas ~140-155)
- **Descrição:** `title: updates.title` — se `updates.title` for `undefined`, o Supabase vai definir a coluna como `NULL` (dependendo da API). Campos opcionais devem ser excluídos do update quando `undefined`.
- **Fix:** Filtrar campos undefined antes de enviar: `Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined))`

### M03 — `useChat` `getExistingDMUserIds` compara com `'current-user'` hardcoded
- **Arquivo:** `src/hooks/useChat.ts` (linha ~128)
- **Descrição:** `room.participants.filter(p => p !== 'current-user')` — usa string literal em vez de `user?.id`. Nunca filtra nada na prática.
- **Fix:** Trocar `'current-user'` por `user?.id`.

### M04 — `useReadReceipts` N+1 query problem
- **Arquivo:** `src/hooks/useReadReceipts.ts` (linhas ~28-50)
- **Descrição:** `flushPendingReads` faz um SELECT + UPDATE POR MENSAGEM (loop). Para 20 mensagens, são 40 queries.
- **Fix:** Usar uma RPC (stored procedure) que aceite array de message IDs e faça o merge em batch.

### M05 — `useNotifications` recria `supabase` client em cada render
- **Arquivo:** `src/hooks/useNotifications.ts` (linha ~28)
- **Descrição:** `const supabase = createClient()` dentro do corpo do hook (fora de useMemo/useRef). Cada render cria novo client.
- **Fix:** Usar `useRef` ou `useMemo` para criar o client uma vez.

### M06 — `useTasks` Realtime event mapeia `assignees` de `payload.new.assignees`
- **Arquivo:** `src/hooks/useTasks.ts` (linhas ~83, ~102)
- **Descrição:** O Realtime payload para `tasks` não inclui `task_assignees` (é outra tabela). O campo `payload.new.assignees` não existe na tabela `tasks`. O mapeamento usa `payload.new.assignees || []` que sempre será `[]`.
- **Fix:** Após receber evento Realtime, fazer fetch da task com JOIN para pegar assignees corretos.

### M07 — `useDrive.uploadFile` `onProgress` nunca é chamado
- **Arquivo:** `src/lib/supabase/storage.ts` e `src/hooks/useDrive.ts`
- **Descrição:** A interface `UploadFileOptions` tem `onProgress`, mas o Supabase Storage `upload()` não suporta callbacks de progresso nativamente. O callback é ignorado.
- **Fix:** Usar `tus` upload protocol ou XMLHttpRequest para progresso real, ou remover o parâmetro para não enganar o dev.

### M08 — `useTickets.createTicket` passa `createdBy` do input ao invés de `user.id`
- **Arquivo:** `src/hooks/useTickets.ts` (linha ~225)
- **Descrição:** `created_by: ticketData.createdBy` — o campo `createdBy` vem do input do chamador. Deveria ser sempre `user.id` para segurança. Um usuário malicioso poderia forjar o campo.
- **Fix:** Usar `created_by: user.id` sempre.

### M09 — `useArchiveChat` inclui `supabase` como dependência de `useCallback`
- **Arquivo:** `src/hooks/useArchiveChat.ts` (linhas ~25, ~50, ~75)
- **Descrição:** `const supabase = createClient()` é recriado a cada render. `useCallback` depende de `supabase`, causando re-criação de todos os callbacks a cada render.
- **Fix:** Mover `createClient()` para `useRef` ou fora do componente.

### M10 — Providers: `forcedTheme="dark"` desabilita toggle de tema
- **Arquivo:** `src/app/providers.tsx` (linha ~31)
- **Descrição:** `<ThemeProvider forcedTheme="dark">` faz o sistema IGNORAR completamente a escolha do usuário. O `ThemeToggle` component existe mas não faz nada.
- **Fix:** Remover `forcedTheme="dark"` se dark mode toggle é desejado.

### M11 — `useTasks.createTask` cria ticket vinculado mesmo quando não solicitado
- **Arquivo:** `src/hooks/useTasks.ts` (linhas ~271-295)
- **Descrição:** TODA task criada automaticamente cria um ticket vinculado. Isso polui o módulo de tickets com tickets automáticos e viola o princípio de separação.
- **Fix:** Tornar a criação de ticket vinculado opcional via flag `createLinkedTicket: boolean`.

### M12 — Race condition em `useChat.sendMessage`
- **Arquivo:** `src/hooks/useChat.ts` (linhas ~175-215)
- **Descrição:** O insert retorna `data`, mas o Realtime subscription TAMBÉM adiciona a mensagem. Resultado: mensagem duplicada momentânea (até o próximo re-render reconciliar).
- **Fix:** No Realtime handler (linha ~160), filtrar se a mensagem já existe: `if (prev.some(m => m.id === newMessage.id)) return prev`.

### M13 — `useUsers` retorna `role` em lowercase mas `auth.ts` define como PascalCase
- **Arquivo:** `src/hooks/useUsers.ts` (linha ~40)
- **Descrição:** `role: u.role.toLowerCase() as 'admin' | 'gerente' | 'colaborador'` — converte para lowercase. Mas `types/auth.ts` define `Role = 'Admin' | 'Gerente' | 'Colaborador'`. Comparações de role vão quebrar entre hooks.
- **Fix:** Manter consistência — ou tudo PascalCase ou tudo lowercase.

### M14 — `middleware.ts` usa `getSession()` que é deprecated no Supabase SSR v0.8+
- **Arquivo:** `src/middleware.ts` (linha ~58)
- **Descrição:** `supabase.auth.getSession()` no middleware pode retornar sessão stale do cookie sem validar com o server. Recomendado usar `getUser()` para validação real.
- **Fix:** Trocar para `const { data: { user } } = await supabase.auth.getUser()`.

---

## 🟡 BUGS BAIXOS

### L01 — `Fuse` importado mas `fuse` instance nunca usada diretamente
- **Arquivo:** `src/hooks/useMessageSearch.ts` (linha ~20)
- **Descrição:** `const fuse = useMemo(...)` é criado mas `results` cria um NOVO Fuse em cada chamada (linha ~46). O primeiro `fuse` é desperdiçado.
- **Fix:** Reutilizar o `fuse` do useMemo.

### L02 — `useCalendar` não tem `updatedAt` no banco
- **Arquivo:** `src/hooks/useCalendar.ts` (linha ~53)
- **Descrição:** `updatedAt: new Date(event.created_at)` — usa `created_at` como fallback porque `calendar_events` não tem `updated_at`. Informação imprecisa.
- **Fix:** Adicionar coluna `updated_at` à tabela ou remover o campo do type.

### L03 — Console.logs de debug abundantes em produção
- **Arquivos:** `useTasks.ts` (~15 logs), `useCalendar.ts` (~3 logs), `useChat.ts` (~5 logs), `useTickets.ts` (~3 logs)
- **Descrição:** `console.log('[useTasks] Realtime event:', payload)` etc. — logs de debug que poluem console em produção.
- **Fix:** Usar `if (process.env.NODE_ENV === 'development')` ou remover.

### L04 — `useDrive.setCurrentFolder` é um noop
- **Arquivo:** `src/hooks/useDrive.ts` (linha ~316)
- **Descrição:** `setCurrentFolder: () => { }` — retorna uma função vazia. O chamador pensa que pode setar a pasta, mas nada acontece.
- **Fix:** Implementar com `setCurrentFolderId(folder?.id || null)`.

### L05 — `useDrive.togglePublicAccess` não é async no return type mas é async no corpo
- **Arquivo:** `src/hooks/useDrive.ts` (linha ~390)
- **Descrição:** A interface `UseDriveReturn` define `togglePublicAccess: (itemId: string) => void` mas a implementação é `async`. Erros do supabase serão swallowed.
- **Fix:** Atualizar interface para `Promise<void>`.

### L06 — `@types/react-big-calendar` não está nas devDependencies
- **Arquivo:** `package.json`
- **Descrição:** `react-big-calendar` é usado em componentes de calendário mas os types não estão instalados.
- **Fix:** `npm i -D @types/react-big-calendar`

### L07 — `Ticket.category` usa `string` no type mas `Sector` no Zod schema
- **Arquivo:** `src/types/tickets.ts` (linha ~16) vs `src/lib/validation-schemas.ts` (linha ~85)
- **Descrição:** O type define `category: string` mas o Zod schema valida com `z.enum(['A&R', 'Marketing', ...])`. Tickets com categorias customizadas seriam rejeitados pela validação mas aceitos pelo type.
- **Fix:** Alinhar — ou o type é `Sector` ou o Zod aceita `string`.

### L08 — `useChat` typingUsers sempre retorna `[]`
- **Arquivo:** `src/hooks/useChat.ts` (linha ~26)
- **Descrição:** `const [typingUsers, setTypingUsers] = useState<string[]>([])` — nunca é atualizado. Feature de "digitando..." não foi implementada.
- **Fix:** Implementar via Supabase Presence ou remover da interface.

### L09 — `Toaster` com estilo transparent pode ser invisível
- **Arquivo:** `src/app/providers.tsx` (linhas ~36-42)
- **Descrição:** `background: 'transparent', border: 'none', padding: 0` — os toasts da Sonner ficarão invisíveis a menos que os componentes filhos tenham background próprio.
- **Fix:** Verificar se `NotificationToast` e outros custom renderers setam background.

### L10 — `useDrive.createFolder` inconsistência parentId null vs undefined
- **Arquivo:** `src/hooks/useDrive.ts` (linhas ~269-290)
- **Descrição:** O banco retorna `parent_id: null`, mas o mapping converte para `undefined` (`data.parent_id === null ? undefined : data.parent_id`). Depois `fetchItems()` é chamado que também faz este mapping. Porém a comparação em `currentFolderItems` trata ambos. Ainda assim, a inconsistência null/undefined é uma fonte de bugs.
- **Fix:** Padronizar: `parentId: null` em todo lugar (alinhado com o banco).

### L11 — `useCourses.createCourse` retorna `Course` com `createdAt` não existente
- **Arquivo:** `src/hooks/useCourses.ts` (linha ~130)
- **Descrição:** `createdAt: new Date(newCourse.created_at)` — o type `Course` não tem campo `createdAt` (usa `created_at` string). Campo extra ignorado silenciosamente.
- **Fix:** Remover o campo incorreto.

### L12 — `global-error.tsx` inline styles sem dark mode support
- **Arquivo:** `src/app/global-error.tsx`
- **Descrição:** Usa inline styles com cores fixas (`#666`, `#f5f5f5`). Em dark mode, ficará ilegível (texto escuro em fundo escuro).
- **Fix:** Usar `color-scheme: dark` ou classes CSS básicas.

---

## 💡 MELHORIAS SUGERIDAS

### UX

**UX01 — Loading states inconsistentes**
- Apenas o dashboard (`page.tsx`) tem skeleton loading. Módulos como Chat, Drive, Calendar mostram tela branca durante carregamento.
- **Fix:** Adicionar `<Skeleton>` ou `<Suspense>` a todos os módulos.

**UX02 — Sem empty states**
- Quando não há tasks, tickets, ou mensagens, nada é exibido.
- **Fix:** Componentes de empty state com ícone + mensagem + CTA.

**UX03 — Sem confirmação de ações destrutivas**
- `deleteTask`, `deleteTicket`, `deleteItem` não pedem confirmação (exceto `DeleteTaskDialog`).
- **Fix:** Usar `AlertDialog` do Radix em todas as ações de delete.

**UX04 — Feedback visual ausente em operações async**
- Muitas operações (share, rename, archive) não mostram loading spinner ou toast de sucesso.
- **Fix:** Adicionar `toast.loading()` + `toast.success/error` pattern.

### PERFORMANCE

**P01 — Hooks sem React Query**
- `Providers` configura `QueryClient` mas NENHUM hook usa React Query. Todos usam `useState + useEffect + fetch`. Isso significa:
  - Sem cache
  - Sem deduplication
  - Re-fetch em cada mount
  - Sem stale-while-revalidate
- **Fix:** Migrar hooks para `useQuery`/`useMutation`.

**P02 — `useDrive.fetchItems` busca TODOS os itens sem paginação**
- `supabase.from('drive_items').select('*')` — se houver 10K arquivos, trava.
- **Fix:** Paginar com `.range()` ou lazy loading por pasta.

**P03 — `useTickets.fetchComments` busca TODOS os comentários de TODOS os tickets**
- Linha ~130: `.from('ticket_comments').select('*')` — sem filtro.
- **Fix:** Buscar apenas do ticket selecionado, on-demand.

**P04 — Múltiplos hooks fazem `fetchUsers()` independentemente**
- `useChat`, `useDrive`, `useUsers` — cada um faz sua query de users. 3x a mesma query.
- **Fix:** Criar um `UsersContext` ou usar React Query com key compartilhada.

**P05 — `useTasks.createTask` faz 4-5 queries sequenciais**
- Insert task → Insert assignees → Insert ticket → Update task (linked_ticket_id) → Insert calendar event
- **Fix:** Usar database function (RPC) que faz tudo em uma transaction.

**P06 — Bundle: `three.js` + `@react-three/fiber` carregados globalmente**
- São 500KB+ de JavaScript só para o módulo VibeCanvas. Carregados no bundle principal.
- **Fix:** Dynamic import: `const VibeCanvas = dynamic(() => import('./vibecanvas'), { ssr: false })`.

### CODE QUALITY

**Q01 — Inconsistência no padrão de criação de Supabase client**
- Metade dos hooks usa `import { supabase } from '@/lib/supabase/client'` (singleton)
- Outra metade usa `const supabase = createClient()` (instância por chamada)
- **Fix:** Padronizar para `createClient()` em hooks (mais seguro).

**Q02 — Types `as any` abundantes**
- `useCourses.ts` tem 10+ `as any`. `useStudio.ts` tem 5+. `useTasks.ts` tem 3+.
- Isso elimina toda proteção do TypeScript.
- **Fix:** Regenerar `database.types.ts` para incluir todas as tabelas.

**Q03 — Sem ErrorBoundary por módulo**
- Existe `error.tsx` global mas se um módulo crashar, leva o app inteiro.
- **Fix:** Adicionar `error.tsx` em cada rota: `(dashboard)/chat/error.tsx`, etc.

**Q04 — Sem testes para módulos novos**
- Existem testes apenas para `useAuth`, `useTasks`, `useTickets`, `useUsers` e `AdminDashboard`.
- Módulos chat, drive, calendar, courses, notifications, announcements, studio: ZERO testes.
- **Fix:** Adicionar testes unitários para hooks críticos.

**Q05 — `lib/mock-data.ts` ainda presente**
- Arquivo de dados mockados existe mas não é usado. Dead code.
- **Fix:** Remover se não for mais necessário.

### SEGURANÇA

**S01 — RLS provavelmente insuficiente**
- O README menciona RLS mas o código tem vários workarounds (`// RLS denied`, `// likely RLS denied`). O notification processor silencia erros 42501.
- **Fix:** Auditar todas as policies RLS no Supabase Dashboard. Garantir que:
  - Users só veem dados do seu setor (exceto Admin)
  - Notifications são isoladas por user_id
  - Drive items respeitam permissões de sharing

**S02 — `SUPABASE_SERVICE_ROLE_KEY` mencionada no README para deploy**
- O README instrui adicionar `SUPABASE_SERVICE_ROLE_KEY` no Vercel. Se essa key vazar para o frontend (via NEXT_PUBLIC_ prefix acidental), todo o RLS é bypassado.
- **Fix:** Documentar claramente que é SERVER-ONLY. Usar `SUPABASE_SERVICE_ROLE_KEY` (sem NEXT_PUBLIC_).

**S03 — Sem rate limiting em operations de chat**
- `sendMessage` pode ser chamado sem throttle. Um usuário malicioso pode spammar mensagens.
- **Fix:** Adicionar rate limit client-side (debounce) e server-side (RLS ou Edge Function).

**S04 — `copyShareLink` gera link sem token de autenticação**
- **Arquivo:** `src/hooks/useDrive.ts` (linha ~400)
- **Descrição:** O link gerado (`/drive/share/${itemId}`) não tem token. Qualquer um com o ID poderia acessar.
- **Fix:** Gerar signed URL ou usar share tokens.

---

## 🏗️ PROBLEMAS DE BUILD (POTENCIAIS)

### B01 — `Fuse.js` pode não ter SSR support correto
- `useMessageSearch.ts` importa `fuse.js` que pode não funcionar em Server Components.
- O hook é `'use client'` então provavelmente OK, mas verificar se o tree-shaking funciona.

### B02 — Tipos inconsistentes podem causar erro de build
- O campo `linked_task_id` / `linked_ticket_id` é acessado via `(t as any).linked_task_id` em vários hooks. Se o build habilitar `strict: true`, esses `as any` passam mas mascaram problemas reais.

### B03 — `@react-three/fiber` com React 19
- Three.js ecosystem pode ter problemas com React 19 (reconciler changes). Verificar compatibilidade.

### B04 — `zod` v4 é breaking change
- `package.json` tem `"zod": "^4.3.5"`. Zod 4 mudou APIs (ex: `z.object` internals). Verificar se `@hookform/resolvers` é compatível com Zod 4.

---

## ✅ PONTOS POSITIVOS

1. **Arquitetura bem estruturada** — separação clara hooks/components/types/lib
2. **Realtime subscriptions** — chat e notificações em tempo real
3. **Validação com Zod** — schema validation nos hooks de tasks/tickets
4. **Error boundaries** — error.tsx e global-error.tsx implementados
5. **Auth middleware** — proteção de rotas no middleware
6. **Notification system** — arquitetura com EventBus + handlers (in-app, push, email)
7. **Testes existentes** — cobertura parcial mas presente
8. **Responsividade documentada** — guia detalhado no CLAUDE.md

---

## 🎯 PRIORIDADE DE AÇÃO

### Sprint 1 (Crítico — 1-2 dias)
1. C05 — Corrigir singleton Supabase client
2. C07 — Remover `mapTaskStatusToTicketStatus` duplicada
3. C08 — Fix `fetchRooms` para incluir description/createdBy
4. M14 — Trocar `getSession()` por `getUser()` no middleware
5. C06 — Remover `next-auth` do package.json

### Sprint 2 (Tabelas faltantes — 2-3 dias)
1. C01 — Criar migration `company_announcements`
2. C02 — Adicionar `modules`/`user_course_progress` ao types
3. C03 — Adicionar `task_assignees` ao types
4. C04 — Adicionar `studio_bookings` ao types
5. Regenerar `database.types.ts` completo

### Sprint 3 (Médio — 3-5 dias)
1. M03 — Fix `getExistingDMUserIds`
2. M06 — Fix Realtime assignees mapping
3. M08 — Fix `createTicket` usar `user.id`
4. M12 — Fix race condition duplicata de mensagens
5. M13 — Padronizar role casing
6. P01 — Começar migração para React Query

### Sprint 4 (Polish — 1 semana)
1. Todos os bugs baixos (L01-L12)
2. UX improvements (UX01-UX04)
3. Performance (P02-P06)
4. Security hardening (S01-S04)
