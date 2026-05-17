# Relatório do Agente B — Auditoria sistêmica

## Resumo executivo

O sistema VIBEDISTRO está funcional mas com saúde mediana. A camada global apresenta inconsistências estruturais sérias: três sistemas de navegação coexistindo (Sidebar.tsx, MobileDrawer.tsx, TopNavigation.tsx) com listas de itens divergentes (Chat aparece em Sidebar/MobileDrawer mas está comentado em TopNavigation; Lançamentos só aparece em MobileDrawer; Capas só em TopNavigation), levando a UX confusa de qual é o menu oficial. O middleware faz uma query extra no Supabase a cada navegação para checar role (sem cache), penalizando performance. O Chat **define unreadCounts via mock hardcoded** apontando para slots indexados de `rooms` que podem ser undefined — quebra em runtime se houver menos salas. Modais usam dois sistemas distintos (Dialog do Shadcn em alguns, PremiumModal em outros) com regras de mobile diferentes. Cinco páginas (`profile`, `settings`, `tickets`) ainda usam `w-[90%]` ou `w-[95%]` em vez do container padrão do CLAUDE.md. O Dashboard do Colaborador exibe dados quase 100% mockados sem indicação visual de placeholder, podendo confundir o usuário sobre o que é real. Módulos secundários (Studio, VibeCanvas) estão em mundos visuais isolados (sem usar Premium tokens) e VibeCanvas guarda projetos em localStorage sem sincronização com Supabase.

## Achados globais (afetam vários módulos)

### [P0] Três sistemas de navegação concorrentes com listas divergentes
- **Módulo/arquivo:** `src/components/layout/Sidebar.tsx:26-36`, `src/components/layout/MobileDrawer.tsx:26-37`, `src/components/layout/TopNavigation.tsx:19-31`
- **Categoria:** bug-funcional
- **O que acontece:** `Sidebar` lista [Início, Chat, Arquivos, Tarefas, Solicitações, Cursos, Agenda, Estúdio]. `MobileDrawer` lista [Início, Chat, Arquivos, Solicitações, Cursos, Agenda, Estúdio, **Lançamentos**] — mesmo Chat e mais "Lançamentos". `TopNavigation` (a barra que de fato é renderizada no `DashboardShell`) lista [Início, Agenda, Solicitações, **Capas**, Drive, Cursos, Estúdio, Lançamentos] — Chat está comentado. Usuário acessa Chat no mobile mas não acha o item no desktop; "Capas" só existe no top.
- **Por que importa:** rotas legítimas (chat, vibecanvas/capas) ficam órfãs dependendo do dispositivo. Sidebar.tsx é dead code (`DashboardShell` não a renderiza, só usa `MobileDrawer` + `TopNavigation`).
- **Sugestão de fix:** decidir uma fonte da verdade de itens de navegação (constante em `lib/navigation.ts`) e reutilizar em MobileDrawer/TopNavigation. Deletar Sidebar.tsx se não é mais usado (`DashboardShell.tsx` não importa).
- **Esforço estimado:** M

### [P0] Middleware faz query Supabase em cada request para checar role
- **Módulo/arquivo:** `src/middleware.ts:86-98`
- **Categoria:** bug-funcional / performance
- **O que acontece:** Toda requisição que bate em `/tasks*` ou `/courses/manage*` dispara `supabase.from('users').select('role').eq('id', user.id).single()` no middleware. Sem cache. Em rotas Admin-only com SSR, isso adiciona latência fixa em cada navegação + cliques internos no Next.
- **Por que importa:** UX percebida como lenta em rotas Admin; carga no Supabase. Se o usuário não-Admin entrar em `/tasks` rapidamente várias vezes, é overhead desnecessário.
- **Sugestão de fix:** ler role do JWT custom claim (`user.app_metadata.role`) ou de um cookie próprio populado no login. Senão, cachear via Edge memo durante a sessão.
- **Esforço estimado:** M

### [P1] Hooks duplicam `createClient()` em cada chamada — N+1 instâncias por página
- **Módulo/arquivo:** `src/hooks/useAuth.ts:27`, `useTasks.ts:66`, `useTickets.ts:63`, `useChat.ts:56`, `useDrive.ts:66`, `useCalendar.ts:44`, `usePresence.ts:16`
- **Categoria:** bug-funcional
- **O que acontece:** Cada hook cria um cliente Supabase próprio com `createClient()` chamado fora de `useMemo`. Em uma página como `/calendar` que monta `useCalendar` + `useAuth` + `useTasks` + `useTickets` + `useUsers`, são 5+ instâncias do client criadas em cada render.
- **Por que importa:** Vaza listeners, gera GC pressure, e Realtime channels podem se duplicar. Comentário `[C05]` diz "client criado por hook para evitar sessão stale" — solução melhor seria singleton com refresh observável.
- **Sugestão de fix:** envolver em `useMemo(() => createClient(), [])` em cada hook, ou expor singleton via Provider/Context.
- **Esforço estimado:** S

### [P1] DashboardShell ignora padrão de container responsivo do CLAUDE.md
- **Módulo/arquivo:** `src/components/layout/DashboardShell.tsx:24`
- **Categoria:** bug-mobile
- **O que acontece:** `<main className="mx-auto max-w-none px-4 py-4 md:px-6 md:py-6 lg:px-8">`. Sem `max-w-7xl`. Páginas filhas precisam definir seu próprio container, e várias divergem (`w-[90%]`, `w-[95%]`, `max-w-2xl`, `max-w-7xl`).
- **Por que importa:** quebra o padrão obrigatório do CLAUDE.md ("Container Pattern: SEMPRE usar `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`"). Em telas ultrawide, conteúdo se espalha sem limite.
- **Sugestão de fix:** mudar para `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8`. Para módulos full-bleed (chat, calendar, drive), aplicar override em nível de página.
- **Esforço estimado:** S

