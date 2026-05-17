# Relatório consolidado — Diagnóstico VIBEDISTRO + Cursos

**Data:** 2026-05-17
**Fonte:** Agente A (Cursos deep-dive) + Agente B (Auditoria sistêmica), spec `2026-05-16-revisao-sistema-cursos-design.md`
**Total:** 79 achados (P0=10, P1=32, P2=31, P3=6)
**ID format:** `<C|S>-<P0-3>-<NN>` — **C** = Cursos (Agente A), **S** = Sistêmico (Agente B)

---

## Resumo executivo

**Cursos.** Funciona pra demo, mas falha em uso real. O player do aluno tem **bug de rules-of-hooks (crash)** e rascunhos vazam pro catálogo. Rich-text editor usa `prompt()` nativo e "Formatar com IA" é falsa (regex local). Sidebar do player some no mobile sem botão. 5-6 P0/P1 fechados levam o módulo pra "funciona perfeitamente".

**Sistema.** 3 sistemas de navegação coexistem com listas divergentes (`Sidebar.tsx` é dead code). Middleware faz query Supabase no role a cada nav. Hooks criam N+1 clients Supabase. 3 páginas violam padrão de container do CLAUDE.md. Dashboard do Colaborador é 90% mock sem indicação. Chat tem `unreadCounts` que quebra com rooms vazias. Tasks e Tickets têm `handleCreate*` não-awaited → fecha modal antes do erro aparecer.

**Padrão sistêmico de bug:** uso de `confirm()`/`prompt()` nativos em 5+ lugares onde já existe `AlertDialog` no projeto. Esses são quick-wins idênticos.

---

## P0 — Bloqueantes (10) — fechar tudo antes de qualquer outra coisa

### Esforço S (≤30min)

- [ ] **C-P0-01** — React Hook chamado após early return causa crash no player de aulas — `src/app/(dashboard)/courses/[id]/page.tsx:32-43`. Mover early returns pra DEPOIS de todos os hooks.
- [ ] **C-P0-02** — Catálogo do aluno mostra cursos não publicados (rascunhos vazam) — `src/app/(dashboard)/courses/page.tsx:33-36` + `useCourses.ts`. Filtrar `is_published=true` no fetch quando role ≠ Admin.
- [ ] **S-P0-04** — `handleCreateTask` não awaita promise — modal fecha cedo, erros silenciosos — `src/app/(dashboard)/tasks/page.tsx:87-92`. Adicionar `async`/`await` + try/catch.
- [ ] **S-P0-06** — `CreateTicketModal` renderizado mas botão comentado — modal nunca abre, código órfão — `src/app/(dashboard)/tickets/page.tsx:146-153, 229-233`. Decidir: trazer botão de volta OU remover modal+state.

### Esforço M (1-3h)

- [ ] **C-P0-03** — Player do aluno em mobile fica com sidebar sobreposta sem botão pra fechar — `courses/[id]/page.tsx:19, 170-232`. Sidebar vira drawer (Sheet) em mobile.
- [ ] **C-P0-04** — `LessonEditorModal` usa `prompt()` nativo pra capturar URL de imagem/link — `LessonEditorModal.tsx:135, 208-211`. Substituir por sub-modal/popover com Input.
- [ ] **S-P0-01** — 3 sistemas de navegação concorrentes com listas divergentes (Sidebar, MobileDrawer, TopNavigation) — Chat só em mobile, Capas só no top, Lançamentos só em mobile. Consolidar em `lib/navigation.ts`, deletar `Sidebar.tsx` (dead code).
- [ ] **S-P0-02** — Middleware faz query Supabase em cada request pra checar role — `src/middleware.ts:86-98`. Ler role do JWT custom claim ou cookie.
- [ ] **S-P0-03** — Chat: `unreadCounts` hardcoded com `rooms[3]?.id` vira `{ undefined: 1 }` quando rooms vazia — `src/app/(dashboard)/chat/page.tsx:37-42`. Remover mock OU implementar `last_read_at` real.
- [ ] **S-P0-05** — `assigned_to` removido visualmente mas ainda escrito/lido em hooks (useTasks, useTickets) — pode quebrar em prod se coluna mudar. Decidir padrão (M2M `task_assignees` OU 1-to-1 `assigned_to`).

---

