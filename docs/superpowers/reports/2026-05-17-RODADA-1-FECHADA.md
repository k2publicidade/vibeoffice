# Rodada 1 — Fechada ✅

**Branch:** `rodada-1-p0-quickwins` (10 commits, +1244 -1072 linhas, 37 arquivos)
**Data fim:** 2026-05-17
**Build final:** ✓ Compiled successfully, 20 rotas geradas

## 39 achados resolvidos

### P0 — 10/10 ✅
- [x] **C-P0-01** — Rules-of-hooks no player de aulas (`courses/[id]/page.tsx`) — commit `905920e`
- [x] **C-P0-02** — Filtro `is_published` no catálogo do aluno (`courses/page.tsx`) — commit `905920e`
- [x] **C-P0-03** — Mobile player sidebar via Sheet — commit `3a7df6c`
- [x] **C-P0-04** — `prompt()` nativo substituído por sub-modal — commit `3a7df6c`
- [x] **S-P0-01** — Navegação consolidada em `lib/navigation.ts` + Sidebar/Header deletados — commit `a6c1c6c`
- [x] **S-P0-02** — Middleware lê role de `app_metadata` (fallback DB) — commit `ad532ed`
- [x] **S-P0-03** — Mock `unreadCounts` removido (TODO real documentado) — commit `60156d2`
- [x] **S-P0-04** — `handleCreateTask` async/await com try/catch — commit `af065c8`
- [x] **S-P0-05** — Para de escrever em `tasks.assigned_to` (M2M `task_assignees` é fonte) — commit `1cebcda`
- [x] **S-P0-06** — `CreateTicketModal` órfão removido (modal + state + handler + arquivo) — commit `1cebcda`

### P1 esforço S — 29/29 ✅

**Cursos (13):**
- [x] C-P1-01 — "Formatar com IA" → "Auto-formatar" (`Wand2`, sem gradient) — commit `3a7df6c`
- [x] C-P1-02 — DOMPurify sanitiza HTML das aulas (`lib/sanitize.ts`) — commit `f1b69bf`
- [x] C-P1-03 — Helper `videoEmbedUrl` unificado (`lib/video.ts`) — commit `3a7df6c`
- [x] C-P1-04 — Stats do catálogo conta só publicados com aulas — commit `905920e`
- [x] C-P1-05 — `CreateModuleModal` migrado para `PremiumModal` — commit `6566b9e`
- [x] C-P1-06 — `toast.error` em `toggleLessonComplete` — commit `af065c8`
- [x] C-P1-07 — Slug auto-update no editor (com flag `slugManuallyEdited`) — commit `6566b9e`
- [x] C-P1-08 — Player com 4 caminhos exclusivos (vídeo / URL inválida / texto / vazio) — commit `f1b69bf`
- [x] C-P1-09 — `CourseCard` fallback `subtitle || description || 'Sem descrição.'` — commit `6566b9e`
- [x] C-P1-11 — `LessonPlayer.tsx` deletado (165 linhas dead code) — commit `f1b69bf`
- [x] C-P1-12 — `updateLesson` whitelist explícita de campos — commit `6566b9e`
- [x] C-P1-13 — `is_published ?? true` normalize em `useCourses` — commit `905920e`
- [x] C-P1-14 — Filtro de autor case-insensitive + opção "(Sem instrutor)" — commit `6566b9e`

**Sistêmico (16):**
- [x] S-P1-01 — `useMemo(createClient)` nos 7 hooks Supabase — commit `11c70de`
- [x] S-P1-02 — `DashboardShell` com container `max-w-7xl` padrão — commit `11c70de`
- [x] S-P1-04 — Profile/Settings/Tickets com container padrão (sem `w-[XX%]`) — commit `11c70de`
- [x] S-P1-05 — `Sidebar.tsx` deletado (dead code) — commit `a6c1c6c`
- [x] S-P1-06 — `Header.tsx` deletado (dead code) — commit `a6c1c6c`
- [x] S-P1-07 — Chat `setCurrentRoom` em `useEffect` — commit `af065c8`
- [x] S-P1-08 — Chat usa `bg-background/text-foreground` (tokens) — commit `60156d2`
- [x] S-P1-09 — Overlay mobile só renderiza com `showChatList && currentRoom` — commit `60156d2`
- [x] S-P1-11 — Drive altura `h-[calc(100dvh-64px)]` — commit `ad532ed`
- [x] S-P1-13 — Drive: 15 linhas de comentários JSX vazados removidos (+`disableFiltering` correto) — commit `ad532ed`
- [x] S-P1-14 — Drive download real via `supabase.storage.download()` — commit `ad532ed`
- [x] S-P1-15 — `TaskDialog` com prop `hideTrigger` — commit `1cebcda`
- [x] S-P1-16 — Tasks list usa `DeleteTaskDialog` (sem `confirm()`) — commit `1cebcda`
- [x] S-P1-19 — `handleAddComment` async/await + toast em falha — commit `af065c8`
- [x] S-P1-20 — Tickets usa `AlertDialog` no delete de comentário — commit `1cebcda`
- [x] S-P1-22 — Calendar `CreateEventModal` com campo Descrição (Textarea) — commit `ad532ed`
- [x] S-P1-23 — `console.log` de debug com guard `NODE_ENV` — commit `11c70de`