### [P1] Modal genérico Dialog usa `bg-zinc-900` fixo — dark-mode-only sem suporte light
- **Módulo/arquivo:** `src/components/ui/dialog.tsx:69-77`, `dropdown-menu.tsx:46-48`, `select.tsx:65-68`, `premium-modal.tsx:91-93`
- **Categoria:** bug-visual / dark-mode
- **O que acontece:** Os primitivos do shadcn foram editados pra hardcode `bg-zinc-900`/`border-zinc-800`. O CLAUDE.md menciona `next-themes` (dark/light), mas em modo light estes modais ficariam invisíveis/quebrados (texto escuro em fundo escuro num app teoricamente light).
- **Por que importa:** Se light mode for algum dia ativado (settings/page.tsx tem switch de aparência), modais quebram instantaneamente. Mesmo no dark, faltam tokens semânticos (`bg-popover`, `bg-card`) — inconsistência.
- **Sugestão de fix:** trocar `bg-zinc-900` por `bg-popover text-popover-foreground` e definir os tokens no theme. Ou remover oficialmente o suporte a light e atualizar settings/page.tsx pra mostrar isso (que já tem texto "Sempre Escuro").
- **Esforço estimado:** M

### [P1] Páginas com largura fixa via `w-[90%]` ou `w-[95%]` violam padrão
- **Módulo/arquivo:** `src/app/(dashboard)/tickets/page.tsx:106`, `src/app/(dashboard)/profile/page.tsx:56`, `src/app/(dashboard)/settings/page.tsx:72`
- **Categoria:** bug-mobile
- **O que acontece:** Três páginas usam classes proibidas pelo CLAUDE.md ("NUNCA usar `w-[90%]`"). No mobile 320px o `w-[95%]` deixa 5% de margem total (~16px), apertando elementos.
- **Por que importa:** quebra do padrão de container, espaçamento inconsistente entre módulos, edge cases em mobile.
- **Sugestão de fix:** trocar por `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`. Em settings/profile, considerar `max-w-5xl`.
- **Esforço estimado:** S

### [P1] Componente Sidebar.tsx é dead code (não renderizado em lugar nenhum)
- **Módulo/arquivo:** `src/components/layout/Sidebar.tsx` (todo arquivo)
- **Categoria:** bug-funcional
- **O que acontece:** `DashboardShell.tsx` só renderiza `TopNavigation` + `MobileDrawer`. `Sidebar.tsx` (120 linhas) não é importado em nenhum lugar mas continua sendo mantido, com lista de navegação divergente do que está em uso.
- **Por que importa:** Manutenção: alguém vê o arquivo e edita achando que é a navegação real (esse foi o caso provável da inconsistência do achado P0).
- **Sugestão de fix:** apagar `Sidebar.tsx` ou converter em export documentado deprecated.
- **Esforço estimado:** S

### [P2] Header.tsx (componente layout/Header.tsx) também é dead code
- **Módulo/arquivo:** `src/components/layout/Header.tsx` (todo arquivo)
- **Categoria:** bug-funcional
- **O que acontece:** mesma situação: `DashboardShell` usa `TopNavigation`, não `Header`. Header.tsx (85 linhas) tem search bar separada e está orfão.
- **Por que importa:** confusão para devs. Search bar funcional no Header.tsx pode tentar ser implementada de novo no TopNavigation.
- **Sugestão de fix:** apagar ou marcar como deprecated.
- **Esforço estimado:** S

### [P2] ThemeToggle existe mas não está renderizado em lugar nenhum
- **Módulo/arquivo:** `src/components/layout/ThemeToggle.tsx`
- **Categoria:** gap-ux
- **O que acontece:** Component completo de toggle de tema escuro/claro existe mas o `TopNavigation` não o renderiza. Settings.tsx menciona "Sempre Escuro" como padrão sem opção real de troca.
- **Por que importa:** UX inconsistente: usuário pode encontrar componentes que dizem que claro/escuro existe (settings 188-204), mas não há como trocar.
- **Sugestão de fix:** ou adicionar ThemeToggle no TopNavigation à direita, ou remover toda referência a "Esquema de Cores" no Settings (settings/page.tsx:185-203) — assumir dark-only e renomear o seletor pra outra coisa.
- **Esforço estimado:** S

### [P2] tubelight-navbar usa `fixed bottom-0 sm:top-0` que conflita com layout
- **Módulo/arquivo:** `src/components/ui/tubelight-navbar.tsx:48-52`
- **Categoria:** bug-visual
- **O que acontece:** NavBar tem `fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6`. Mas é renderizado *dentro* do `TopNavigation` que já é sticky (`sticky top-0 z-50 h-16`). O `fixed` faz com que ele "saia" do header e fique flutuando no top do viewport, sobrepondo o logo em telas menores.
- **Por que importa:** Em desktop em width médio (md ~768-1024px), a navegação central pode sobrepor logo/avatar. O `pb-[15px]` no className passado em TopNavigation:82 sugere que tem ajuste manual pra compensar — sintoma de design quebrado.
- **Sugestão de fix:** dentro do TopNavigation, NavBar deve ser `relative` ou `absolute` dentro do header pai, não `fixed`. Re-arquitetar tubelight-navbar para receber prop `position="inline" | "fixed"`.
- **Esforço estimado:** M