## P1 — Alto (32) — agrupados por tema

### 🚨 Quick-wins (esforço S) — 18 itens

**Cursos:**
- [ ] **C-P1-01** — "Formatar com IA" é regex local com nome enganoso — `LessonEditorModal.tsx:143-178`. Renomear (`Wand2`, "Auto-formatar") OU implementar IA real.
- [ ] **C-P1-02** — `dangerouslySetInnerHTML` sem sanitização no player e preview — `courses/[id]/page.tsx:86`, `LessonEditorModal.tsx:358`. Adicionar `isomorphic-dompurify`.
- [ ] **C-P1-03** — Parsing de YouTube URL no player quebra em formatos comuns (timestamp, shorts, list) — `courses/[id]/page.tsx:65-69`. Extrair função correta de `LessonEditorModal:61-80` pra `src/lib/video.ts`.
- [ ] **C-P1-04** — "Cursos disponíveis" no stat conta rascunhos vazios — `courses/page.tsx:19-31`. Filtrar `is_published && lessons_count > 0`.
- [ ] **C-P1-05** — `CreateModuleModal` não migrou pro `PremiumModal` — vulnerável ao bug de altura — `CreateModuleModal.tsx:39-41`. Migrar.
- [ ] **C-P1-06** — `toggleLessonComplete` falha silenciosamente — sem toast de erro — `useCourses.ts:117-144`. Adicionar `toast.error` no catch.
- [ ] **C-P1-07** — Editor de curso não auto-atualiza slug ao mudar título — `manage/[id]/page.tsx:74-108`. Replicar `slugManuallyEdited` do CreateCourseModal.
- [ ] **C-P1-08** — Player: fallback `FileText` aparece mesmo com `content` HTML real — `courses/[id]/page.tsx:60-97`. Condicionar fallback só quando sem `content` nem `content_url`.
- [ ] **C-P1-09** — `CourseCard` mostra área vazia quando description é null — `CourseCard.tsx:74-76`. Fallback `subtitle || 'Sem descrição.'`.
- [ ] **C-P1-11** — `LessonPlayer.tsx` é código morto (165 linhas não importadas) — deletar ou refatorar `[id]/page.tsx` pra usar.
- [ ] **C-P1-12** — `updateLesson` envia payload completo com `id` — frágil ao adicionar coluna nova — `manage/[id]/page.tsx:200-202`. Whitelist + separar `id`.
- [ ] **C-P1-13** — `is_published !== false` é frágil pra cursos legacy sem o campo — `useCourses`. Normalizar `is_published: course.is_published ?? true` no map.
- [ ] **C-P1-14** — Filtro de autor no admin ignora `instructor` nulo e é case-sensitive — `manage/page.tsx:69-93`. Add "(Sem instrutor)" + normalizar case.

**Sistêmico:**
- [ ] **S-P1-01** — Hooks duplicam `createClient()` em cada chamada (N+1 instances) — `useAuth/useTasks/useTickets/useChat/useDrive/useCalendar/usePresence`. Envolver em `useMemo`.
- [ ] **S-P1-02** — DashboardShell ignora padrão container do CLAUDE.md — `DashboardShell.tsx:24`. `max-w-7xl px-4 sm:px-6 lg:px-8`.
- [ ] **S-P1-04** — 3 páginas usam `w-[90%]`/`w-[95%]` proibidos — `tickets/page.tsx:106`, `profile/page.tsx:56`, `settings/page.tsx:72`. Trocar pelo container padrão.
- [ ] **S-P1-05** — `Sidebar.tsx` é dead code (120 linhas) — deletar.
- [ ] **S-P1-07** — Chat: `setCurrentRoom(rooms[0])` chamado no render — loop / strict mode warning — `chat/page.tsx:32-34`. Envolver em `useEffect`.
- [ ] **S-P1-08** — Chat: `bg-black text-white` fixo, ignora theme tokens — `chat/page.tsx:80`. Trocar pra `bg-background text-foreground`.
- [ ] **S-P1-09** — Chat mobile: overlay do ChatList persiste quando lista visível — `chat/page.tsx:101-106`.
- [ ] **S-P1-11** — Drive: altura `h-[calc(100vh-80px)]` mas header é 64px — `drive/page.tsx:252`. Padronizar offset.
- [ ] **S-P1-13** — Drive: comentário literal vazado dentro de JSX (15 linhas) — `drive/page.tsx:402-416`.
- [ ] **S-P1-14** — Drive: `handleDownload` só dá toast, **não baixa arquivo nenhum** — `drive/page.tsx:163-168`. Implementar `supabase.storage.download()`.
- [ ] **S-P1-15** — TaskDialog renderiza trigger button mesmo em modo controlled — DOM duplicado — `TaskDialog.tsx:134-155`. Add prop `hideTrigger`.
- [ ] **S-P1-16** — Tasks list view usa `confirm()` nativo pra deletar (mas Kanban usa DeleteTaskDialog premium) — `tasks/page.tsx:116-120`.
- [ ] **S-P1-19** — Tickets: `handleAddComment` não-awaited, `toast.success` mesmo em falha — `tickets/page.tsx:81-90`.
- [ ] **S-P1-20** — Tickets: `confirm()` nativo pra deletar comentário — `tickets/page.tsx:92-97`.
- [ ] **S-P1-22** — Calendar: `description` ignorada no `handleCreateEvent` — `calendar/page.tsx:197`. Add campo no modal + handler.
- [ ] **S-P1-23** — Calendar: `console.log` de debug em prod — `calendar/page.tsx:181-188`. Guard com `NODE_ENV`.

