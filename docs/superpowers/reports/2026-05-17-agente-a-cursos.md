# Relatório do Agente A — Cursos deep-dive

## Resumo executivo

O módulo Cursos tem um **bug P0 de violação das rules of hooks** no player do aluno (`courses/[id]/page.tsx`) que provoca crash sempre que o usuário alterna entre estado de loading e dados carregados — esse é o achado mais alarmante e bloqueia o fluxo principal. Junto disso, o catálogo do aluno **não filtra `is_published`**, então rascunhos vazam pra todos os colaboradores; o toggle de "Publicação" no editor portanto é cosmético na prática até essa filtragem entrar. A camada admin (CreateCourseModal/Editor/LessonEditorModal) está visualmente premium e funcional, mas tem **gaps sérios de UX**: rich-text editor usa `prompt()` nativo (UX horrenda em mobile), "Formatar com IA" é só regex local (claim falsa), e o CreateModuleModal ainda usa `Dialog` antigo sem o fix de altura aplicado recentemente nos outros modais. O player do aluno em mobile está semi-quebrado: sidebar de 320px aparece por cima do conteúdo sem botão visível pra fechar. Hooks têm race conditions toleráveis, RLS de Admin tá correta. No total, o módulo está em estado "funciona pra demo, falha em uso real" — uns 5-6 P0/P1 fechados levam ele pra "funciona perfeitamente".

## Achados

### [P0] React Hook chamado após early return causa crash no player de aulas
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:32-43`
- **Categoria:** bug-funcional
- **O que acontece:** O `useMemo` que calcula `currentLesson` (linha 36) é chamado DEPOIS dos early returns `if (loading) return <...>` (linha 32) e `if (!course) return <...>` (linha 33). Isso viola as rules of hooks do React. Quando `loading` vai de `true` pra `false` ou `course` aparece após fetch, o número de hooks chamados muda entre renders, disparando o erro "Rendered more hooks than during the previous render" e crashando a página.
- **Por que importa:** Bloqueia totalmente o fluxo do aluno em produção. Qualquer aluno que abrir uma aula vai cair em tela branca.
- **Sugestão de fix:** Mover os dois early returns pra DEPOIS de TODOS os `useMemo`/`useEffect`/`useState`. Ou renderizar condicional dentro do JSX em vez de retornar antes.
- **Esforço estimado:** S

### [P0] Catálogo do aluno mostra cursos não publicados (rascunhos)
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:33-36` + `src/hooks/useCourses.ts:18-76`
- **Categoria:** bug-funcional
- **O que acontece:** O `fetchCourses` em `useCourses` faz `select('*')` sem filtrar `is_published`, e a página `/courses` (catálogo do aluno) não filtra esse campo no `filteredCourses`. Resultado: cursos com `is_published=false` (rascunhos do admin) aparecem pra todos os colaboradores no catálogo.
- **Por que importa:** Toggle "Curso publicado" no editor admin é decorativo. Rascunhos com conteúdo incompleto/inadequado ficam visíveis. Admin não tem como esconder curso enquanto cria.
- **Sugestão de fix:** Adicionar filtro `is_published = true` no fetch quando o `user.role !== 'Admin'`, OU filtrar no client lado aluno (`courses.filter(c => c.is_published !== false)`). Idealmente no servidor pra não baixar dados desnecessários.
- **Esforço estimado:** S