### [P2] Notifications bell (NotificationBell) sem badge de contagem visível clara
- **Módulo/arquivo:** `src/components/layout/Header.tsx:60` (dead code) e `TopNavigation:86`
- **Categoria:** gap-ux
- **O que acontece:** Em Header.tsx, há um dot vermelho fixo (`absolute top-1 right-1 h-2 w-2 bg-red-500`) sem número, e em TopNavigation o `<NotificationBell />` é usado mas precisa ser revisto. Não há indicação de QUANTAS notificações estão pendentes.
- **Por que importa:** UX padrão exige contador numérico. Sem ele, usuário não tem urgência clara.
- **Sugestão de fix:** revisar NotificationBell.tsx para mostrar badge `9+` quando >9.
- **Esforço estimado:** S

### [P3] Cores fixas em hex hardcoded em todo o projeto (sem token)
- **Módulo/arquivo:** múltiplos — `tasks/page.tsx:193 #fc7a67/#ef5907`, `tickets/page.tsx:148`, `drive/page.tsx:259`, `settings/page.tsx:76`, etc.
- **Categoria:** design-premium
- **O que acontece:** o gradient `from-[#fc7a67] to-[#ff0300]` aparece em ~15+ lugares com pequenas variações (`fe6e5b`, `cc0200`, `ef5907`, `fc7a67`). Sem `--primary` token central.
- **Por que importa:** mudar a identidade visual exige caça-e-substitui em 30+ arquivos. Cores divergem em tons sutis.
- **Sugestão de fix:** definir em `globals.css` ou `tailwind.config.ts` algo como `--brand-primary: 252 122 103; --brand-primary-dark: 255 3 0;` e usar `bg-brand-gradient` shortcut.
- **Esforço estimado:** L

## Achados por módulo

### Dashboard

### [P1] Dados do Colaborador 90% mockados sem nenhuma indicação visual
- **Módulo/arquivo:** `src/app/(dashboard)/page.tsx:96-230`
- **Categoria:** gap-ux
- **O que acontece:** O dashboard renderiza "Reunião mensal de retrospectiva — Em 19 min", "Eficiência 78%", "Projeto WeBuild 16.5h", "Férias 16/03 a 26/03", "Treinamento de Design 15:30". Tudo hardcoded. Comentário linha 96 diz "Mock data". `handleSaveRequest` e `handleSaveMeeting` só fazem `console.log` (linhas 68, 82).
- **Por que importa:** Usuário usando o sistema fica confuso porque vê informações falsas como se fossem dele. "Em 19 min" muda nunca. Quebra credibilidade.
- **Sugestão de fix:** ou conectar com hooks reais (useCalendar, useTasks), ou adicionar overlay `[DEMO]` em cada card até virar real, ou esconder seções não implementadas.
- **Esforço estimado:** L

### [P2] NewRequestModal e ScheduleMeetingModal não persistem dados
- **Módulo/arquivo:** `src/app/(dashboard)/page.tsx:61-83`
- **Categoria:** bug-funcional
- **O que acontece:** Handlers chamam `console.log` e o comentário `// TODO: Integrar com API real`. Usuário preenche solicitação, clica "Salvar", modal fecha sem feedback de sucesso ou de fracasso — fica sem saber.
- **Por que importa:** dados sumindo silenciosamente. Pode usuário não percebe.
- **Sugestão de fix:** ou implementar persistência (criar tabelas requests/meetings), ou pelo menos `toast.info("Em breve: solicitações reais")` para sinalizar.
- **Esforço estimado:** M

### [P2] Skeleton de carregamento não casa com layout real do dashboard
- **Módulo/arquivo:** `src/app/(dashboard)/page.tsx:232-247`
- **Categoria:** bug-visual
- **O que acontece:** Skeleton mostra 1 row + 2 rows de 3 colunas. Mas o dashboard real do Admin/Manager tem layout próprio em `AdminDashboard.tsx`/`ManagerDashboard.tsx` muito diferente.
- **Por que importa:** flash de layout errado durante carregamento (LCP shift).
- **Sugestão de fix:** mover skeleton para dentro de cada subcomponente Admin/Manager/Colaborador, casando com a estrutura real de cada um.
- **Esforço estimado:** M

### Chat

### [P0] `unreadCounts` quebra com `rooms[0]?.id` mas usado como key de objeto
- **Módulo/arquivo:** `src/app/(dashboard)/chat/page.tsx:37-42`
- **Categoria:** bug-funcional
- **O que acontece:** `const unreadCounts: Record<string, number> = { [rooms[0]?.id]: 3, [rooms[3]?.id]: 1, ... }`. Se `rooms` está vazio (loading inicial) ou tem menos de 4 itens, `rooms[3]?.id` é `undefined` e o objeto vira `{ undefined: 1 }`. Pior: `[undefined]` em JS vira a string `"undefined"` como key — perda de dados e bug silencioso.
- **Por que importa:** valor que era pra contar mensagens não lidas vira lixo. Em mobile abrindo o app primeira vez, `rooms` chega vazio antes do fetch.
- **Sugestão de fix:** computar `unreadCounts` real do banco (campo `last_read_at` por user/room), ou pelo menos remover esses placeholders fakes do código.
- **Esforço estimado:** M

