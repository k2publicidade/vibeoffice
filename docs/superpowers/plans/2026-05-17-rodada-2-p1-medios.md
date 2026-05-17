# Rodada 2: P1 médios + concerns rodada 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps usam checkbox `- [ ]`.

**Goal:** Fechar 10 itens (2 concerns + 7 P1 M + 1 decisão de design) sem expandir escopo de produto. Não toca em itens que precisam schema novo (Profile/Settings/Dashboard real, Drive shares, VibeCanvas Supabase) — esses ficam pra rodada 3 com brainstorm.

**Architecture:** 6 batches sequenciais, mesma cadência da rodada 1 (commit por batch). Branch: `rodada-2-p1-medios` (baseada em `rodada-1-p0-quickwins`).

**Decisões adotadas:**
- **Dark-mode-only**: app permanece dark. Settings palette picker removido (S-P1-27). Theme tokens em primitives (`bg-popover` em vez de `bg-zinc-900`) por consistência, mas sem habilitar light mode.
- **`tasks.assigned_to`**: NÃO dropar coluna nesta rodada (fica anotado pra rodada futura via migration dedicada).

---

## Batches

### Batch 1 — Concerns rodada 1 cleanup

**Achados resolvidos:** OnlineUsersSidebar reintegrado; exhaustive-deps warnings limpos.

**Files:**
- Modify: `src/components/layout/TopNavigation.tsx` ou `src/components/layout/DashboardShell.tsx` — reintegrar `OnlineUsersSidebar` (popover/sheet/sidebar fixa)
- Modify: 7 hooks (`useAuth`, `useTasks`, `useTickets`, `useChat`, `useDrive`, `useCalendar`, `usePresence`) — adicionar `supabase` nas deps de `useCallback`/`useEffect` que reclamam

**Steps:**

- [ ] **1.1** Reintegrar OnlineUsersSidebar. Decisão: virar **botão+popover no `TopNavigation`** (lado direito, perto de NotificationBell). Botão mostra contagem de online users. Click abre popover com lista de avatares + nomes. Layout: `Popover > PopoverTrigger > Button + PopoverContent > OnlineUsersList`.

  - Importar `OnlineUsersSidebar` em `TopNavigation.tsx` (verificar se hoje exporta um componente reaproveitável; se não, criar wrapper local `OnlineUsersPopover`).
  - Render: `<Popover><PopoverTrigger asChild><Button variant="ghost" size="icon"><Users className="h-5 w-5" /><Badge ...>{count}</Badge></Button></PopoverTrigger><PopoverContent className="w-72 p-0">{children}</PopoverContent></Popover>`
  - Importar `usePresence` no `TopNavigation` se necessário (ou no novo wrapper).

- [ ] **1.2** Para cada hook listado, abrir e rodar mentalmente `npm run lint -- src/hooks/<file>` (ou executar de fato). Adicionar `supabase` na deps array de cada `useCallback`/`useEffect` que reclamar. Como `supabase` é memoizado com `[]`, é referência estável — incluir nas deps é cosmético/correto.

- [ ] **1.3** Verificar:
  ```bash
  npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"
  npm run build
  ```
  Esperado: contagem de warnings caiu pra perto de 0 (alguns podem ser pré-existentes em arquivos não relacionados).

- [ ] **1.4** Commit:
  ```
  fix(rodada-2): OnlineUsersSidebar reintegrado como popover no TopNavigation + exhaustive-deps cleanup
  
  Resolve concerns C1 e C2 da rodada 1.
  ```

---

### Batch 2 — Cursos: Player Anterior/Próxima aula (C-P1-10)

**Files:**
- Modify: `src/app/(dashboard)/courses/[id]/page.tsx`

**Steps:**

- [ ] **2.1** Em `courses/[id]/page.tsx`, aplainar todas as lições em ordem:
  ```tsx
  const allLessons = useMemo(() => {
    if (!course?.modules) return []
    return course.modules
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .flatMap(m => (m.lessons || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
  }, [course])
  
  const currentIndex = useMemo(
    () => allLessons.findIndex(l => l.id === currentLessonId),
    [allLessons, currentLessonId]
  )
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
  ```

