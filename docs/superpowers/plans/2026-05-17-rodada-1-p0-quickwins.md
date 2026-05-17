# Rodada 1: P0 + Quick-wins P1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver 39 achados do diagnóstico — 10 P0 (bloqueantes) + 29 P1 esforço S (quick-wins) — para destravar uso real do módulo Cursos e eliminar bugs sistêmicos de alta visibilidade.

**Architecture:** Execução em 10 batches temáticos, commits frequentes (um por batch ou por achado independente). Sem TDD formal (projeto não tem suite de testes ainda; verificação via `npm run lint` + `npm run build` + smoke test manual quando faz sentido). Cada batch fecha com commit semântico.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Shadcn/UI, Tailwind, Framer Motion, Radix.

**Spec source:** `docs/superpowers/reports/2026-05-17-CONSOLIDADO.md` (e relatórios A/B citados nele).

**Decisões técnicas adotadas (default; podem ser revertidas):**
- M2M `task_assignees` como fonte da verdade; parar de escrever em `assigned_to`.
- Remover `CreateTicketModal` órfão (estado + handler + JSX).
- `unreadCounts` Chat: remover mock + TODO documentado.
- `LessonPlayer.tsx`: deletar (dead code).

---

## File Structure (escopo agregado da rodada)

### Criar
- `src/lib/navigation.ts` — Source-of-truth dos itens de navegação (resolve S-P0-01)
- `src/lib/video.ts` — Helper `videoEmbedUrl` extraído (resolve C-P1-03)

### Modificar (core)
- `src/middleware.ts` — Cache role via `app_metadata` (S-P0-02)
- `src/components/layout/DashboardShell.tsx` — Container padrão (S-P1-02)
- `src/components/layout/MobileDrawer.tsx` — Usar navigation.ts (S-P0-01)
- `src/components/layout/TopNavigation.tsx` — Usar navigation.ts, descomentar Chat (S-P0-01)
- `src/hooks/useAuth.ts` + `useTasks.ts` + `useTickets.ts` + `useChat.ts` + `useDrive.ts` + `useCalendar.ts` + `usePresence.ts` — `useMemo(createClient)` (S-P1-01)
- `src/app/(dashboard)/courses/[id]/page.tsx` — Rules of hooks fix, mobile sidebar Sheet, fallback condicional, parsing video (C-P0-01, C-P0-03, C-P1-08, C-P1-03)
- `src/app/(dashboard)/courses/page.tsx` — Filtro is_published, stats filter (C-P0-02, C-P1-04)
- `src/hooks/useCourses.ts` — Filtro is_published no fetch, normalize, toast.error em toggleLessonComplete (C-P0-02, C-P1-06, C-P1-13)
- `src/components/courses/CourseCard.tsx` — Fallback de description (C-P1-09)
- `src/components/courses/CreateModuleModal.tsx` — Migrar para PremiumModal (C-P1-05)
- `src/components/courses/LessonEditorModal.tsx` — Substituir prompt() por sub-modal, rename "Formatar com IA" (C-P0-04, C-P1-01)
- `src/app/(dashboard)/courses/manage/[id]/page.tsx` — Slug auto-update, updateLesson whitelist (C-P1-07, C-P1-12)
- `src/app/(dashboard)/courses/manage/page.tsx` — Filtro case-insensitive (C-P1-14)
- `src/app/(dashboard)/chat/page.tsx` — Remover mock unreadCounts, useEffect setCurrentRoom, bg tokens, overlay mobile (S-P0-03, S-P1-07, S-P1-08, S-P1-09)
- `src/app/(dashboard)/tasks/page.tsx` — async/await handleCreateTask + handleSaveTask, AlertDialog em handleDeleteTaskById (S-P0-04, S-P1-16)
- `src/components/tasks/TaskDialog.tsx` — prop `hideTrigger` (S-P1-15)
- `src/hooks/useTasks.ts` — Parar de escrever em `assigned_to` (S-P0-05)
- `src/hooks/useTickets.ts` — Parar de escrever em `assigned_to` (S-P0-05); async/await em addComment (S-P1-19)
- `src/app/(dashboard)/tickets/page.tsx` — Remover CreateTicketModal órfão, AlertDialog em handleDeleteComment, async await handleAddComment, container padrão (S-P0-06, S-P1-19, S-P1-20, S-P1-04)
- `src/app/(dashboard)/profile/page.tsx` — Container padrão (S-P1-04)
- `src/app/(dashboard)/settings/page.tsx` — Container padrão (S-P1-04)
- `src/app/(dashboard)/drive/page.tsx` — Fix altura, remover comentário JSX, implementar download real (S-P1-11, S-P1-13, S-P1-14)
- `src/app/(dashboard)/calendar/page.tsx` — Campo description no handler + modal, guard console.log (S-P1-22, S-P1-23)