### [P1] `setCurrentRoom(rooms[0])` chamado direto no render — anti-pattern React
- **Módulo/arquivo:** `src/app/(dashboard)/chat/page.tsx:32-34`
- **Categoria:** bug-funcional
- **O que acontece:** ```if (!currentRoom && rooms.length > 0) { setCurrentRoom(rooms[0]) }```. Isso roda no body do componente, fora de useEffect. Causa loop de re-render no mount e warning de "Cannot update during render" em strict mode.
- **Por que importa:** comportamento errático no React 18+ strict mode, possível loop infinito.
- **Sugestão de fix:** envolver em `useEffect(() => { if (!currentRoom && rooms.length > 0) setCurrentRoom(rooms[0]) }, [rooms, currentRoom])`.
- **Esforço estimado:** S

### [P1] Chat usa `h-[calc(100vh-64px)]` e `bg-black` fixo, ignorando theme tokens
- **Módulo/arquivo:** `src/app/(dashboard)/chat/page.tsx:80`
- **Categoria:** bug-visual / dark-mode
- **O que acontece:** Página Chat é toda `bg-black text-white` hardcoded. Quebra completamente fora do dark mode. Mesmo no dark, é mais escuro do que o resto do app (que usa `bg-background` = zinc-900).
- **Por que importa:** dissonância visual com resto do app. Sem suporte a light.
- **Sugestão de fix:** trocar por `bg-background text-foreground`. Se quiser dark-only no chat, manter mas usar `bg-card` ou `bg-popover` (tokens) para variar tonalidade.
- **Esforço estimado:** S

### [P1] Mobile: overlay do ChatList persiste mesmo quando lista está visível
- **Módulo/arquivo:** `src/app/(dashboard)/chat/page.tsx:101-106`
- **Categoria:** bug-mobile
- **O que acontece:** O overlay `{showChatList && (<div className="fixed inset-0 bg-black/50 lg:hidden z-30" />)}` é renderizado quando `showChatList === true`. Mas em desktop quando a lista está visível, esse overlay não bloqueia (hidden lg). Em mobile, ele bloqueia clique no chat ativo do lado direito.
- **Por que importa:** mobile: clica no overlay para fechar a lista, mas se a lista já estava aberta de propósito (default true), há sobreposição confusa.
- **Sugestão de fix:** invertendo lógica: overlay só aparece quando lista está aberta + viewport mobile + usuário tem um currentRoom selecionado (não na primeira vez).
- **Esforço estimado:** S

### [P2] TicketDetailModal e ChatRoomPremium hardcoded "Usuário" — não buscam nome real
- **Módulo/arquivo:** `src/components/tickets/TicketDetailModal.tsx:222-225, 279, 286`
- **Categoria:** bug-funcional
- **O que acontece:** TicketDetailModal tem `<p>Usuário</p>` literal em vez do nome do requester ou commentador. Comentário linha 222: `{/* TODO: Implementar cache de usuários */}`.
- **Por que importa:** Em telas críticas (modal de ticket), usuário vê "Usuário" em vez do nome. Comentários todos atribuídos a "Usuário" sem distinção visual.
- **Sugestão de fix:** criar `useUserCache()` hook que mantém Map<userId, User> compartilhado, ou usar React Query/SWR pra cache. Já existe `useUsers()` que poderia ser usado.
- **Esforço estimado:** M

### [P2] Avatar inicial no UserMenu usa `user.name.charAt(0)` fragil, sem trim
- **Módulo/arquivo:** `src/components/layout/UserMenu.tsx:22-25`
- **Categoria:** bug-visual
- **O que acontece:** `initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase()`. Se nome tem espaços duplos ou está vazio, `n[0]` retorna `undefined` e a string fica `"UU"` ou vazia.
- **Por que importa:** edge case visual em users com nome mal cadastrado.
- **Sugestão de fix:** `user.name?.trim().split(/\s+/).filter(Boolean).map(n => n[0]).slice(0,2).join('').toUpperCase() || '?'`.
- **Esforço estimado:** S

### Drive

### [P1] DrivePage tem `h-[calc(100vh-80px)]` mas TopNavigation tem h-16 (64px)
- **Módulo/arquivo:** `src/app/(dashboard)/drive/page.tsx:252`
- **Categoria:** bug-visual
- **O que acontece:** Drive calcula altura com -80px mas o header efetivo é 64px (`h-16`) + padding do DashboardShell. Sobra um buraco branco no fim ou conteúdo é cortado.
- **Por que importa:** layout quebra em viewports comuns.
- **Sugestão de fix:** padronizar offset (`h-[calc(100vh-64px)]`) ou criar variável CSS `--header-height`.
- **Esforço estimado:** S

### [P1] Sidebar do Drive `hidden lg:flex w-64` — em tablet (768-1024px) some sem alternativa
- **Módulo/arquivo:** `src/app/(dashboard)/drive/page.tsx:255`
- **Categoria:** bug-mobile
- **O que acontece:** A árvore de pastas (FolderTree) só aparece em ≥1024px. Entre 768-1023px (iPad portrait), não há botão de menu, não há breadcrumbs equivalentes — usuário fica sem navegação hierárquica.
- **Por que importa:** Tablets ficam órfãos. CLAUDE.md cita iPad Mini portrait (768px) como breakpoint obrigatório de teste.
- **Sugestão de fix:** adicionar Sheet/Drawer com FolderTree pra md-lg. Ou mostrar FolderTree em md também.
- **Esforço estimado:** M