- [ ] **2.2** Adicionar handlers:
  ```tsx
  const goToLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  ```

- [ ] **2.3** Renderizar botões de navegação no painel de ações da aula (perto do "Marcar como Concluída"):
  ```tsx
  <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-zinc-800">
    <Button
      variant="outline"
      onClick={() => previousLesson && goToLesson(previousLesson.id)}
      disabled={!previousLesson}
    >
      <ChevronLeft className="mr-2 h-4 w-4" />
      Aula anterior
    </Button>
    <Button
      variant="default"
      onClick={() => nextLesson && goToLesson(nextLesson.id)}
      disabled={!nextLesson}
      className="ml-auto"
    >
      Próxima aula
      <ChevronRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
  ```

- [ ] **2.4** **Auto-avançar opcional**: quando `toggleLessonComplete` for chamado e marca aula como concluída, se houver `nextLesson`, navegar pra ela após pequeno delay (300ms pra dar tempo do toast aparecer):
  ```tsx
  await toggleLessonComplete(currentLessonId)
  if (nextLesson && !wasCompleted) {
    setTimeout(() => goToLesson(nextLesson.id), 300)
  }
  ```
  Considerar adicionar setting "Avançar automaticamente" mas começar com auto-avançar default true (UX padrão de plataforma de cursos).

- [ ] **2.5** Verificação:
  ```bash
  npm run build
  ```

- [ ] **2.6** Commit:
  ```
  feat(courses): navegacao Anterior/Proxima + auto-avancar ao concluir aula
  
  Resolve C-P1-10.
  ```

---

### Batch 3 — Drive: sidebar tablet via Sheet (S-P1-12)

**Files:**
- Modify: `src/app/(dashboard)/drive/page.tsx`

**Steps:**

- [ ] **3.1** No drive/page.tsx, a `FolderTree` está em `<div className="hidden lg:flex w-64">` — só visível em ≥1024px.

- [ ] **3.2** Refatorar igual ao player de Cursos (Batch 5 da rodada 1):
  - Manter aside desktop: `hidden lg:flex lg:w-64 xl:w-72`
  - Adicionar Sheet pra md/lg breakpoints:
    ```tsx
    <Sheet open={folderTreeOpen} onOpenChange={setFolderTreeOpen}>
      <SheetContent side="left" className="w-80 p-0 lg:hidden">
        <div className="overflow-y-auto h-full p-4">
          <FolderTree {...props} />
        </div>
      </SheetContent>
    </Sheet>
    ```
  - Adicionar botão hambúrguer "Pastas" no header do Drive (visível em < lg):
    ```tsx
    <Button
      variant="outline"
      size="sm"
      className="lg:hidden min-h-11"
      onClick={() => setFolderTreeOpen(true)}
    >
      <Folder className="mr-2 h-4 w-4" />
      Pastas
    </Button>
    ```

- [ ] **3.3** Ao clicar em uma pasta dentro do Sheet, fechar automaticamente (UX): `onFolderClick={(id) => { setCurrentFolderId(id); setFolderTreeOpen(false) }}`.

- [ ] **3.4** Verificação: `npm run build`.

- [ ] **3.5** Commit:
  ```
  fix(drive): FolderTree acessivel em mobile/tablet via Sheet com botao no header
  
  Resolve S-P1-12.
  ```

---

### Batch 4 — Tickets: useUserCache + sidebar filtros mobile

**Achados resolvidos:** S-P1-10, S-P1-21.

**Files:**
- Create: `src/hooks/useUserCache.ts`
- Modify: `src/components/tickets/TicketDetailModal.tsx`
- Modify: `src/app/(dashboard)/tickets/page.tsx`
- Modify: `src/components/tickets/TicketFilters.tsx` (se existir; senão adaptar)

**Steps:**