### [P0] Player do aluno em mobile fica com sidebar sobreposta sem botão pra fechar
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:19, 170-232`
- **Categoria:** bug-mobile
- **O que acontece:** `sidebarOpen` inicia em `true` (linha 19) mas em mobile não existe nenhum botão visível que altere esse estado. A sidebar `<aside className="w-80 border-l ...">` em viewports < 768px aparece por cima do conteúdo principal (não é flex que empurra). Aluno fica com a lista de aulas tampando o player e sem como dispensar.
- **Por que importa:** Aula vira inacessível em mobile. Layout flex sem media query trata sidebar como sempre visível em telas pequenas.
- **Sugestão de fix:** Em mobile, sidebar deve ser drawer (Sheet) com botão de toggle no header. Iniciar `sidebarOpen=false` em < md e adicionar botão hambúrguer no top bar (`<header>` linha 103).
- **Esforço estimado:** M

### [P0] LessonEditorModal usa `prompt()` nativo do browser pra capturar URL de imagem e link
- **Módulo/arquivo:** `src/components/courses/LessonEditorModal.tsx:135, 208-211`
- **Categoria:** bug-funcional
- **O que acontece:** `handleInsertImage` (linha 135) e `handleAddLink` (linha 208) chamam `window.prompt()` pra capturar URL e nome. `prompt()` está deprecado/bloqueado em vários browsers (Safari iOS em PWAs, navegadores embarcados, alguns iframes) e UX é horrível.
- **Por que importa:** Admin tentando adicionar imagem inline ou link material pode achar que o botão "não funciona" se o browser bloquear o prompt. Mobile o prompt nativo é minúsculo e quebra fluxo. Quebra também em ambientes embedded.
- **Sugestão de fix:** Substituir por sub-modal/popover com `<Input>` e botões "Inserir / Cancelar". O projeto já tem `Input`, `Label` e `Button`. Padrão consistente com o resto da UI.
- **Esforço estimado:** M

### [P1] "Formatar com IA" não usa IA — é regex local com nome enganoso
- **Módulo/arquivo:** `src/components/courses/LessonEditorModal.tsx:143-178`
- **Categoria:** gap-ux
- **O que acontece:** O botão "Formatar com IA" (com ícone `Sparkles` e gradient roxo/fuchsia) executa apenas um regex local que faz strip de tags, detecta `##`/`###` como heading e `-`/`*` como lista. Não há chamada a LLM. O comentário no código admite isso (linha 142-143).
- **Por que importa:** Claim falsa pro admin. Pior: o strip de tags via `replace(/<[^>]+>/g, '\n')` quebra conteúdo HTML formatado anteriormente (perde negritos, parágrafos, etc.) sem aviso. Admin clica esperando melhoria, recebe degradação silenciosa.
- **Sugestão de fix:** Renomear pra "Formatar texto" / "Auto-formatar" (com ícone mais neutro como `Wand2` sem gradient premium). OU implementar chamada real a LLM (OpenAI/Anthropic). OU adicionar confirmação antes de rodar destruir formatação ("Isso vai reformatar o conteúdo. Continuar?").
- **Esforço estimado:** S (renomear) ou L (IA real)

### [P1] `dangerouslySetInnerHTML` sem sanitização no player e no preview do editor
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:86` e `src/components/courses/LessonEditorModal.tsx:358`
- **Categoria:** bug-funcional / a11y / seg-visível
- **O que acontece:** Conteúdo HTML da aula é renderizado via `dangerouslySetInnerHTML={{ __html: currentLesson.content || '' }}` sem sanitização. Se admin colar `<script>` (ou um vídeo ofuscado, ou um iframe malicioso copiado de site), executa no client de todos os alunos.
- **Por que importa:** Admin é confiável, mas RLS hoje deixa qualquer admin editar — basta um admin acidentalmente colar conteúdo malformado pra quebrar a página de aulas pra a empresa inteira. XSS via copy-paste é caso comum.
- **Sugestão de fix:** Usar `DOMPurify` (ou `isomorphic-dompurify`) pra sanitizar `content` antes de inserir no DOM. Whitelist de tags: `h2, h3, p, ul, ol, li, strong, em, a, img, blockquote`.
- **Esforço estimado:** S

### [P1] Parsing de YouTube URL no player quebra em formatos comuns
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:65-69`
- **Categoria:** bug-funcional
- **O que acontece:** O código faz `embedUrl.split('v=')[1] || embedUrl.split('/').pop()` pra extrair videoID. Isso quebra com:
  - URLs com timestamp: `?v=abc&t=10s` → videoID vira `abc&t=10s`
  - URLs encurtadas `youtu.be/abc?t=10` → pega `abc?t=10`
  - Shorts: `youtube.com/shorts/abc` → split('v=')[1] é undefined, cai no `.pop()` que pega `abc` ok, mas embed quebra (shorts não embedam)
  - Listas: `?list=...&v=abc` → ok mas perde a lista
  
  Compare com `LessonEditorModal.tsx:61-80` que tem parsing CORRETO usando `URL` e `searchParams`. O player tem versão pior.
- **Por que importa:** Admin testa URL no editor (preview funciona), publica, aluno vê iframe quebrado. Inconsistência entre preview admin e player real.
- **Sugestão de fix:** Reutilizar a função `videoEmbedUrl` do `LessonEditorModal` extraindo-a pra `src/lib/video.ts` e importando em ambos os lugares.
- **Esforço estimado:** S