### [P1] Comentário literal no JSX vazado como código entre props (drive/page.tsx:402-416)
- **Módulo/arquivo:** `src/app/(dashboard)/drive/page.tsx:402-416`
- **Categoria:** bug-funcional / cleanup
- **O que acontece:** Há 15 linhas de comentários `//` dentro do JSX (entre props do `<DriveGrid>`). É um TODO esquecido sobre filtragem de busca. JSX comments interpretados como children por engano.
- **Por que importa:** poluição extrema. Vide trecho: "Solução ideal: DriveGrid deve aceitar propriedade 'isFiltered'...". Bug provável em busca também — `displayItems` é passado mas o DriveGrid filtra de novo internamente.
- **Sugestão de fix:** mover decisão para a prop `disableFiltering` (que já existe) e remover comentários.
- **Esforço estimado:** S

### [P1] Download de arquivos apenas chama `toast.success` — não baixa nada
- **Módulo/arquivo:** `src/app/(dashboard)/drive/page.tsx:163-168`
- **Categoria:** bug-funcional
- **O que acontece:** ```const handleDownload = (itemId: string) => { const item = getItemById(itemId); if (item) { toast.success(`Download de "${item.name}" iniciado`) } }```. Não chama Supabase Storage `.download()` nem cria link.
- **Por que importa:** funcionalidade central de Drive não funciona.
- **Sugestão de fix:** usar `supabase.storage.from('drive-files').download(item.url)` e criar blob → `URL.createObjectURL`. Ou usar `getPublicUrl` + `<a download>`.
- **Esforço estimado:** S

### [P2] `setCurrentFolder: () => { }` retornado vazio do useDrive
- **Módulo/arquivo:** `src/hooks/useDrive.ts:583`
- **Categoria:** bug-funcional
- **O que acontece:** A função `setCurrentFolder` exposta no return é um no-op literal. Outros componentes podem chamar e nada acontece.
- **Por que importa:** API mentirosa. Devs assumem que funciona.
- **Sugestão de fix:** ou implementar (`(folder) => setCurrentFolderId(folder?.id ?? null)`) ou remover da interface.
- **Esforço estimado:** S

### [P2] Drive guarda `sharedWith: []` hardcoded ao mapear items (TODO)
- **Módulo/arquivo:** `src/hooks/useDrive.ts:96, 284, 346`
- **Categoria:** bug-funcional
- **O que acontece:** Comentário `// TODO: Implementar tabela de compartilhamento`. `getItemShares()` retorna sempre `[]`. Funções `shareItem`/`unshareItem` chamam `shared_access` mas a tabela não é lida no `fetchItems`.
- **Por que importa:** UI de compartilhamento (ShareModal) mostra usuários como já compartilhados, mas o estado nunca reflete realidade.
- **Sugestão de fix:** join na query inicial: `select(*, shared_access(*))` e mapear shares para o estado.
- **Esforço estimado:** M

### Tarefas

### [P0] `handleCreateTask` em tasks/page.tsx não aguarda promise — modal fecha cedo
- **Módulo/arquivo:** `src/app/(dashboard)/tasks/page.tsx:87-92`
- **Categoria:** bug-funcional
- **O que acontece:** ```const handleCreateTask = (taskData) => { createTask(taskData); setIsDialogOpen(false); setPreselectedStatus(undefined); }```. `createTask` é async mas não tem await. Se falhar (validação Zod, RLS), o erro é silencioso e modal fechou. Mesmo problema em `handleSaveTask` (linha 99-108).
- **Por que importa:** usuário cria task com dado inválido, modal fecha, task não aparece no kanban, sem feedback de erro. Quebra de fluxo crítico.
- **Sugestão de fix:** `async` + `try/catch` + `await createTask(...)`. Se falhar, manter modal aberto e exibir toast.error.
- **Esforço estimado:** S

### [P1] TaskDialog renderiza Button trigger por padrão — duplica botão se passar `isOpen` externo
- **Módulo/arquivo:** `src/components/tasks/TaskDialog.tsx:134-155`
- **Categoria:** bug-visual
- **O que acontece:** TaskDialog sempre renderiza um `<Button>` de trigger, mesmo se o parent controla `isOpen` externamente. Em `tasks/page.tsx:219-231`, o TaskDialog está dentro do header — botão "Nova Tarefa" aparece. Mas também em :299-309 onde TaskDialog é renderizado de novo para edição, o trigger aparece em segundo lugar (invisível mas presente no DOM).
- **Por que importa:** Duplicação no DOM, possíveis problemas de foco/tab. UX confusa se ambos os botões fossem visíveis.
- **Sugestão de fix:** `TaskDialog` precisa aceitar prop `hideTrigger` ou um modo "controlled-only" sem renderizar o button.
- **Esforço estimado:** S

### [P1] `handleDeleteTaskById` usa `confirm()` nativo do browser (List view)
- **Módulo/arquivo:** `src/app/(dashboard)/tasks/page.tsx:116-120`
- **Categoria:** bug-visual / a11y
- **O que acontece:** Browser nativo confirm. Quebra estética com o resto do app que tem DeleteTaskDialog premium. Inconsistente: Kanban tem dialog bonito, List view tem alert nativo.
- **Por que importa:** confirm() não é estilizável, não funciona offline, e foi citado várias vezes pelo CLAUDE.md como anti-padrão.
- **Sugestão de fix:** usar o mesmo DeleteTaskDialog. Buscar a task por id antes de chamar.
- **Esforço estimado:** S