- [ ] **4.1** Criar `src/hooks/useUserCache.ts`:
  ```ts
  import { useEffect, useState, useMemo } from 'react'
  import { createClient } from '@/lib/supabase/client'
  
  type CachedUser = { id: string; name: string; avatar: string | null; email: string | null }
  
  let cache: Map<string, CachedUser> = new Map()
  let pendingFetch: Set<string> = new Set()
  let listeners: Set<() => void> = new Set()
  
  async function fetchUsers(ids: string[]) {
    const newIds = ids.filter(id => !cache.has(id) && !pendingFetch.has(id))
    if (newIds.length === 0) return
    newIds.forEach(id => pendingFetch.add(id))
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, name, avatar_url, email')
      .in('id', newIds)
    if (data) {
      data.forEach(u => {
        cache.set(u.id, { id: u.id, name: u.name, avatar: u.avatar_url, email: u.email })
      })
    }
    newIds.forEach(id => pendingFetch.delete(id))
    listeners.forEach(l => l())
  }
  
  /**
   * Cache global de users por id. Compartilha entre componentes que pedem o mesmo id.
   * Chame com os ids visíveis no render atual; ele faz fetch só dos que faltam.
   */
  export function useUserCache(ids: (string | null | undefined)[]) {
    const stableIds = useMemo(() => Array.from(new Set(ids.filter(Boolean) as string[])).sort(), [ids.join(',')])
    const [, force] = useState(0)
  
    useEffect(() => {
      const listener = () => force(n => n + 1)
      listeners.add(listener)
      fetchUsers(stableIds)
      return () => { listeners.delete(listener) }
    }, [stableIds.join(',')])
  
    return useMemo(() => {
      const map = new Map<string, CachedUser>()
      stableIds.forEach(id => {
        const u = cache.get(id)
        if (u) map.set(id, u)
      })
      return map
    }, [stableIds.join(','), cache.size])
  }
  
  export function getCachedUser(id: string): CachedUser | undefined {
    return cache.get(id)
  }
  ```

- [ ] **4.2** Em `TicketDetailModal.tsx`, em torno das linhas 222-225 onde tem `<p>Usuário</p>` hardcoded:
  ```tsx
  // No topo do componente:
  const userIds = useMemo(() => {
    const ids = new Set<string>()
    if (ticket.requesterId) ids.add(ticket.requesterId)
    ticket.comments?.forEach(c => c.userId && ids.add(c.userId))
    return Array.from(ids)
  }, [ticket])
  const userMap = useUserCache(userIds)
  
  // Onde antes mostrava "Usuário":
  const requester = ticket.requesterId ? userMap.get(ticket.requesterId) : null
  // ...
  <p>{requester?.name || 'Carregando...'}</p>
  ```
  Aplicar lógica análoga aos comentários (linha ~279, ~286 do diagnóstico).

- [ ] **4.3** Sidebar de filtros tickets mobile. Em `tickets/page.tsx` em torno da linha 174-178 (sidebar `lg:w-80`):
  - Extrair o JSX dos filtros em variável ou sub-componente local
  - Renderizar como sidebar fixa em ≥lg E como Sheet em < lg
  - Botão "Filtros" no header da página (visível só em <lg) com badge de contagem se houver filtro ativo
  - Padrão idêntico ao usado em `/tasks` (verificar se Tasks já tem Sheet de filtros, copiar)

- [ ] **4.4** Verificação: `npm run build`.

- [ ] **4.5** Commit:
  ```
  feat(tickets): useUserCache compartilhado + sidebar de filtros mobile via Sheet
  
  Resolve S-P1-10, S-P1-21.
  
  - lib hook useUserCache faz batched fetch de users com cache em memoria
  - TicketDetailModal mostra nome real do requester e dos commenters
  - Filtros mobile abrem via Sheet com badge de contagem
  ```

---

### Batch 5 — Small fixes: Studio + VibeCanvas

**Achados resolvidos:** S-P1-18, S-P1-25.

**Files:**
- Modify: `src/app/(dashboard)/studio/page.tsx`
- Modify: `src/app/(dashboard)/vibecanvas/page.tsx`

**Steps:**

- [ ] **5.1** Em `studio/page.tsx:109-110`, trocar `min-h-screen` por `min-h-[calc(100dvh-64px)]` (ou `min-h-full` se o pai já constrange). Confirmar que o resultado não tem scroll extra.