### [P1] Estatística "Em Andamento" no catálogo do aluno conta cursos sem aulas
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:19-31` + `src/hooks/useCourses.ts:146-158`
- **Categoria:** bug-funcional
- **O que acontece:** `getProgressStats` retorna `percentage: 0` quando `total === 0`, então cursos sem aulas caem em "não iniciado". OK. Mas a contagem de `total` em `stats` (linha 20) inclui cursos rascunho/sem aulas. Combinado com o bug de rascunhos vazando, o número "Cursos Disponíveis" pra aluno é mentiroso.
- **Por que importa:** Card de stat "5 cursos disponíveis" inclui 3 rascunhos vazios. Quebra a credibilidade da seção.
- **Sugestão de fix:** Depois de filtrar `is_published`, ajustar o `stats` pra contar só publicados com `lessons_count > 0`.
- **Esforço estimado:** S

### [P1] CreateModuleModal não usa PremiumModal — está vulnerável ao bug de altura recente
- **Módulo/arquivo:** `src/components/courses/CreateModuleModal.tsx:39-41`
- **Categoria:** bug-mobile
- **O que acontece:** Usa `<Dialog>` shadcn original com `className="sm:max-w-md bg-zinc-950 ..."` sem `max-h`/scroll interno. O commit recente `0dd6731` aplicou esses fixes a outros modais mas não a esse. Em viewport baixo (iPhone SE, < 600px de altura) o modal pode estourar e botões de ação ficam invisíveis.
- **Por que importa:** Admin abrindo "Novo Módulo" em mobile pode não conseguir salvar.
- **Sugestão de fix:** Migrar pra `PremiumModal size="md"` igual fizeram com `CreateCourseModal` e `LessonEditorModal`, OU adicionar `max-h-[95vh] overflow-y-auto w-[95vw]` no DialogContent.
- **Esforço estimado:** S

### [P1] Hook `toggleLessonComplete` falha silenciosamente
- **Módulo/arquivo:** `src/hooks/useCourses.ts:117-144`
- **Categoria:** bug-funcional
- **O que acontece:** Optimistic update marca aula como concluída no state local. Se o INSERT no Supabase falhar (RLS, rede, etc.), o erro é só logado com `console.error` e `fetchUserProgress()` reverte o state. Mas o usuário **não vê toast de erro nenhum**. Olha pra UI, vê marcado, depois vê desmarcar, sem entender por quê.
- **Por que importa:** Aluno acha que progresso "some sozinho". Confusão e perda de confiança.
- **Sugestão de fix:** Adicionar `toast.error("Não consegui salvar seu progresso. Tente novamente.")` no catch.
- **Esforço estimado:** S

### [P1] Editor de curso não auto-atualiza slug quando o admin muda o título
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:74-108`
- **Categoria:** gap-ux
- **O que acontece:** O `CreateCourseModal` tem auto-slug a partir do título (com flag `slugManuallyEdited`). O editor `[id]/page.tsx` NÃO tem isso. Se admin renomeia o curso de "Marketing 101" pra "Marketing Avançado", o slug fica `marketing-101` perpetuamente. URL desatualizada.
- **Por que importa:** Inconsistência entre fluxo de criação e edição. SEO/UX de URL prejudicado.
- **Sugestão de fix:** Replicar a lógica de `slugManuallyEdited` no editor — quando o admin não tocou no slug manualmente, ele segue o título.
- **Esforço estimado:** S

### [P1] Player do aluno: lesson `type==='video'` sem `content_url` cai em fallback confuso
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:60-97`
- **Categoria:** gap-ux
- **O que acontece:** Quando admin cria aula sem URL de vídeo, o `type` salvo é `'html'` (LessonEditorModal:237 `hasVideo ? 'video' : 'html'`). Mas o fallback "Conteúdo em texto/arquivo. Visualize o material abaixo." (linha 91-97) é genérico e desconectado do `content` renderizado em outro lugar. E não há ramo pra aula com URL de vídeo inválida.
- **Por que importa:** Aluno vê dois blocos: ícone genérico "FileText" + o conteúdo HTML real embaixo (ou nada). Hierarquia confusa.
- **Sugestão de fix:** Mostrar fallback só quando NÃO houver `content` nem `content_url`. Se houver `content`, mostrar só o HTML renderizado (sem o card placeholder do FileText).
- **Esforço estimado:** S

### [P1] CourseCard mostra área vazia quando descrição do curso é nula
- **Módulo/arquivo:** `src/components/courses/CourseCard.tsx:74-76`
- **Categoria:** bug-visual
- **O que acontece:** Migration 033 tornou `description` opcional/nullable. CourseCard renderiza `{course.description}` direto sem fallback. Quando admin cria curso sem descrição (agora permitido), o card mostra apenas área cinza vazia onde deveria ter texto.
- **Por que importa:** Card visualmente quebrado. Hierarquia fica estranha com gap.
- **Sugestão de fix:** Usar `subtitle` como fallback: `{course.subtitle || course.description || 'Sem descrição.'}`. O subtitle é exatamente pra isso (limite 140 chars).
- **Esforço estimado:** S

### [P1] Navegação Anterior/Próxima aula ausente no player ativo
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:139-166`
- **Categoria:** gap-ux
- **O que acontece:** O player no `[id]/page.tsx` (que está sendo usado) só tem botão "Marcar como Concluída". Não há botão "Próxima aula" nem "Anterior". O componente `LessonPlayer.tsx` (não usado, código morto) tinha esses botões.
- **Por que importa:** UX padrão de plataforma de cursos. Aluno completa aula, espera ir pra próxima — em vez disso precisa abrir sidebar e clicar manualmente. Em mobile (sidebar quebrada) fica impraticável.
- **Sugestão de fix:** Adicionar botões "Anterior" / "Próxima" no painel de ações. Ao clicar em "Marcar como concluída", auto-avançar pra próxima aula. Lógica: aplainar todas as `lessons` de todos os módulos em ordem e indexar.
- **Esforço estimado:** M