### [P2] Página Tarefas tem `text-3xl` no h1 sem escala responsiva
- **Módulo/arquivo:** `src/app/(dashboard)/tasks/page.tsx:193`
- **Categoria:** bug-mobile
- **O que acontece:** `text-3xl font-extrabold` sem `md:text-4xl` ou `text-2xl md:text-3xl`. Em mobile pequeno (320px), título "Fluxo de Trabalho" + badge de filtro lado a lado quebra wrap.
- **Por que importa:** CLAUDE.md exige tipografia responsiva.
- **Sugestão de fix:** `text-2xl md:text-3xl`.
- **Esforço estimado:** S

### [P2] Header da página tarefas: `flex items-center justify-between` sem flex-col em mobile
- **Módulo/arquivo:** `src/app/(dashboard)/tasks/page.tsx:191`
- **Categoria:** bug-mobile
- **O que acontece:** O div com título + botões (Filtros + Nova Tarefa) é `flex items-center justify-between` sem flex-col. Em 320-375px, o botão "Nova Tarefa" min-w-[140px] força horizontal scroll ou aperta o título.
- **Por que importa:** edge case mobile real (iPhone SE).
- **Sugestão de fix:** `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`.
- **Esforço estimado:** S

### Tickets

### [P0] `assigned_to` removido visível na UI mas ainda usado em useTickets
- **Módulo/arquivo:** `src/hooks/useTasks.ts:333-334`, `useTickets.ts:431-434`
- **Categoria:** bug-funcional
- **O que acontece:** Ao criar task, `assigned_to: taskData.assignees?.[0]` (só primeiro). Mas o sync reverso de Ticket→Task em useTickets faz `taskUpdates.assigned_to = updates.assignedTo` — coluna `assigned_to` foi marcada como REMOVIDA num comentário em useTasks (linha 295 e 458) mas tickets/tasks ainda lêem/escrevem nela.
- **Por que importa:** writes silenciosos pra coluna potencialmente inexistente → erros 500 ou inconsistência.
- **Sugestão de fix:** revisar migrations e padronizar: ou só `task_assignees` (M2M) ou só `assigned_to` (1-to-1).
- **Esforço estimado:** M

### [P0] Página tickets renderiza `CreateTicketModal` que nunca abre (botão comentado)
- **Módulo/arquivo:** `src/app/(dashboard)/tickets/page.tsx:146-153, 229-233`
- **Categoria:** bug-funcional
- **O que acontece:** O botão "Novo Ticket" foi comentado fora (`{/* Botão removido: tickets são criados automaticamente via tasks */}`) mas o estado `isCreateModalOpen` e o `CreateTicketModal` continuam no JSX. Modal nunca abre. `handleCreateTicket` órfão.
- **Por que importa:** dead code + UX confusa: usuários sem permissão de Admin não conseguem criar ticket em lugar nenhum (não têm tasks). Bloqueia fluxo de solicitação para colaboradores.
- **Sugestão de fix:** decidir: ou trazer o botão de volta para roles Colaborador/Gerente criar tickets diretamente, ou remover CreateTicketModal e estado limpo.
- **Esforço estimado:** S

### [P1] `useTickets.addComment` não usa toast de erro / async não awaited em handler
- **Módulo/arquivo:** `src/app/(dashboard)/tickets/page.tsx:81-90`
- **Categoria:** bug-funcional
- **O que acontece:** `handleAddComment` chama `addComment({...})` sem await; depois imediatamente `toast.success('Comentário adicionado!')`. Se a inserção falhar (RLS, network), toast de sucesso mostra mesmo assim.
- **Por que importa:** false positive de feedback. Usuário acha que comentou, comentário não está lá.
- **Sugestão de fix:** `async/await` + try/catch ou `.then/.catch`.
- **Esforço estimado:** S

### [P1] handleDeleteComment usa `confirm()` nativo
- **Módulo/arquivo:** `src/app/(dashboard)/tickets/page.tsx:92-97`
- **Categoria:** bug-visual / a11y
- **O que acontece:** mesma situação de tarefas: `window.confirm()`. Inconsistente com o resto da UI.
- **Por que importa:** quebra design system.
- **Sugestão de fix:** AlertDialog do shadcn.
- **Esforço estimado:** S

### [P2] Sidebar de filtros do Tickets `lg:w-80` sem alternativa mobile (sem drawer)
- **Módulo/arquivo:** `src/app/(dashboard)/tickets/page.tsx:174-178`
- **Categoria:** bug-mobile
- **O que acontece:** Filtros ficam acima da lista em mobile (flex-col → flex-row em lg). Ok funcionalmente, mas filtros consomem ~30vh de altura antes do primeiro ticket aparecer. Sem accordion/collapse em mobile.
- **Por que importa:** mobile UX poderia ser melhorada com Sheet de filtros.
- **Sugestão de fix:** em mobile, esconder TicketFilters e adicionar botão "Filtros (3)" que abre Sheet, como o Tasks faz.
- **Esforço estimado:** M

### Agenda (Calendar)

### [P1] CalendarPage: criação de evento ignora `description` no formulário
- **Módulo/arquivo:** `src/app/(dashboard)/calendar/page.tsx:197`
- **Categoria:** bug-funcional
- **O que acontece:** `handleCreateEvent` chama `createEvent({ ..., description: '', ... })`. CreateEventModal não tem campo de descrição visível, e mesmo se tivesse, o handler descarta.
- **Por que importa:** Eventos perdem contexto. Não há onde anotar pauta ou link da chamada.
- **Sugestão de fix:** adicionar campo `description` no CreateEventModal e passar para o handler.
- **Esforço estimado:** S