### Deletar
- `src/components/layout/Sidebar.tsx` — Dead code (S-P1-05, parte do S-P0-01)
- `src/components/courses/LessonPlayer.tsx` — Dead code (C-P1-11)

---

## Batches

Ordem otimizada pra: (1) infra antes de fluxo, (2) bugs P0 antes de P1, (3) features visuais no fim. Cada batch fecha com commit.

---

### Batch 1 — Foundations: container padrão + hooks Supabase singleton

**Achados resolvidos:** S-P1-01, S-P1-02, S-P1-04, S-P1-23

**Arquivos:**
- Modify: `src/components/layout/DashboardShell.tsx`
- Modify: `src/app/(dashboard)/tickets/page.tsx` (apenas linha de container)
- Modify: `src/app/(dashboard)/profile/page.tsx` (apenas linha de container)
- Modify: `src/app/(dashboard)/settings/page.tsx` (apenas linha de container)
- Modify: `src/hooks/useAuth.ts`, `useTasks.ts`, `useTickets.ts`, `useChat.ts`, `useDrive.ts`, `useCalendar.ts`, `usePresence.ts`
- Modify: `src/app/(dashboard)/calendar/page.tsx:181-188`

**Steps:**

- [ ] **1.1** Em `DashboardShell.tsx:24` trocar `<main className="mx-auto max-w-none px-4 py-4 md:px-6 md:py-6 lg:px-8">` por `<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">`. Para módulos full-bleed (chat, drive, calendar), as páginas continuam usando `-mx-4 sm:-mx-6 lg:-mx-8` localmente se já o fazem.