### [P1] Componente `LessonPlayer.tsx` é código morto
- **Módulo/arquivo:** `src/components/courses/LessonPlayer.tsx` (arquivo todo)
- **Categoria:** bug-funcional / manutenção
- **O que acontece:** Arquivo de 165 linhas implementando um player completo (com navegação prev/next, sidebar de aulas, marcação) que **não é importado em lugar nenhum**. O `courses/[id]/page.tsx` reimplementou tudo do zero, ignorando este componente.
- **Por que importa:** Confunde desenvolvedores. Drift entre dois "players" gera bugs como o de URL parsing (achado anterior). Tamanho do bundle desnecessariamente maior.
- **Sugestão de fix:** Ou refatorar `[id]/page.tsx` pra usar `LessonPlayer` (e adicionar features faltantes lá), ou deletar `LessonPlayer.tsx`.
- **Esforço estimado:** S (deletar) ou M (refatorar)

### [P1] `updateLesson` envia payload inteiro do lesson, incluindo campos legados
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:200-202` + `src/components/courses/LessonEditorModal.tsx:233-241`
- **Categoria:** bug-funcional
- **O que acontece:** No `handleSaveLesson` quando é edit, faz `updateLesson(lessonData.id, lessonData)`. O `lessonData` vindo do `LessonEditorModal.handleSubmit` inclui o `id` (linha 234) — passar `id` no UPDATE pode ser ignorado pelo Supabase, mas se a tabela tiver gatilho/check em ID, falha. Mais grave: se o `lesson` original tinha campo `description` ou outro setado, o modal não inclui no save (só `title`, `chapter`, `type`, `content_url`, `content`, `materials`) — esses campos não são atualizados (OK), mas se algum schema adicionar coluna com NOT NULL DEFAULT, vai vazar.
- **Por que importa:** Bug latente. Hoje funciona, mas ao adicionar coluna nova em `lessons` (ex: `is_preview`), update silenciosamente pode quebrar ou perder estado.
- **Sugestão de fix:** No `handleSaveLesson` separar payload de update: `const { id, ...updatePayload } = lessonData; await updateLesson(id, updatePayload)`. E whitelist explícita dos campos atualizáveis.
- **Esforço estimado:** S

### [P1] Stats de Admin: filtragem usa `is_published !== false` mas course pode não ter o campo
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/page.tsx:61-66, 85-87, 290, 358`
- **Categoria:** bug-funcional
- **O que acontece:** O check é `c.is_published !== false`, ou seja, cursos com `is_published: undefined` (legacy antes de 033) caem como "publicado". A migration 033 backfill com DEFAULT TRUE então deveria ser ok, mas o useCourses não força esse campo no map. Se o select falhar em buscar a coluna, todos viram publicado por acidente.
- **Por que importa:** Borderline. Em prática funciona, mas é frágil.
- **Sugestão de fix:** Normalizar `is_published` no `useCourses.fetchCourses` map: `is_published: course.is_published ?? true`.
- **Esforço estimado:** S