### [P1] Console.log de debug deixado em produção
- **Módulo/arquivo:** `src/app/(dashboard)/calendar/page.tsx:181-188`
- **Categoria:** bug-funcional / cleanup
- **O que acontece:** `console.log('[CalendarPage] handleCreateEvent:', {...})` roda sempre, mesmo em prod. Mesma coisa em `useCalendar.ts:155-158` que ao menos tem dev guard.
- **Por que importa:** poluição de console, vazamento de dados em prod (date objects).
- **Sugestão de fix:** envolver em `if (process.env.NODE_ENV === 'development')`.
- **Esforço estimado:** S

### [P2] Filtro "Empresa" default `checked: false` esconde eventos importantes
- **Módulo/arquivo:** `src/app/(dashboard)/calendar/page.tsx:64`
- **Categoria:** gap-ux
- **O que acontece:** `{ id: 'company', name: 'Empresa', ..., checked: false }` — eventos da empresa são escondidos por padrão. Usuário precisa descobrir o checkbox.
- **Por que importa:** eventos da empresa são tipicamente os mais importantes (reunião geral, feriados). Esconder por default é ruim.
- **Sugestão de fix:** mudar pra `checked: true`.
- **Esforço estimado:** S

### [P2] `updateEvent` no useCalendar não usa `updated_at` (db_field não existe?)
- **Módulo/arquivo:** `src/hooks/useCalendar.ts:228`
- **Categoria:** bug-funcional
- **O que acontece:** Comentário "DB não tem updated_at, usando data atual". `updatedAt` no Tipo Event existe mas DB não suporta. Resto do app assume que tem.
- **Por que importa:** ordenação por última modificação não funciona; "editado em X" mostra agora.
- **Sugestão de fix:** adicionar coluna `updated_at` na migration de calendar_events com trigger.
- **Esforço estimado:** S (migration) + S (hook fix)

### Lançamentos

### [P2] Página Lançamentos não está protegida — todos os roles veem
- **Módulo/arquivo:** `src/app/(dashboard)/lancamentos/page.tsx` (toda)
- **Categoria:** gap-ux
- **O que acontece:** O middleware não bloqueia `/lancamentos` para nenhum role. Lançamentos podem ser sensíveis (estratégia comercial). Tarefas foi gated pra Admin, mas Lançamentos não.
- **Por que importa:** considerar se Colaborador precisa ter acesso completo ou só leitura. CLAUDE.md fala em "Admin / Gerente / Colaborador" com permissões distintas.
- **Sugestão de fix:** decidir política. Se Lançamentos é "Gerente+", adicionar guard no middleware.
- **Esforço estimado:** S (depende da decisão)

### [P2] Acentuação ausente em texto da UI ("Lancamentos", "Programado", "Lancado")
- **Módulo/arquivo:** `src/app/(dashboard)/lancamentos/page.tsx:26-29, 67-71, 89-92, 158-191`
- **Categoria:** bug-visual
- **O que acontece:** "Lancamentos" (em vez de "Lançamentos"), "Lancado", "Copia", "lancamento", "titulo", "excluido" — perdeu acentos em todo o módulo.
- **Por que importa:** unprofessional / PT-BR mal escrito. Resto do app está acentuado corretamente (Sidebar "Lançamentos" com cedilha).
- **Sugestão de fix:** find-and-replace dos termos com acentos certos. Confirmar encoding UTF-8.
- **Esforço estimado:** S

### Studio

### [P1] StudioPage usa `min-h-screen` ignorando layout do shell (escapa do header)
- **Módulo/arquivo:** `src/app/(dashboard)/studio/page.tsx:109-110`
- **Categoria:** bug-visual
- **O que acontece:** `<div className="min-h-screen bg-[radial-gradient(...)] from-zinc-900 via-black ...">`. `min-h-screen` é 100vh, mas o studio está dentro do main que já está abaixo do header de 64px — gera scroll extra.
- **Por que importa:** scroll quebrado, padding extra.
- **Sugestão de fix:** `min-h-[calc(100vh-64px)]` ou apenas `min-h-full`.
- **Esforço estimado:** S

### [P2] Studio usa `window.confirm()` para deletar booking
- **Módulo/arquivo:** `src/app/(dashboard)/studio/page.tsx:57-60`
- **Categoria:** bug-visual / a11y
- **O que acontece:** `if (window.confirm("Tem certeza que deseja excluir esta sessão permanentemente?")) {...}`.
- **Por que importa:** padrão ruim, inconsistente.
- **Sugestão de fix:** AlertDialog.
- **Esforço estimado:** S

### [P3] Studio é visualmente desconectado do resto do app (estética isolada)
- **Módulo/arquivo:** `src/app/(dashboard)/studio/page.tsx:122-145`
- **Categoria:** design-premium
- **O que acontece:** Studio usa "Vibe Studio Production Control Center", `text-4xl font-black uppercase italic`, badge `red-600` com glow neon, botões custom inline tailwind — não usa Button do shadcn. Visual maximamente diferente do resto do app que é coral/orange.
- **Por que importa:** dissonância. Pode ser intencional ("studio é uma persona à parte") ou pode ser histórico.
- **Sugestão de fix:** confirmar com usuário. Se intencional, isolar bem com namespace `studio-theme-*` em CSS. Se não, padronizar.
- **Esforço estimado:** L

### VibeCanvas (Capas)