### 🛠 Médios (esforço M) — 14 itens

**Cursos:**
- [ ] **C-P1-10** — Player sem botões "Anterior / Próxima aula" + sem auto-avançar — `courses/[id]/page.tsx:139-166`.

**Sistêmico:**
- [ ] **S-P1-03** — Primitivos de modal (Dialog/Dropdown/Select) usam `bg-zinc-900` fixo — quebra em light mode — `ui/dialog.tsx:69-77` etc. Trocar pra tokens semânticos OU remover oficialmente light mode.
- [ ] **S-P1-06** — `Header.tsx` é dead code (85 linhas) — deletar/deprecar.
- [ ] **S-P1-10** — Tickets: hardcoded "Usuário" em TicketDetailModal — `TicketDetailModal.tsx:222-225`. Implementar `useUserCache()`.
- [ ] **S-P1-12** — Drive sidebar `hidden lg:flex` — em tablet (768-1023px) some sem alternativa. Add Sheet drawer.
- [ ] **S-P1-17** — Drive: `getItemShares()` retorna `[]` (TODO) — UI de compartilhar mente — `useDrive.ts:96, 284, 346`. Join com `shared_access`.
- [ ] **S-P1-18** — Studio: `min-h-screen` ignora layout do shell — scroll quebrado — `studio/page.tsx:109-110`.
- [ ] **S-P1-21** — Tickets: sidebar de filtros sem drawer mobile — consome 30vh — `tickets/page.tsx:174-178`.
- [ ] **S-P1-24** — VibeCanvas salva em localStorage, não em Supabase — perde projetos entre devices — `vibecanvas/storageService.ts`.
- [ ] **S-P1-25** — VibeCanvas: `setTimeout` fake de 1500ms ao gerar briefing — `vibecanvas/page.tsx:75-95`.
- [ ] **S-P1-26** — Profile: dados 100% fake e botões inertes — `profile/page.tsx:45-49, 109-114, 161-167`.
- [ ] **S-P1-27** — Settings: palette picker (Coral/Azur/Esmeralda) não persiste nada — `settings/page.tsx:186-204`.
- [ ] **S-P1-28** — Settings: campos preenchidos com mock "Usuário Premium" — `settings/page.tsx:119-124`. Ler de `useAuth()`.
- [ ] **S-P1-29** — Dashboard Colaborador: 90% mock sem indicação visual ("Em 19 min" estático, console.log em handlers) — `(dashboard)/page.tsx:96-230`.

---

## P2 — Médios (31)

Não vou listar todos aqui pra não saturar — estão completos nos relatórios A e B. **Categorização:**