### [P1] Filtro de autor no admin ignora autores nulos
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/page.tsx:69-93`
- **Categoria:** gap-ux
- **O que acontece:** Filtro de autor lista só `c.instructor` truthy. Cursos sem instrutor (agora possível) ficam sem opção de filtro. Quando admin seleciona "Todos os Autores" + sem busca, mostra tudo OK. Mas não há "Sem instrutor" como opção. Além disso, filtra por `c.instructor === authorFilter` que é string-match exato — case sensitive.
- **Por que importa:** Cursos sem autor invisíveis ao filtro. Inconsistências de case (Maria vs maria) fragmentam o select.
- **Sugestão de fix:** Adicionar opção "(Sem instrutor)" no select que filtra `!c.instructor`. Normalizar case na comparação.
- **Esforço estimado:** S

### [P2] Editor de curso: trocar de tab descarta alterações não salvas sem aviso
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:260-271`
- **Categoria:** gap-ux
- **O que acontece:** Admin edita campos na tab "Informações" (Título, Subtítulo, etc.), troca pra "Conteúdo" sem clicar em "Salvar Alterações", volta pra "Informações" — o `useEffect` (linha 94) que setea `formData` a partir de `course` só dispara quando `course` muda, então os campos editados persistem no state local **mas não foram salvos no DB**. Pior: o switch "Curso publicado" na tab "Publicação" também só persiste ao Salvar — admin pode "publicar" achando que salvou.
- **Por que importa:** Perda silenciosa de alterações. Especialmente perigoso no toggle de publicação.
- **Sugestão de fix:** Detectar "dirty state" (comparar `formData` com `course`). Mostrar badge "Não salvo" no cabeçalho da tab. Bloquear/avisar ao trocar de tab. Idealmente, autosave por debounce de 1s.
- **Esforço estimado:** M

### [P2] Header do catálogo `Vibe Academy` não escala em mobile e é text-4xl fixo
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:68-74`
- **Categoria:** bug-mobile
- **O que acontece:** `text-4xl font-black tracking-tight uppercase italic` sem breakpoints. Em iPhone SE (375px), "Vibe Academy" ocupa metade da altura do header e pode quebrar linha de forma feia ("VIBE / ACADEMY"). Padrão CLAUDE.md pede tipografia responsiva.
- **Por que importa:** Primeira impressão da página principal de alunos em mobile fica capenga.
- **Sugestão de fix:** `text-2xl md:text-3xl lg:text-4xl`.
- **Esforço estimado:** S

### [P2] Catálogo do aluno: thumb h-48 fixa em todos breakpoints quebra ratio
- **Módulo/arquivo:** `src/components/courses/CourseCard.tsx:33`
- **Categoria:** bug-visual / bug-mobile
- **O que acontece:** Thumbnail tem `h-48` (192px) fixo. Em mobile o card é largura total (~343px no iPhone SE), gerando ratio ~1.79:1. Em xl o card é ~360px de largura, gerando ratio ~1.87:1. Mas o admin sobe imagem recomendada como 500x300 (5:3 ≈ 1.67:1). Há crop de cima/baixo em alguns viewports e estiramento em outros.
- **Por que importa:** Capas dos cursos ficam cortadas em desktop / esticadas em mobile. Inconsistência visual no grid.
- **Sugestão de fix:** Trocar `h-48` por `aspect-[5/3]` no container da thumb. Consistente com o preview no admin (linha 358).
- **Esforço estimado:** S

### [P2] Container do catálogo viola padrão `p-4 sm:p-6 lg:p-8` do CLAUDE.md
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:59`
- **Categoria:** bug-mobile
- **O que acontece:** `p-6 md:p-8` pula o breakpoint `sm:` e força 24px em mobile pequeno (iPhone SE), onde 16px é recomendado. Comparar com `manage/page.tsx:132` que faz `px-4 sm:px-6 lg:px-8` corretamente.
- **Por que importa:** Catálogo fica mais apertado lateralmente em mobile pequeno.
- **Sugestão de fix:** Trocar pra `p-4 sm:p-6 lg:p-8`.
- **Esforço estimado:** S