### [P1] VibeCanvas salva projetos em localStorage, não em Supabase
- **Módulo/arquivo:** `src/lib/vibecanvas/storageService.ts` (import linha 8 de vibecanvas/page.tsx)
- **Categoria:** bug-funcional
- **O que acontece:** Funções `saveProject`, `updateProject` operam em localStorage. Projetos não sincronizam entre dispositivos, somem se usuário limpar storage do browser.
- **Por que importa:** trabalho criativo (briefings de capa) perdido. Multi-device quebra.
- **Sugestão de fix:** criar tabela `vibecanvas_projects` (user_id, config jsonb, briefing text) e migrar storage service.
- **Esforço estimado:** M

### [P1] VibeCanvas: setTimeout fake de 1500ms ao gerar briefing
- **Módulo/arquivo:** `src/app/(dashboard)/vibecanvas/page.tsx:75-95`
- **Categoria:** gap-ux
- **O que acontece:** `setTimeout(() => { ... briefing = generateBriefing(config) }, 1500)`. Geração é síncrona local (template), mas tem delay artificial só pra mostrar loading.
- **Por que importa:** desperdiça tempo do usuário. Se virar IA real (Gemini/etc), aí faz sentido.
- **Sugestão de fix:** remover setTimeout ou reduzir para 300ms (transição suave).
- **Esforço estimado:** S

### [P2] Background `fixed` no main pode causar bleed entre páginas
- **Módulo/arquivo:** `src/app/(dashboard)/vibecanvas/page.tsx:139`
- **Categoria:** bug-visual
- **O que acontece:** `<div className="absolute inset-0 bg-[radial-gradient(...)] ... fixed">`. A classe duplicada `absolute inset-0 ... fixed` é confusa — Tailwind aplica `fixed` (última). Esse background pode aparecer brevemente em rotas adjacentes durante navegação.
- **Por que importa:** glitch visual ao trocar de rota.
- **Sugestão de fix:** corrigir classes (`absolute` ou `fixed`, escolher uma) e considerar mover para layout.
- **Esforço estimado:** S

### Profile

### [P1] Página Profile com dados 100% fake e botões inertes
- **Módulo/arquivo:** `src/app/(dashboard)/profile/page.tsx:45-49, 109-114, 161-167`
- **Categoria:** gap-ux
- **O que acontece:** Stats "12 projetos / 148 tarefas / 94% eficiência" hardcoded. "Product Designer", "São Paulo, BR", "Desde Março 2024" hardcoded. Botão "Editar Perfil" e "Ver Atividades" sem handlers — clicam e nada acontece. Activity Feed com 3 entradas mock.
- **Por que importa:** Profile é página identidade do usuário. Mock óbvio reduz confiança.
- **Sugestão de fix:** ou esconder seções não implementadas, ou conectar com data real (job_title, location columns na tabela users; stats calculadas via useTasks/useTickets/etc).
- **Esforço estimado:** L

### [P2] Profile: edit button no avatar não faz nada
- **Módulo/arquivo:** `src/app/(dashboard)/profile/page.tsx:71-73`
- **Categoria:** gap-ux
- **O que acontece:** Botão de Edit3 (lápis) no canto do avatar sem onClick. Promete upload de foto mas não funciona.
- **Por que importa:** affordance enganosa.
- **Sugestão de fix:** ou conectar a um modal/file input ou remover.
- **Esforço estimado:** S (remover) / M (implementar upload)

### Settings

### [P1] Settings/Aparência tem palette picker que não persiste nada
- **Módulo/arquivo:** `src/app/(dashboard)/settings/page.tsx:186-204`
- **Categoria:** gap-ux
- **O que acontece:** 3 botões de cor (Coral/Azur/Esmeralda) com estilo "ativo" estático em Coral. Click não salva, e troca a cor não é refletida no app.
- **Por que importa:** affordance enganosa. CLAUDE.md tem `next-themes` mas sem cor branding.
- **Sugestão de fix:** ou implementar (CSS custom property) ou remover seção. Mesmo com only-dark, color scheme pode ser configurável.
- **Esforço estimado:** L (implementar) / S (remover)

### [P1] Settings/Conta: campos preenchidos com mock "Usuário Premium" / "contato@vibeoffice.com"
- **Módulo/arquivo:** `src/app/(dashboard)/settings/page.tsx:119-124`
- **Categoria:** bug-funcional
- **O que acontece:** Inputs `defaultValue="Usuário Premium"` e `defaultValue="contato@vibeoffice.com"` — não lê do `useAuth().user`. Botão "Salvar Alterações" sem onClick.
- **Por que importa:** usuário pensa que seu nome real é "Usuário Premium". Salva alterações que não salvam.
- **Sugestão de fix:** ler de `useAuth()`, formulário controlled, handler que dá update na tabela users.
- **Esforço estimado:** M

### Admin/Avisos

### [P2] Admin/Avisos roteamento via push direto sem usar middleware
- **Módulo/arquivo:** `src/app/(dashboard)/admin/avisos/page.tsx:43-46`
- **Categoria:** bug-funcional / security
- **O que acontece:** Comentário diz que removeram a checagem `if (user.role !== 'Admin' && user.role !== 'Gerente')`. Agora qualquer usuário acessa. Mas a página tem lógica `if (user?.role === 'Gerente')` para filtrar avisos. Colaborador chega na página intacta.
- **Por que importa:** UX: Colaborador vê interface de "Gerenciamento" sem poder gerenciar. Considerando que Tarefas e Cursos/Manage têm middleware guard, é incoerente que Avisos não tenha.
- **Sugestão de fix:** decidir política e refletir no middleware (Admin+Gerente).
- **Esforço estimado:** S

---

**Total: 38 achados. P0=6, P1=18, P2=12, P3=2.**