| Tema | Itens | Esforço típico |
|---|---|---|
| **Tipografia sem escala responsiva** (h1/h2 sem `md:`) | C-P2-02, S-P2-02 | S |
| **Container/padding/gap não-responsivo** (padrão CLAUDE.md) | C-P2-04, C-P2-05, C-P2-13 | S |
| **`confirm()` nativo (deve ser AlertDialog)** | C-P2-15, S-P2-04, S-P2-08 | S/M |
| **`window.confirm`/`prompt` em outros lugares** | C-P2-15 | S |
| **Editor de aula: drift entre preview e player real** | C-P2-11, C-P2-12 | S |
| **Falsa affordance (drag handle decorativo, edit button sem onClick, tab "IA em breve")** | C-P2-09, S-P2-13 | S |
| **Touch targets < 44px** (a11y CLAUDE.md) | C-P2-07 | S |
| **Dirty state sem aviso** (tab switch perde alterações, switch publish dirty) | C-P2-01, C-P2-14 | M |
| **Stats/contadores frágeis** (case-sensitivo, vazios) | C-P2-10, S-P2-05 | S |
| **Acentos PT-BR ausentes em Lançamentos** ("Lancamentos", "Lancado") | S-P2-09 | S |
| **N+1 queries em useCourses (`select *` em modules+lessons)** | C-P2-16 | M |
| **Migrations faltando `updated_at` em modules/lessons/calendar_events** | C-P2-17, S-P2-07 | S |
| **Inputs sem `min`/`max`/`step` (duração aceita negativos/decimais)** | C-P2-18 | S |
| **Layout drift (skeleton ≠ render real, fixed bg, w-fixo)** | S-P2-03, S-P2-12, S-P2-10 | S/M |
| **Empty states pobres / falta de "Sem instrutor"** | C-P2-08 | S |
| **NotificationBell sem contador numérico visível** | S-P2-03 | S |
| **ThemeToggle existe mas não renderizado** | S-P2-01 | S |
| **Lançamentos sem guard de role** | S-P2-11 | S |
| **Admin/Avisos: removeu guard, Colaborador entra mas vê interface inerte** | S-P2-14 | S |

📖 **Detalhes completos:** `docs/superpowers/reports/2026-05-17-agente-a-cursos.md` (P2 = 19 itens) + `2026-05-17-agente-b-sistemico.md` (P2 = 12 itens).

---

## P3 — Polish premium (6)

- **C-P3-01** — CourseCard hover `y: -5, scale: 1.01` causa layout shift em grids densas. Reduzir pra `y: -2, scale: 1.005`.
- **C-P3-02** — "Vibe Academy" hardcoded `text-red-600`, sem `--brand-primary` token. Criar token central.
- **C-P3-03** — Stats no catálogo com ícones gigantes opacity-5 — estética datada/genérica. Substituir.
- **C-P3-04** — Editor: tabs "Informações/Conteúdo/Publicação" sem badge de incompleto. Add indicadores `⚠️ / ✓`.
- **S-P3-01** — Cores fixas em hex hardcoded em 15+ lugares (`#fc7a67`, `#ff0300`). Definir tokens centrais.
- **S-P3-02** — Studio é visualmente desconectado do resto do app (estética isolada). Decidir: intencional (isolar com namespace) ou padronizar.

---

## Recomendação de próxima rodada

**Sugestão de pacote inicial (P0 + quick-wins P1 = 28 itens, ~1 dia de trabalho):**

1. Todos os 10 P0 (4 esforço S, 6 esforço M)
2. Todos os 18 P1 esforço S (a maioria são `confirm()` → `AlertDialog`, hooks `useMemo(createClient)`, container padrão, etc. — muito boa relação efeito/esforço)

**Próxima rodada (resto):**

3. 14 P1 esforço M (player anterior/próxima, theme tokens, drive download de tablet drawer, profile real, etc.)
4. P2 priorizados por tema (consertar `confirm()` em massa, tipografia em massa, etc.)
5. P3 quando tiver fôlego de design.

---

## Como você quer marcar o que entra?

Diz uma das opções:
- **"Vai com a sugestão"** — eu encaro os 28 itens do pacote inicial (P0 + P1 quick-wins)
- **"Só P0"** — eu vou só nos 10 bloqueantes primeiro
- **"Marco eu"** — me passa a lista de IDs (ex: `C-P0-01, C-P0-02, S-P0-01, ...`) que você quer ver corrigidos
- **"Foco em Cursos primeiro"** — eu fecho TODO Cursos (4 P0 + 14 P1 + 19 P2 = 37 itens) antes de tocar no resto