### [P2] Gaps fixos no catálogo e nos stats violam padrão de gap responsivo
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:114, 174`
- **Categoria:** bug-mobile
- **O que acontece:** `grid gap-6 grid-cols-1 sm:grid-cols-3` (stats) e `grid gap-8 md:grid-cols-2 ...` (cursos). Gap fixo. CLAUDE.md exige `gap-3 md:gap-4 lg:gap-6` ou similar.
- **Por que importa:** Em mobile, 24-32px de gap entre stats consome muita altura útil de viewport baixo.
- **Sugestão de fix:** `gap-3 md:gap-4 lg:gap-6` nos stats. `gap-4 md:gap-6 lg:gap-8` nos cursos.
- **Esforço estimado:** S

### [P2] Sidebar do player tem 320px fixos sem ajuste responsivo
- **Módulo/arquivo:** `src/app/(dashboard)/courses/[id]/page.tsx:171-174`
- **Categoria:** design-premium / bug-mobile
- **O que acontece:** `w-80` (320px) em desktop ocupa muito do viewport em tablet (em 1024px, é quase 1/3 da tela). Não escala (deveria ser `w-72 xl:w-80` ou similar).
- **Por que importa:** Em iPad/tablet horizontal o video player perde área valiosa.
- **Sugestão de fix:** `lg:w-72 xl:w-80` + permitir colapsar via botão (que precisa existir, ver achado anterior).
- **Esforço estimado:** S

### [P2] Botões de ação no manage/desktop sem altura mínima 44px
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/page.tsx:296-315`
- **Categoria:** a11y / bug-mobile
- **O que acontece:** Botões "Editar" e "Excluir" no desktop usam `size="sm" h-9` = 36px. CLAUDE.md exige mínimo 44px pra touch targets. Em tablet com touch ainda usa-se a versão desktop.
- **Por que importa:** Em iPad touchscreen, alvos ficam abaixo do limite acessível.
- **Sugestão de fix:** `h-10` no mínimo (40px) ou `h-11` (44px) com text smaller.
- **Esforço estimado:** S

### [P2] ModuleList usa `Accordion type="single"` por módulo — só um por vez aberto
- **Módulo/arquivo:** `src/components/courses/ModuleList.tsx:29-30`
- **Categoria:** gap-ux
- **O que acontece:** Cada módulo renderiza seu próprio `Accordion type="single" collapsible`, o que significa que cada módulo pode ser aberto/fechado independentemente — mas dentro de cada accordion só há um item. Resultado funciona, mas é arquitetura estranha. Pior: admin não pode "expandir tudo" pra ver todo conteúdo.
- **Por que importa:** Curso com 10 módulos exige 10 cliques pra ver tudo. UX de gerenciar é tediosa.
- **Sugestão de fix:** Usar UM `Accordion type="multiple"` envolvendo todos os módulos, com cada `<AccordionItem value={module.id}>`. Adicionar botão "Expandir tudo / Recolher tudo".
- **Esforço estimado:** S

### [P2] Drag-handle (`GripVertical`) no ModuleList é decorativo — não tem drag
- **Módulo/arquivo:** `src/components/courses/ModuleList.tsx:32`
- **Categoria:** gap-ux
- **O que acontece:** Ícone `<GripVertical>` com `cursor-grab` sugere drag & drop pra reordenar módulos. Mas não há listener nem implementação. Cursor cosmético.
- **Por que importa:** Falsa affordance. Admin tenta arrastar, nada acontece. Frustração. Ordem de módulos hoje é controlada por `order` no insert (sequencial), sem UI pra reordenar.
- **Sugestão de fix:** OU implementar drag real (já há `@dnd-kit` no projeto pelo kanban de tasks), OU remover o ícone e o `cursor-grab`.
- **Esforço estimado:** S (remover) ou L (implementar)

### [P2] Falta indicador de quantos materiais a aula tem na lista do editor
- **Módulo/arquivo:** `src/components/courses/ModuleList.tsx:63-89`
- **Categoria:** gap-ux
- **O que acontece:** Cada lesson na lista mostra ícone (video/file) + título. Não mostra: duração, tipo de conteúdo (vídeo/texto/quiz), quantos materiais de apoio, se tem URL externa. Admin com 50 aulas não tem visão de quais precisam revisão.
- **Por que importa:** Visão geral do curso é pobre. Admin precisa abrir cada aula pra ver o que tem dentro.
- **Sugestão de fix:** Adicionar metadados inline: badge com duração, contagem de materiais (`{lesson.materials?.length || 0} materiais`), badge "sem vídeo" se faltar URL.
- **Esforço estimado:** S

### [P2] Editor: preview do conteúdo HTML não combina com o player real
- **Módulo/arquivo:** `src/components/courses/LessonEditorModal.tsx:356-359` vs `src/app/(dashboard)/courses/[id]/page.tsx:84-89`
- **Categoria:** gap-ux
- **O que acontece:** Preview no editor usa `prose prose-invert prose-sm` com classes específicas customizadas. O player real usa `prose prose-invert` (sem `prose-sm`) com padding diferente. Resultado: o que admin vê no preview NÃO é o que aluno vê no player.
- **Por que importa:** WYSIWYG mentiroso. Admin pode aprovar um layout que aparece com tipografia maior/diferente no player.
- **Sugestão de fix:** Extrair classe `lesson-content` única e usar tanto no preview quanto no render do player. Sincronizar prose modifiers.
- **Esforço estimado:** S