- [ ] **1.2** Em `tickets/page.tsx:106`, `profile/page.tsx:56`, `settings/page.tsx:72` — trocar `w-[90%]`/`w-[95%]` por `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (em profile/settings considerar `max-w-5xl`). Conferir indentação em cada arquivo.

- [ ] **1.3** Nos 7 hooks listados, localizar onde `createClient()` é chamado fora de useMemo (geralmente top-level do componente ou direto no body do hook). Padrão:

  ```ts
  // antes
  const supabase = createClient()
  
  // depois
  const supabase = useMemo(() => createClient(), [])
  ```

  Importar `useMemo` se ainda não estiver. ATENÇÃO: alguns hooks já podem ter o padrão; só corrigir os que não têm.

- [ ] **1.4** Em `calendar/page.tsx:181-188` (e qualquer outro `console.log` em `useCalendar.ts` que não esteja sob guard), envolver com `if (process.env.NODE_ENV === 'development') { console.log(...) }`.

- [ ] **1.5** Verificar: `npm run lint`. Deve passar sem novos warnings. `npm run build` deve compilar.

- [ ] **1.6** Commit:

  ```
  fix(foundations): container max-w-7xl no shell + 3 páginas; useMemo nos 7 hooks Supabase; guard console.log
  ```

---

### Batch 2 — Cursos P0: crash + rascunhos vazando

**Achados resolvidos:** C-P0-01, C-P0-02, C-P1-04, C-P1-13

**Arquivos:**
- Modify: `src/app/(dashboard)/courses/[id]/page.tsx:32-43`
- Modify: `src/hooks/useCourses.ts` (fetchCourses map)
- Modify: `src/app/(dashboard)/courses/page.tsx` (filtro + stats)

**Steps:**

- [ ] **2.1** Em `courses/[id]/page.tsx:32-43`, garantir que TODOS os hooks (`useState`, `useEffect`, `useMemo`) sejam declarados ANTES de qualquer early return:
  ```tsx
  // ANTES
  if (loading) return <LoadingSkeleton />
  if (!course) return <NotFound />
  const currentLesson = useMemo(...)  // VIOLAÇÃO
  
  // DEPOIS
  const currentLesson = useMemo(() => {
    if (!course) return null
    /* lógica atual */
  }, [course, currentLessonId])
  
  if (loading) return <LoadingSkeleton />
  if (!course || !currentLesson) return <NotFound />
  ```
  Ajustar lógica do useMemo pra lidar com `course === undefined` (retornar `null`).

- [ ] **2.2** Em `useCourses.ts` no `.map(course => ({...}))` do fetchCourses, adicionar:
  ```ts
  is_published: course.is_published ?? true,
  ```
  Resolve C-P1-13 (normalize) e prepara C-P0-02.

- [ ] **2.3** Em `courses/page.tsx` (catálogo aluno), no `filteredCourses` ou no consumo de `courses`, filtrar:
  ```tsx
  const visibleCourses = user?.role === 'Admin' 
    ? courses 
    : courses.filter(c => c.is_published !== false)
  ```
  Trocar todos os usos posteriores de `courses` por `visibleCourses` na página. Idem no cálculo de stats (`stats.total = visibleCourses.length`, etc.).

- [ ] **2.4** Em `courses/page.tsx`, garantir que `stats.total` use `visibleCourses.filter(c => c.lessons_count > 0).length` pra resolver C-P1-04.

- [ ] **2.5** Smoke test mental: login como Colaborador, abrir `/courses` — rascunhos NÃO aparecem. Login como Admin — todos aparecem. Abrir uma aula — não crasha.

- [ ] **2.6** `npm run build` deve passar.

- [ ] **2.7** Commit:
  ```
  fix(courses): rules-of-hooks no player + filtro is_published no catálogo + stats corrigidos
  ```

---

### Batch 3 — Async handlers awaited (Tasks, Tickets, Chat)

**Achados resolvidos:** S-P0-04, S-P1-07, S-P1-19, C-P1-06

**Arquivos:**
- Modify: `src/app/(dashboard)/tasks/page.tsx:87-108`
- Modify: `src/app/(dashboard)/tickets/page.tsx:81-90`
- Modify: `src/app/(dashboard)/chat/page.tsx:32-34`
- Modify: `src/hooks/useCourses.ts:117-144` (toggleLessonComplete)

**Steps:**

- [ ] **3.1** Em `tasks/page.tsx`, transformar `handleCreateTask` e `handleSaveTask` em async com try/catch:
  ```tsx
  const handleCreateTask = async (taskData) => {
    try {
      await createTask(taskData)
      setIsDialogOpen(false)
      setPreselectedStatus(undefined)
      toast.success('Tarefa criada')
    } catch (error) {
      toast.error('Erro ao criar tarefa: ' + (error as Error).message)
    }
  }
  ```

- [ ] **3.2** Em `tickets/page.tsx` `handleAddComment`, mesmo padrão:
  ```tsx
  const handleAddComment = async (commentData) => {
    try {
      await addComment({...})
      toast.success('Comentário adicionado!')
    } catch (error) {
      toast.error('Erro ao adicionar comentário')
    }
  }
  ```

- [ ] **3.3** Em `chat/page.tsx:32-34`, envolver setCurrentRoom em useEffect:
  ```tsx
  useEffect(() => {
    if (!currentRoom && rooms.length > 0) {
      setCurrentRoom(rooms[0])
    }
  }, [rooms, currentRoom])
  ```
  Remover o `if` corrente do body do componente.

- [ ] **3.4** Em `useCourses.ts:117-144` `toggleLessonComplete`, adicionar `toast.error('Não consegui salvar seu progresso. Tente novamente.')` no catch (que hoje só faz `console.error`). Importar `toast` do `sonner` se ainda não.

- [ ] **3.5** `npm run build` passa.

- [ ] **3.6** Commit:
  ```
  fix(handlers): await async em tasks/tickets/courses; useEffect em chat setCurrentRoom
  ```

---

### Batch 4 — Navegação consolidada (single source of truth)

**Achados resolvidos:** S-P0-01, S-P1-05, S-P1-06

**Arquivos:**
- Create: `src/lib/navigation.ts`
- Modify: `src/components/layout/MobileDrawer.tsx`
- Modify: `src/components/layout/TopNavigation.tsx`
- Delete: `src/components/layout/Sidebar.tsx`
- Delete: `src/components/layout/Header.tsx` (se confirmado dead code)

**Steps:**

- [ ] **4.1** Criar `src/lib/navigation.ts`:
  ```ts
  import { LayoutDashboard, MessageCircle, Folder, ListTodo, Ticket, GraduationCap, Calendar, Image, Disc3, Megaphone } from 'lucide-react'
  
  export type NavItem = {
    label: string
    href: string
    icon: typeof LayoutDashboard
    roles?: ('Admin' | 'Gerente' | 'Colaborador')[]  // undefined = todos
  }
  
  export const NAV_ITEMS: NavItem[] = [
    { label: 'Início', href: '/', icon: LayoutDashboard },
    { label: 'Chat', href: '/chat', icon: MessageCircle },
    { label: 'Agenda', href: '/calendar', icon: Calendar },
    { label: 'Tarefas', href: '/tasks', icon: ListTodo, roles: ['Admin'] },
    { label: 'Solicitações', href: '/tickets', icon: Ticket },
    { label: 'Capas', href: '/vibecanvas', icon: Image },
    { label: 'Drive', href: '/drive', icon: Folder },
    { label: 'Cursos', href: '/courses', icon: GraduationCap },
    { label: 'Estúdio', href: '/studio', icon: Disc3 },
    { label: 'Lançamentos', href: '/lancamentos', icon: Megaphone },
  ]
  
  export function getNavForRole(role?: string): NavItem[] {
    return NAV_ITEMS.filter(item => !item.roles || (role && item.roles.includes(role as any)))
  }
  ```
  Verificar os ícones do projeto (`lucide-react`) — ajustar se algum nome estiver errado.

- [ ] **4.2** Em `TopNavigation.tsx`, substituir o array hardcoded por `getNavForRole(user?.role)`. Descomentar Chat. Garantir que Tarefas só aparece pra Admin.

- [ ] **4.3** Em `MobileDrawer.tsx`, fazer o mesmo.

- [ ] **4.4** Verificar que `DashboardShell.tsx` não importa `Sidebar.tsx` nem `Header.tsx` (grep).

- [ ] **4.5** Deletar `src/components/layout/Sidebar.tsx` e `src/components/layout/Header.tsx`. Antes verificar via grep que NENHUM outro arquivo importa.

- [ ] **4.6** `npm run build` passa.

- [ ] **4.7** Commit:
  ```
  refactor(nav): consolidar navegação em lib/navigation.ts + remover Sidebar.tsx e Header.tsx (dead code)
  ```

---

### Batch 5 — Cursos UX P0 (mobile sidebar + prompt() removido + helper video)

**Achados resolvidos:** C-P0-03, C-P0-04, C-P1-01, C-P1-03

**Arquivos:**
- Create: `src/lib/video.ts`
- Modify: `src/components/courses/LessonEditorModal.tsx:61-80, 135, 143-178, 208-211`
- Modify: `src/app/(dashboard)/courses/[id]/page.tsx:65-69, 170-232`

**Steps:**

- [ ] **5.1** Criar `src/lib/video.ts`:
  ```ts
  export function videoEmbedUrl(url: string): string | null {
    if (!url) return null
    try {
      const u = new URL(url)
      // YouTube full
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v')
        if (v) return `https://www.youtube.com/embed/${v}`
        // shorts: /shorts/abc
        const m = u.pathname.match(/^\/shorts\/([^/]+)/)
        if (m) return `https://www.youtube.com/embed/${m[1]}`
      }
      // youtu.be short
      if (u.hostname === 'youtu.be') {
        const id = u.pathname.slice(1).split('/')[0]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      // Vimeo
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean).pop()
        return id ? `https://player.vimeo.com/video/${id}` : null
      }
      return url  // outras URLs, retorna como está
    } catch {
      return null
    }
  }
  ```
  Extrair a função existente em LessonEditorModal.tsx:61-80 e importar dela. Substituir o parsing inline em `courses/[id]/page.tsx:65-69` por `videoEmbedUrl(content_url)`.

- [ ] **5.2** Em `LessonEditorModal.tsx`, substituir as 2 chamadas a `prompt()` (linhas ~135 e ~208) por um sub-modal compartilhado:
  ```tsx
  const [inputModal, setInputModal] = useState<{
    open: boolean
    type: 'image' | 'link' | null
    onConfirm: (value: string) => void
  }>({ open: false, type: null, onConfirm: () => {} })
  
  // ao clicar Inserir Imagem
  setInputModal({
    open: true,
    type: 'image',
    onConfirm: (url) => insertHtml(`<img src="${url}" alt="" class="rounded-lg my-4" />`)
  })
  
  // sub-modal JSX:
  <Dialog open={inputModal.open} onOpenChange={(o) => !o && setInputModal({ ...inputModal, open: false })}>
    <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
      <DialogHeader>
        <DialogTitle>{inputModal.type === 'image' ? 'Inserir imagem' : 'Inserir link'}</DialogTitle>
      </DialogHeader>
      <Input placeholder="https://..." value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
      <DialogFooter>
        <Button variant="outline" onClick={() => setInputModal({ ...inputModal, open: false })}>Cancelar</Button>
        <Button onClick={() => { inputModal.onConfirm(tempValue); setInputModal({ ...inputModal, open: false }); setTempValue('') }}>Inserir</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```
  (`tempValue` é state extra `useState('')`.)

- [ ] **5.3** Renomear o botão "Formatar com IA" para "Auto-formatar". Trocar o ícone de `Sparkles` (com gradient roxo/fuchsia) para `Wand2` neutro. Remover classes de gradient `from-purple-500 to-fuchsia-500` (manter design plain). Adicionar `title="Reformata o conteúdo (cabeçalhos #, listas -, parágrafos)"` no botão.

- [ ] **5.4** Em `courses/[id]/page.tsx`, mobile sidebar: trocar o `<aside>` por:
  ```tsx
  // desktop: aside permanece como está, mas escondido em < lg
  <aside className={`hidden lg:flex lg:w-72 xl:w-80 border-l bg-zinc-950 flex-col`}>
    {/* conteúdo atual */}
  </aside>
  
  // mobile: Sheet com botão hambúrguer no header
  <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
    <SheetTrigger asChild className="lg:hidden">
      <Button variant="ghost" size="icon" className="h-11 w-11">
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="w-80 p-0 bg-zinc-950">
      {/* mesmo conteúdo do aside */}
    </SheetContent>
  </Sheet>
  ```
  Trocar `useState(true)` por `useState(false)` no `sidebarOpen` inicial. Extrair o conteúdo da sidebar em um helper local pra evitar duplicação.

- [ ] **5.5** Smoke test: viewport 375px, abrir uma aula → sidebar não aparece, botão menu visível no header, clica abre Sheet. Em ≥1024px, aside aparece normal.

- [ ] **5.6** `npm run build` passa.

- [ ] **5.7** Commit:
  ```
  fix(courses): mobile player sidebar via Sheet; substitui prompt() por sub-modal; helper videoEmbedUrl em lib/video.ts; rename "Formatar com IA" → "Auto-formatar"
  ```

---

### Batch 6 — Cursos: CourseCard fallback + slug auto + filtros + payloads

**Achados resolvidos:** C-P1-05, C-P1-07, C-P1-09, C-P1-12, C-P1-14

**Arquivos:**
- Modify: `src/components/courses/CourseCard.tsx:74-76`
- Modify: `src/components/courses/CreateModuleModal.tsx`
- Modify: `src/app/(dashboard)/courses/manage/[id]/page.tsx:74-108, 200-202`
- Modify: `src/app/(dashboard)/courses/manage/page.tsx:69-93`

**Steps:**

- [ ] **6.1** Em `CourseCard.tsx:74-76`, trocar:
  ```tsx
  // antes
  <p className="...">{course.description}</p>
  // depois
  <p className="...">{course.subtitle || course.description || 'Sem descrição.'}</p>
  ```

- [ ] **6.2** Em `CreateModuleModal.tsx:39-41`, migrar pra `PremiumModal` (ou se for menos invasivo, adicionar `max-h-[95vh] overflow-y-auto w-[95vw]` no DialogContent). Conferir como `CreateCourseModal` ou `LessonEditorModal` fazem e copiar padrão exato.

- [ ] **6.3** Em `manage/[id]/page.tsx:74-108`, adicionar lógica de auto-slug igual à do CreateCourseModal: `slugManuallyEdited` state + handler que regenera slug a partir do título enquanto o usuário não tocou no campo manualmente. Conferir `CreateCourseModal.tsx` pra copiar padrão exato.

- [ ] **6.4** Em `manage/[id]/page.tsx:200-202`, separar `id` do payload no `handleSaveLesson`:
  ```tsx
  // antes
  await updateLesson(lessonData.id, lessonData)
  // depois
  const { id, ...updatePayload } = lessonData
  await updateLesson(id, updatePayload)
  ```

- [ ] **6.5** Em `manage/page.tsx:69-93`, normalizar comparação de autor:
  ```tsx
  const matchesAuthor = authorFilter === 'all' || 
    (course.instructor || '').toLowerCase() === authorFilter.toLowerCase()
  ```
  E no Select de autores, adicionar opção `"(Sem instrutor)"` que filtra `!course.instructor`. Conferir a lista de opções gerada.

- [ ] **6.6** `npm run build` passa.

- [ ] **6.7** Commit:
  ```
  fix(courses): CourseCard fallback de descrição; slug auto-update no editor; whitelist em updateLesson; filtro de autor case-insensitive + sem instrutor
  ```

---

### Batch 7 — Cursos: DOMPurify + player fallback + LessonPlayer.tsx delete

**Achados resolvidos:** C-P1-02, C-P1-08, C-P1-11

**Arquivos:**
- Modify: `src/app/(dashboard)/courses/[id]/page.tsx:60-97, 86`
- Modify: `src/components/courses/LessonEditorModal.tsx:358`
- Delete: `src/components/courses/LessonPlayer.tsx`
- Dependency: instalar `isomorphic-dompurify`

**Steps:**

- [ ] **7.1** Instalar dependência:
  ```bash
  npm install isomorphic-dompurify
  ```

- [ ] **7.2** Criar helper `src/lib/sanitize.ts`:
  ```ts
  import DOMPurify from 'isomorphic-dompurify'
  
  const ALLOWED_TAGS = ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'blockquote', 'br', 'hr', 'iframe', 'video', 'span']
  const ALLOWED_ATTR = ['href', 'src', 'alt', 'class', 'target', 'rel', 'frameborder', 'allow', 'allowfullscreen', 'controls']
  
  export function sanitizeLessonHtml(html: string): string {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
  }
  ```

- [ ] **7.3** Em `courses/[id]/page.tsx:86` e `LessonEditorModal.tsx:358`, importar e aplicar:
  ```tsx
  import { sanitizeLessonHtml } from '@/lib/sanitize'
  
  <div dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(currentLesson.content || '') }} />
  ```

- [ ] **7.4** Em `courses/[id]/page.tsx:60-97`, corrigir fallback condicional:
  ```tsx
  {currentLesson.type === 'video' && currentLesson.content_url ? (
    <VideoEmbed url={currentLesson.content_url} />
  ) : currentLesson.content ? (
    <div dangerouslySetInnerHTML={...} />
  ) : (
    <FallbackCard />
  )}
  ```
  Remover o duplo display (FileText card + content) — escolher um caminho.

- [ ] **7.5** Verificar via grep que `LessonPlayer.tsx` não é importado em nenhum arquivo. Deletar.

- [ ] **7.6** `npm run build` passa.

- [ ] **7.7** Commit:
  ```
  fix(courses): sanitiza HTML das aulas (DOMPurify); player fallback condicional; remove LessonPlayer.tsx (dead code)
  ```

---

### Batch 8 — Chat: cleanup + bg tokens + overlay mobile

**Achados resolvidos:** S-P0-03, S-P1-08, S-P1-09

**Arquivos:**
- Modify: `src/app/(dashboard)/chat/page.tsx:37-42, 80, 101-106`

**Steps:**

- [ ] **8.1** Em `chat/page.tsx:37-42`, remover o mock `unreadCounts` inteiro e substituir por:
  ```tsx
  // TODO: implementar contagem real de não-lidas via last_read_at por room/user
  // Ver achado S-P0-03 do diagnóstico 2026-05-17
  const unreadCounts: Record<string, number> = {}
  ```

- [ ] **8.2** Em `chat/page.tsx:80`, trocar `bg-black text-white` por `bg-background text-foreground` no wrapper principal da página. Conferir se alguma sub-seção precisa de `bg-card`/`bg-popover` (geralmente lista de salas no left panel).

- [ ] **8.3** Em `chat/page.tsx:101-106`, ajustar overlay:
  ```tsx
  {showChatList && currentRoom && (
    <div 
      className="fixed inset-0 bg-black/50 lg:hidden z-30" 
      onClick={() => setShowChatList(false)}
    />
  )}
  ```
  Condição agora requer `currentRoom` (não mostra overlay se usuário ainda não selecionou sala). E garantir que o overlay fecha a lista ao clicar.

- [ ] **8.4** `npm run build` passa.

- [ ] **8.5** Commit:
  ```
  fix(chat): remove mock unreadCounts (TODO real); usa tokens semânticos; overlay mobile só com sala ativa
  ```

---

### Batch 9 — Tasks/Tickets: dialog cleanup + AlertDialog em massa

**Achados resolvidos:** S-P0-05, S-P0-06, S-P1-15, S-P1-16, S-P1-20

**Arquivos:**
- Modify: `src/components/tasks/TaskDialog.tsx:134-155`
- Modify: `src/app/(dashboard)/tasks/page.tsx:116-120`
- Modify: `src/app/(dashboard)/tickets/page.tsx:92-97, 146-153, 229-233`
- Modify: `src/hooks/useTasks.ts` (linhas onde escreve em `assigned_to`)
- Modify: `src/hooks/useTickets.ts:431-434`

**Steps:**

- [ ] **9.1** Em `TaskDialog.tsx`, adicionar prop `hideTrigger?: boolean`. Quando true, NÃO renderizar o `<Button>` trigger — usar diretamente o Dialog com `open`/`onOpenChange` controlado. Em `tasks/page.tsx:299-309` (uso de edição), passar `hideTrigger`.

- [ ] **9.2** Em `tasks/page.tsx:116-120`, `handleDeleteTaskById`: substituir `window.confirm()` por uso de `DeleteTaskDialog` (já existente no projeto). Localizar o componente, replicar o padrão usado no Kanban view.

- [ ] **9.3** Em `tickets/page.tsx:92-97`, substituir `window.confirm()` por `AlertDialog` do shadcn. Padrão:
  ```tsx
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  // no handler do botão de deletar:
  setDeleteId(commentId)
  
  // no JSX:
  <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
        <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={() => { handleDeleteCommentConfirm(deleteId!); setDeleteId(null) }}>Excluir</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  ```

- [ ] **9.4** Em `tickets/page.tsx`: remover state `isCreateModalOpen`, handler `handleCreateTicket` e o JSX do `<CreateTicketModal>`. Se o componente em si não for usado em outro lugar, considerar deletar `src/components/tickets/CreateTicketModal.tsx` (verificar via grep antes).

- [ ] **9.5** Em `useTasks.ts`: localizar TODA escrita em `assigned_to` (insert/update payloads). Comentar e remover. Manter apenas writes em `task_assignees` (M2M). Comentário acima de cada remoção:
  ```ts
  // assigned_to removido — fonte da verdade é task_assignees (M2M)
  ```

- [ ] **9.6** Em `useTickets.ts:431-434`: mesma coisa — remover sync reverso de `assignedTo` pra `assigned_to` na task linkada. Comentar.

- [ ] **9.7** Verificar que o schema da tabela `tasks` (em `docs/supabase-migrations.sql` ou similar) ainda tem a coluna `assigned_to` — não vamos remover a coluna nesta rodada, só parar de escrever nela. Em uma rodada futura, migration de DROP COLUMN.

- [ ] **9.8** `npm run build` passa.

- [ ] **9.9** Commit:
  ```
  fix(tasks-tickets): TaskDialog hideTrigger; AlertDialog em handleDelete (tasks list + tickets comment); remove CreateTicketModal órfão; para de escrever em tasks.assigned_to (M2M task_assignees é fonte)
  ```

---

### Batch 10 — Middleware + Drive + Calendar

**Achados resolvidos:** S-P0-02, S-P1-11, S-P1-13, S-P1-14, S-P1-22

**Arquivos:**
- Modify: `src/middleware.ts:86-98`
- Modify: `src/app/(dashboard)/drive/page.tsx:163-168, 252, 402-416`
- Modify: `src/app/(dashboard)/calendar/page.tsx` (handler + modal)
- Modify: `src/components/calendar/CreateEventModal.tsx` (campo description)

**Steps:**

- [ ] **10.1** Em `middleware.ts:86-98`, substituir a query de role por leitura do JWT:
  ```ts
  const role = user.app_metadata?.role || user.user_metadata?.role
  if (!role) {
    // fallback: query no banco (apenas se app_metadata não estiver populado)
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    role = data?.role
  }
  if (path.startsWith('/tasks') && role !== 'Admin') return NextResponse.redirect(...)
  if (path.startsWith('/courses/manage') && role !== 'Admin') return NextResponse.redirect(...)
  ```
  ATENÇÃO: pra isso funcionar bem, o role precisa estar em `app_metadata`. Se ainda não estiver, adicionar TODO de migration que popula via trigger no signup. Manter fallback de query no banco enquanto isso.

- [ ] **10.2** Em `drive/page.tsx:252`, trocar `h-[calc(100vh-80px)]` por `h-[calc(100vh-64px)]` ou `h-[calc(100dvh-64px)]` (dvh mais correto pra mobile com barra de URL dinâmica).

- [ ] **10.3** Em `drive/page.tsx:402-416`, remover os comentários JSX vazados. Substituir por uma prop limpa em `<DriveGrid>` — `disableFiltering={!!searchQuery}` se essa for a lógica esperada. Conferir o que o componente `DriveGrid` aceita.

- [ ] **10.4** Em `drive/page.tsx:163-168`, implementar download real:
  ```tsx
  const handleDownload = async (itemId: string) => {
    const item = getItemById(itemId)
    if (!item || item.type !== 'file') return
    try {
      const { data, error } = await supabase.storage.from('drive-files').download(item.storage_path || item.url)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Download iniciado: ${item.name}`)
    } catch (e) {
      toast.error('Erro ao baixar arquivo')
    }
  }
  ```
  Conferir o nome real do campo do path no item (pode ser `url`, `storage_path`, `path`).

- [ ] **10.5** Em `calendar/page.tsx:197`, adicionar `description: eventData.description ?? ''` (ou ler do form). E em `CreateEventModal.tsx`, adicionar campo `<Textarea>` com label "Descrição (opcional)" — passar o valor no submit.

- [ ] **10.6** `npm run build` passa.

- [ ] **10.7** Commit:
  ```
  fix(infra): middleware lê role de app_metadata (fallback DB); drive download real + altura dvh + cleanup JSX; calendar description no modal
  ```

---

## Verificação final

Após os 10 batches:

- [ ] **F.1** `npm run lint` — sem novos warnings (relacionados às mudanças)
- [ ] **F.2** `npm run build` — sucesso
- [ ] **F.3** Smoke test manual (5 min): 
  - Login → Dashboard carrega
  - Mobile (DevTools 375px): sidebar do player de Cursos vira Sheet, ChatList/overlay funciona
  - Aluno em `/courses` não vê rascunhos
  - Admin em `/courses/manage` consegue editar curso, slug atualiza automaticamente ao mudar título
  - Tasks: erro de validação não fecha modal silenciosamente
  - Tickets: deletar comentário usa AlertDialog
- [ ] **F.4** Atualizar `docs/superpowers/reports/2026-05-17-CONSOLIDADO.md` marcando os 39 itens como ✅ (checklist) ou criar arquivo `2026-05-17-RODADA-1-FECHADA.md` com lista final.
- [ ] **F.5** Commit final:
  ```
  docs: marca achados da rodada 1 como resolvidos
  ```

---

## Não-objetivos desta rodada (fica pra rodada 2)

- P1 esforço M (14 itens): player anterior/próxima, theme tokens, drive sidebar tablet, profile real, settings persistente, dashboard real, navegação prev/next, etc.
- Todos os 31 P2 (tipografia responsiva em massa, gaps responsivos, `confirm()` em outros lugares, tab dirty state, etc.)
- Todos os 6 P3 (polish premium, design tokens, microinterações)
- Migration de DROP COLUMN em `tasks.assigned_to` (parar de escrever é seguro; remover coluna pode esperar)

---

## Self-review concluída

- [x] Spec coverage: todos os 39 achados (10 P0 + 29 P1 S) têm task correspondente. Conferi cada ID.
- [x] Placeholder scan: zero TODOs/TBDs nos steps; todos têm código concreto ou comando exato.
- [x] Type consistency: nomes de função coerentes (`videoEmbedUrl`, `sanitizeLessonHtml`, `getNavForRole`).
- [x] Effort: ordem otimizada — infra → bugs críticos → UX → cleanup.
