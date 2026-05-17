# Rodada 2 — Fechada ✅

**Branch:** `rodada-2-p1-medios` (7 commits, +804 -149 linhas, 21 arquivos)
**Base:** `rodada-1-p0-quickwins` (rodada 1 precisa entrar antes desta)
**Data fim:** 2026-05-17
**Build final:** ✓ Compiled successfully, 20 rotas geradas

## 11 itens resolvidos

### Concerns da rodada 1 (2)
- [x] **C1 — OnlineUsersSidebar reintegrado** como popover no TopNavigation (botão Users com badge verde quando há online) — commit `3de3873`
- [x] **C2 — exhaustive-deps cleanup** — 24 warnings de `supabase` resolvidos nos 7 hooks (de 35→11 nos hooks; 49→25 total no projeto) — commit `3de3873`

### P1 médios (8)
- [x] **C-P1-10** — Player Anterior/Próxima + auto-avançar 400ms após concluir aula — commit `dd89e1b`
- [x] **S-P1-10** — `useUsers` reaproveitado em `TicketDetailModal` (nome/avatar real do requester e commenters) — commit `390a02d`
- [x] **S-P1-12** — Drive `FolderTree` em Sheet pra mobile/tablet + botão "Pastas" no header — commit `d29c752`
- [x] **S-P1-18** — Studio `min-h-screen` → `min-h-[calc(100dvh-64px)]` — commit `1e88981`
- [x] **S-P1-21** — Tickets filtros mobile via Sheet + badge de contagem de filtros ativos — commit `390a02d`
- [x] **S-P1-25** — VibeCanvas: `setTimeout(1500)` fake removido, geração roda síncrona — commit `1e88981`
- [x] **S-P1-27** — Settings palette picker "Coral/Azur/Esmeralda" removido (era affordance enganosa, app é dark-only) — commit `6e3cec5`
- [x] **S-P1-03** — Primitives Dialog/Dropdown/Select/PremiumModal usam tokens (`bg-popover`/`border-border`) em vez de zinc-900 hardcoded — commit `6e3cec5`

### Bônus fix descoberto durante execução
- [x] **TicketDetailModal `isCurrentUser`** — comparação com `'current-user'` literal (bug) que escondia dropdown de "excluir comentário". Corrigido com `useAuth().user.id` real — commit `390a02d`

## Métricas

| Métrica | Valor |
|---|---|
| Itens resolvidos | 11 / 11 (100%) — 8 P1 M + 2 concerns + 1 bônus |
| Commits | 7 (1 docs + 6 batches) |
| Arquivos modificados | 19 |
| Arquivos criados | 1 (`src/components/layout/OnlineUsersPopover.tsx`) |
| Linhas adicionadas | 804 |
| Linhas removidas | 149 (líquido +655) |
| Warnings ESLint resolvidos | 24 (`react-hooks/exhaustive-deps` sobre `supabase`) |
| Build status | ✓ |

## Concerns anotadas (não-bloqueantes; entrar na rodada futura)

1. **11 warnings restantes de `exhaustive-deps`** sobre funções `fetchXxx` (fetchUserProfile, fetchEvents, fetchRooms, fetchUsers, fetchItems, fetchTasks, fetchTickets, fetchComments). Fora do escopo (eram warnings já existentes não-relacionados ao `useMemo(createClient)`). Cleanup dedicado: envolver fetchers em `useCallback` ou adicionar nas deps com cuidado pra não criar loops.
2. **`getUserById` async vinda de `useTickets`** virou redundante após `useUsers` ser usado direto no modal. Candidato a remoção em refactor futuro.
3. **`view='loading'` em VibeCanvas** continua sendo setado e revertido na mesma síncrona — provavelmente nem renderiza, mas tirar exigiria revisar `view` state e o render de loading. Não tocado pra evitar escopo creep.
4. **`OnlineUsersSidebar` legacy** em `src/components/presence/` segue intocado (sem consumidores agora). Pode ser deletado em cleanup futuro.
5. **Next 16 `middleware` → `proxy` deprecation** continua. Trivial mudança mas afeta um arquivo crítico — fazer em batch dedicado com smoke test.

## O que ficou pra rodada 3+

**P1 médios que precisam decisão de schema (5 itens — rodada 3 com brainstorm):**
- S-P1-17 Drive shares real (tabela `shared_access` precisa join no fetchItems)
- S-P1-24 VibeCanvas → Supabase (tabela `vibecanvas_projects` nova)
- S-P1-26 Profile com dados reais (novas colunas em `users`: job_title, location, bio?)
- S-P1-28 Settings com dados reais (form controlado lendo de `useAuth().user`)
- S-P1-29 Dashboard Colaborador com dados reais (conectar `useCalendar`, `useTasks`, `useTickets`)

**P2 (31 itens) e P3 (6 itens)** — rodada 4+. Ver `2026-05-17-CONSOLIDADO.md` pra detalhes.

**Migration DROP COLUMN `tasks.assigned_to`** — rodada futura dedicada (paramos de escrever, mas coluna ainda existe).

## Próximo passo

Branch `rodada-2-p1-medios` pronta. Sugestão:
1. **Mergear rodada 1 primeiro** em master (`git checkout master && git merge --no-ff rodada-1-p0-quickwins`)
2. **Rebasear rodada 2** em master atualizada (`git rebase master rodada-2-p1-medios`)
3. **Smoke test mais profundo** — agora há features visíveis novas pra testar:
   - Cursos: navegação anterior/próxima funciona; auto-avança após concluir
   - TopNavigation: popover de OnlineUsers aparece e mostra lista
   - Drive: viewport 768px (iPad portrait) tem botão "Pastas" e Sheet
   - Tickets: nome real aparece no detalhe; mobile tem botão "Filtros" com badge
   - Settings: só toggle dark/light (sem palette picker)
4. **Mergear rodada 2** em master
5. Quando quiser rodada 3 (5 P1 M que precisam schema), brainstorm de schema primeiro.