### [P2] Tipografia/identidade visual divergem entre catálogo (aluno) e admin
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:68` vs `src/app/(dashboard)/courses/manage/page.tsx:147`
- **Categoria:** design-premium
- **O que acontece:** Aluno tem header premium (`text-4xl font-black uppercase italic` com red accent). Admin tem `text-2xl md:text-3xl font-bold tracking-tight` — completamente vanilla Shadcn. Sensação de "duas plataformas diferentes".
- **Por que importa:** Quebra de identidade. Admin parece "abandonado" comparado ao aluno. Marca "Vibe Academy" some quando admin entra.
- **Sugestão de fix:** Aplicar mesma vibe italic uppercase no admin: `Gerenciar Cursos` com "Cursos" em vermelho italic, ou ao menos manter o eyebrow "VIBE ACADEMY • ADMIN". Não precisa ser igual mas precisa pertencer à mesma família.
- **Esforço estimado:** M

### [P2] Switch de "is_published" no editor não dá feedback que alterações pendem save
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:504-507`
- **Categoria:** gap-ux
- **O que acontece:** Admin toca no switch "Curso publicado" — visual muda imediato (Switch optimistic). Sem feedback que isso só persiste ao clicar em "Salvar". Admin pode achar que basta o switch.
- **Por que importa:** Curso permanece como estava no DB. Admin pensa que publicou, alunos não veem.
- **Sugestão de fix:** Auto-save o switch on-change (chamar `updateCourse(id, { is_published: v })` direto), OU mostrar badge "Pendente" ao lado quando dirty.
- **Esforço estimado:** S

### [P2] Quando reseta `coverMode` no CreateCourseModal, perde `coverMode='ai'` selecionado
- **Módulo/arquivo:** `src/components/courses/CreateCourseModal.tsx:80, 232-255`
- **Categoria:** gap-ux
- **O que acontece:** A tab "IA (em breve)" tem `disabled` no botão mas é clicável visualmente — o `onClick` ainda dispara `setCoverMode('ai')`. Verificando: o `disabled` no `<button>` HTML bloqueia click nativamente. OK, mas se o user passar `Tab+Enter`, pode disparar. E se chegar lá, a textarea fica disabled, sem rota de saída clara (precisa clicar em outra tab).
- **Por que importa:** Tab dead-end. Confuso pra admin que esperava algo acontecer.
- **Sugestão de fix:** Adicionar mensagem clara "Funcionalidade em desenvolvimento — escolha Upload ou URL" e botão "Voltar pra Upload" dentro do painel ai.
- **Esforço estimado:** S

### [P2] Stats no manage/page.tsx pulam de 1 coluna pra 3 em 640px
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/page.tsx:167`
- **Categoria:** bug-mobile
- **O que acontece:** `grid-cols-1 sm:grid-cols-3` — em iPhone landscape (~667px) e tablets pequenos, três cards ficam comprimidos lado a lado. Padrão geralmente é `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **Por que importa:** Cards de stat ficam apertados em ~640-768px.
- **Sugestão de fix:** Considerar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` ou manter mas reduzir padding interno em sm.
- **Esforço estimado:** S

### [P2] `fetchCourses` faz select * de modules e lessons sem filtro por course_id
- **Módulo/arquivo:** `src/hooks/useCourses.ts:34-49`
- **Categoria:** bug-funcional / performance
- **O que acontece:** Busca TODAS as modules e TODAS as lessons do banco, depois filtra em memória pelo `course_id`. Pra 50 cursos com 10 módulos/10 aulas cada são 5500 rows baixados, com RLS aberta de leitura.
- **Por que importa:** Performance ruim quando o catálogo crescer. RLS de read pra qualquer authenticated significa todos baixam tudo de tudo.
- **Sugestão de fix:** Usar join nested do supabase: `supabase.from('courses').select('*, modules(*, lessons(*))')`. Single query, server-side join. Ou ao menos limitar lessons/modules ao subset de cursos visíveis.
- **Esforço estimado:** M

### [P2] Migration 023 não cria coluna `updated_at` em `lessons` e `modules`, sem trigger
- **Módulo/arquivo:** `docs/supabase-migrations/023_courses_module.sql:15-37`
- **Categoria:** bug-funcional
- **O que acontece:** `modules` e `lessons` só têm `created_at`. Atualização não muda timestamp. Não há como ordenar "aulas recentemente editadas" ou auditar quando admin mudou conteúdo.
- **Por que importa:** Sem registro de modificação. Difícil debug e auditoria.
- **Sugestão de fix:** Migration adicional adicionando `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` + trigger `BEFORE UPDATE` análogo ao da migration 033 pra courses.
- **Esforço estimado:** S

### [P2] Editor: input "Duração estimada" aceita números negativos e decimais
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:439-444`
- **Categoria:** bug-funcional
- **O que acontece:** `<Input type="number" />` sem `min="0"`, sem `step="1"`. Admin pode salvar `-30` minutos ou `15.5` (parseInt arredonda mas a UI permite). CourseCard mostra `Math.round(course.duration / 60)h ${course.duration % 60}m` — duração negativa gera "0h -30m".
- **Por que importa:** UI permite dados inválidos. Card do aluno mostra valores absurdos.
- **Sugestão de fix:** `min="0" max="100000" step="1"`. Validar no salvar.
- **Esforço estimado:** S