## Métricas

| Métrica | Valor |
|---|---|
| Achados resolvidos | 39 / 39 (100%) |
| Commits | 10 |
| Arquivos modificados | 33 |
| Arquivos criados | 3 (lib/navigation.ts, lib/sanitize.ts, lib/video.ts) |
| Arquivos deletados | 3 (Sidebar.tsx, Header.tsx, LessonPlayer.tsx) + 1 CreateTicketModal.tsx |
| Linhas adicionadas | 1244 |
| Linhas removidas | 1072 (líquido +172) |
| Build status | ✓ |

## Concerns anotadas (não-bloqueantes; entrar na rodada 2)

1. **`OnlineUsersSidebar` perdeu ponto de render** — vivia dentro do `Sidebar.tsx` deletado. Hook `usePresence` continua trackeando, mas a UI de online users sumiu da tela. Decidir: virar popover no `TopNavigation`, ou reintegrar em algum lugar do `DashboardShell`.
2. **Warnings `react-hooks/exhaustive-deps`** introduzidos pelo `useMemo(createClient)` — `supabase` agora é referência estável (deps `[]`), ESLint pede pra incluir nas deps de `useCallback`/`useEffect`. ~25 warnings novos, cosméticos. Limpeza em batch dedicado.
3. **`middleware` deprecation warning do Next 16.1.1** — sugere renomear para `proxy`. Pré-existente, fora do escopo. Tratar em rodada futura ou ignorar até virar erro.
4. **Coluna `tasks.assigned_to`** ainda existe no schema; paramos de escrever mas migration `DROP COLUMN` fica pra rodada futura.
5. **`app_metadata.role`** precisa ser populado via trigger no signup pra eliminar o fallback de DB query no middleware — `TODO` deixado no código.
6. **Importação `useMemo` não usada** em `manage/[id]/page.tsx` (warning pré-existente, não tocado).

## O que ficou pra rodada 2

**P1 esforço M (14 itens):**
- C-P1-10 Player com Anterior/Próxima aula
- S-P1-03 Tokens semânticos em Dialog/Dropdown/Select primitives
- S-P1-10 `useUserCache()` em TicketDetailModal
- S-P1-12 Drive sidebar tablet via Sheet
- S-P1-17 Drive `getItemShares()` real
- S-P1-18 Studio `min-h-screen` fix
- S-P1-21 Tickets sidebar mobile via Sheet
- S-P1-24 VibeCanvas pra Supabase (sair do localStorage)
- S-P1-25 Remover `setTimeout` fake do VibeCanvas
- S-P1-26 Profile com dados reais
- S-P1-27 Settings palette picker — implementar ou remover
- S-P1-28 Settings campos com mock "Usuário Premium"
- S-P1-29 Dashboard Colaborador com dados reais

**P2 (31 itens)** e **P3 (6 itens)** — ver `2026-05-17-CONSOLIDADO.md`.

## Próximo passo

Branch `rodada-1-p0-quickwins` pronta. Sugestão:
1. **Você revisa o diff** em GitHub/local (ou via `git diff master..rodada-1-p0-quickwins`)
2. **Smoke test manual** em 5 áreas:
   - Login → Dashboard carrega
   - Mobile 375px: sidebar do player de Cursos vira Sheet, ChatList overlay funciona
   - Aluno em `/courses` não vê rascunhos; Admin vê todos
   - Tasks: erro de validação ao criar mantém modal aberto + toast
   - Tickets: deletar comentário abre AlertDialog (não confirm nativo)
3. **Merge para master** (`git checkout master && git merge --no-ff rodada-1-p0-quickwins`)
4. Quando quiser rodada 2, falar comigo.