- [ ] **5.2** Em `vibecanvas/page.tsx:75-95`, remover `setTimeout(() => { ... }, 1500)` que era fake. Se o geração de briefing for instantânea, executar direta. Se quiser preservar percepção de "trabalho acontecendo", reduzir pra 200ms (sem mostrar overlay de loading se < 500ms).

  ```tsx
  // antes
  setIsGenerating(true)
  setTimeout(() => {
    const briefing = generateBriefing(config)
    setBriefing(briefing)
    setIsGenerating(false)
  }, 1500)
  
  // depois
  setIsGenerating(true)
  try {
    const briefing = generateBriefing(config)
    setBriefing(briefing)
  } finally {
    setIsGenerating(false)
  }
  ```

- [ ] **5.3** Verificação: `npm run build`.

- [ ] **5.4** Commit:
  ```
  fix(layout): studio min-h corrigido; vibecanvas remove setTimeout fake
  
  Resolve S-P1-18, S-P1-25.
  ```

---

### Batch 6 — Settings palette removido + theme tokens em primitives

**Achados resolvidos:** S-P1-27, S-P1-03.

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/premium-modal.tsx`

**Steps:**

- [ ] **6.1** Em `settings/page.tsx:186-204`, remover a seção "Esquema de Cores" inteira (palette picker de Coral/Azur/Esmeralda). Se houver outras referências a esse switch no estado da página, limpar (state, handlers, imports).

  Substituir pela frase "O VIBEDISTRO usa tema escuro permanente. Personalização de cores em breve." OU simplesmente omitir a seção e ajustar layout.

- [ ] **6.2** Em `src/components/ui/dialog.tsx`:69-77, trocar `bg-zinc-900 border-zinc-800` por:
  ```tsx
  bg-popover border-border text-popover-foreground
  ```
  Idem em `dropdown-menu.tsx:46-48`, `select.tsx:65-68`, `premium-modal.tsx:91-93`.

- [ ] **6.3** Verificar `globals.css` ou `tailwind.config.ts`: garantir que os tokens `--popover`, `--popover-foreground`, `--border` estão definidos pra dark mode. Se não, adicionar. (Provavelmente já estão — shadcn cria por default.)

- [ ] **6.4** Smoke test mental: abrir cada um dos componentes (Dialog, Dropdown, Select, PremiumModal) — visual deve ficar idêntico (porque dark é o único modo ativo e os tokens devem mapear pras mesmas cores zinc-900-ish).

- [ ] **6.5** Verificação: `npm run build`.

- [ ] **6.6** Commit:
  ```
  refactor(theme): remove palette picker fake; primitives usam tokens semanticos (dark-only)
  
  Resolve S-P1-27, S-P1-03.
  
  - Settings: secao "Esquema de Cores" removida (era affordance enganosa)
  - Dialog/Dropdown/Select/PremiumModal: bg-zinc-900 -> bg-popover etc.
  - Light mode permanece desabilitado por design; tokens existem apenas
    pra padronizacao visual e preparam um eventual light mode futuro
  ```

---

## Final review

- [ ] **F.1** `npm run lint` — count de warnings dropou
- [ ] **F.2** `npm run build` — passa
- [ ] **F.3** Smoke test manual: OnlineUsers popover funciona; Player Cursos tem Próxima/Anterior; Drive tem botão "Pastas" mobile; TicketDetail mostra nome real; Studio sem scroll extra; Settings sem palette picker.
- [ ] **F.4** Atualizar `2026-05-17-CONSOLIDADO.md` marcando os 9 itens P1 M + 2 concerns como resolvidos. Criar `2026-05-17-RODADA-2-FECHADA.md`.

## Não-objetivos desta rodada

- 5 itens P1 M deferidos (S-P1-17 Drive shares; S-P1-24 VibeCanvas Supabase; S-P1-26 Profile real; S-P1-28 Settings real; S-P1-29 Dashboard Colaborador real) — precisam brainstorm de schema na rodada 3
- Todos os P2 (31) e P3 (6) — rodada 4+
- Migration DROP COLUMN `tasks.assigned_to` — rodada futura dedicada
