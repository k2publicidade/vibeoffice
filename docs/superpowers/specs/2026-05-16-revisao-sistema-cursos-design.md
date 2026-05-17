# Revisão completa do sistema VIBEDISTRO + foco em Cursos — Spec do diagnóstico

**Data:** 2026-05-16
**Fase:** Diagnóstico (não há código sendo escrito nesta rodada)
**Próxima fase:** Após o usuário priorizar os achados, escrever plano de implementação dos fixes (via writing-plans).

## Objetivo

Produzir um **único relatório priorizado** enumerando bugs funcionais, gaps de UX e oportunidades de design premium em todo o sistema VIBEDISTRO Intranet/CRM, com foco extra no módulo Cursos — que precisa "funcionar perfeitamente".

O usuário usará o relatório pra marcar o que entra na próxima rodada de fixes.

## Escopo

**IN scope:**
- Todos os 7 módulos principais: Dashboard, Chat, Drive, Tarefas, Tickets, Cursos, Agenda
- Módulos secundários do dashboard: lancamentos, studio, vibecanvas, profile, settings, admin
- Camada global: layout (sidebar, header, mobile drawer), dark mode, modais comuns, tipografia, espaçamentos, contraste, microinterações, estados (loading, empty, error)
- Hooks de dados (`useCourses`, `useTasks`, etc.) — apenas em busca de bugs visíveis ao usuário (race conditions, dados que somem, optimistic update quebrado)
- Migrations recentes — apenas em busca de constraints/RLS que estejam quebrando UX

**OUT of scope:**
- Testes automatizados (criação)
- Performance profiling profundo (medições com DevTools) — apenas o que for óbvio por leitura
- Refatoração arquitetural ampla
- Segurança/RLS deep-audit (apenas o que afeta UX visível)
- Dependências/build/CI

## Método: 2 agentes em paralelo

### Agente A — Cursos deep-dive
**Tipo:** general-purpose
**Escopo do que ler:**
- `src/app/(dashboard)/courses/page.tsx` (catálogo aluno)
- `src/app/(dashboard)/courses/[id]/page.tsx` (página da aula/curso aluno)
- `src/app/(dashboard)/courses/manage/page.tsx` (gerenciar admin)
- `src/app/(dashboard)/courses/manage/[id]/page.tsx` (editor de curso admin)
- `src/components/courses/CreateCourseModal.tsx`
- `src/components/courses/LessonEditorModal.tsx`
- `src/hooks/useCourses.ts`
- `src/types/courses.ts`
- `docs/supabase-migrations/033_courses_premium_ux.sql` (e migrations anteriores de courses se existirem)

**Mandato:** mapear todo fluxo do módulo (criar curso → adicionar módulos/aulas → editor rich-text → publicar → aluno acessa → progresso). Listar tudo que está quebrado, faltando, ou que poderia ser melhor.

### Agente B — Auditoria sistêmica
**Tipo:** general-purpose
**Escopo do que ler:**
- Todas as outras páginas do dashboard (Dashboard, Chat, Drive, Tarefas, Tickets, Agenda, lancamentos, studio, vibecanvas, profile, settings, admin)
- Layout global: `src/app/(dashboard)/layout.tsx`, `src/components/layout/*` (Sidebar, MobileDrawer, TopNavigation, OnlineUsersSidebar)
- Modais e componentes compartilhados em `src/components/ui/*` apenas em busca de quebras visíveis no produto
- Hooks correspondentes (`useTasks`, `useTickets`, `useChat`, `useDrive`, `useCalendar`, `useAuth`, `usePresence`)

**Mandato:** auditar fluxos críticos de cada módulo (CRUD básico, vistas mobile, dark mode, estados vazios, modais grandes em telas pequenas). Listar bugs + gaps + oportunidades.

## Formato de output (obrigatório, vinculante pros dois agentes)

Cada agente devolve markdown com seções:

```
# Relatório do Agente <A|B>

## Resumo executivo
3-5 frases. Quão saudável tá a área? O que mais alarmou?

## Achados

Para cada achado, um bloco:

### [SEV] Título curto e específico do problema
- **Módulo/arquivo:** caminho:linha (quando aplicável)
- **Categoria:** bug-funcional | bug-visual | bug-mobile | gap-ux | a11y | design-premium
- **O que acontece:** descrição factual
- **Por que importa:** impacto pro usuário
- **Sugestão de fix:** 1-3 frases (não código completo)
- **Esforço estimado:** S (≤30min) | M (1-3h) | L (meio dia+) | XL (dia+)
```

### Escala de severidade

- **P0 — Bloqueante:** quebrado, dados perdidos, fluxo principal não completa, crash, segurança visível
- **P1 — Alto:** funciona mas com bug óbvio, mobile cortado em viewport comum, contraste reprovado, estado de erro sem feedback
- **P2 — Médio:** UX confusa, falta empty state, microinteração ausente, espaçamento errado, hierarquia visual ruim
- **P3 — Polish:** opinião de design premium, melhoria de "isso podia ser mais bonito/moderno"

### Regras de qualidade do report

1. **Achados específicos, não genéricos.** "Modal de criar curso não fecha após sucesso em mobile 375px" — não "modais têm problemas em mobile".
2. **Sempre cite arquivo:linha** quando o achado vem de código lido.
3. **Não duplicar** o mesmo achado em múltiplas seções.
4. **P3 (premium polish)** pode ser opinativo mas precisa ser **acionável** — "aumentar contraste do título de seção pra weight 600 e tamanho text-2xl" e não "deixar mais bonito".
5. **Limitar a 40 achados por agente** — se passar disso, agrupar similares e priorizar os de maior impacto.

## Síntese (o que eu, Claude, faço depois)

1. Mesclar reports A+B, dedupar achados que se sobrepõem (ex: "modal genérico cortado" pode aparecer nos dois).
2. Re-ordenar tudo por **Severidade primeiro, Esforço depois** (S antes de L dentro da mesma severidade).
3. Apresentar ao usuário como **checklist navegável** — ele marca o que entra na próxima rodada.
4. Identificar quick-wins (P1/P2 com esforço S) que valem fazer mesmo sem pergunta, se o usuário autorizar.

## Não-objetivos desta spec

- Não dispara os agentes ainda — só descreve o método.
- Não enumera achados — esse é o output dos agentes.
- Não decide ordem de fix — é decisão do usuário pós-relatório.