### [P2] Editor de curso: confirm() nativo pra deletar módulo/aula é UX ultrapassada
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:185, 220` e `manage/page.tsx:107`
- **Categoria:** gap-ux
- **O que acontece:** `confirm("Excluir módulo e todas as aulas?")` nativo do browser. Inconsistente com o resto da UI (premium dark mode). Em mobile o confirm é minúsculo.
- **Por que importa:** UX inconsistente, perde branding nos momentos críticos (deleção).
- **Sugestão de fix:** Usar `AlertDialog` do shadcn já presente no projeto. Mostrar quantas aulas serão perdidas no confirm de módulo ("Isso vai excluir 7 aulas. Tem certeza?").
- **Esforço estimado:** M

### [P3] CourseCard hover scale + translateY pode causar layout shift em grids densas
- **Módulo/arquivo:** `src/components/courses/CourseCard.tsx:28`
- **Categoria:** design-premium
- **O que acontece:** `whileHover={{ y: -5, scale: 1.01 }}` no card faz ele "saltar". Em grid de 4 colunas (xl:grid-cols-4) com gap de 8, pode encostar nos vizinhos e parecer instável.
- **Por que importa:** Polish — sensação de "playful demo" em vez de "ferramenta corporativa séria".
- **Sugestão de fix:** Reduzir pra `y: -2, scale: 1.005` OU substituir por shadow drop + border highlight (`hover:shadow-2xl hover:border-white/15 hover:ring-2 hover:ring-red-500/20`).
- **Esforço estimado:** S

### [P3] "Vibe Academy" hard-coded com `<span className="text-red-600">` em vez de design token
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:69`
- **Categoria:** design-premium
- **O que acontece:** Cor de marca espalhada pelo módulo (red-500/red-600/red-400 misturados). Não há `--brand-primary`. Mudar a marca demanda find/replace.
- **Por que importa:** Manutenção. Decisão de design tem que poder ser ajustada sem caçar magic numbers.
- **Sugestão de fix:** Definir tokens em `globals.css`: `--brand: theme(colors.red.600); --brand-hover: theme(colors.red.500)`. Usar `text-brand` no Tailwind config.
- **Esforço estimado:** M

### [P3] Stats no catálogo do aluno têm ícones gigantes opacity-5 de fundo
- **Módulo/arquivo:** `src/app/(dashboard)/courses/page.tsx:117-162`
- **Categoria:** design-premium
- **O que acontece:** Cada stat card tem `<GraduationCap size={80}>` no canto direito com `opacity-5 group-hover:opacity-10`. Padrão tipo "Datasaur dashboard". Ok mas é tendência genérica de IA-design — todos os SaaS fazem isso desde 2024.
- **Por que importa:** Estética datada/template. Não diferencia.
- **Sugestão de fix:** Substituir por número grande estilizado (eg., `87%` em `text-7xl font-black opacity-10`) OU por padrão geométrico abstrato sutil. Algo menos clichê.
- **Esforço estimado:** S

### [P3] Editor: tabs sem badge de "incompleto/preencher"
- **Módulo/arquivo:** `src/app/(dashboard)/courses/manage/[id]/page.tsx:260-271`
- **Categoria:** gap-ux / design-premium
- **O que acontece:** Tabs "Informações / Conteúdo / Publicação" sem indicadores de progresso. Admin não sabe se "Informações" tem campos vazios obrigatórios sem clicar.
- **Por que importa:** Discoverability ruim. Admin pode publicar curso sem subtítulo, por ex.
- **Sugestão de fix:** Adicionar bullet/badge em cada tab (`Informações ⚠️` se faltar campo, `Conteúdo (0 aulas)` se vazio, `Publicação ✓` se ok). Ajuda admin a saber onde focar.
- **Esforço estimado:** M

## Total: 41 achados (1 acima do limite — mantive porque vários P2 são quick-wins S)

P0: 4 — P1: 14 — P2: 19 — P3: 4
