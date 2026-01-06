# Plano de Redesign UI/UX - VIBEDISTRO Intranet

## Visão Geral

Implementação de novo design visual baseado nas imagens de referência, transformando a identidade visual do sistema de Roxo/Rosa para Preto/Azul/Laranja com layout mais moderno e clean.

---

## 1. Mudanças na Paleta de Cores

### Cores Atuais → Novas Cores

| Elemento | Atual | Novo |
|----------|-------|------|
| Primary | `#7C3AED` (Roxo) | `#ef5907` (Laranja) |
| Secondary | `#F11F7A` (Rosa) | `#0c67ff` (Azul) |
| Background escuro | `#0F172A` | `#000000` (Preto puro) |
| Background claro | `#FFFFFF` | `#f2f3f4` (Cinza claro) |
| Texto escuro | `#111827` | `#000000` |

### Arquivos a Modificar
- `src/app/globals.css` - Variáveis CSS principais
- `tailwind.config.ts` - Cores customizadas vibe-*

---

## 2. Mudança de Layout Principal

### De: Sidebar Lateral
```
┌─────────┬────────────────────────┐
│ SIDEBAR │  HEADER               │
│         ├────────────────────────┤
│ (fixa)  │  CONTENT              │
│         │                        │
└─────────┴────────────────────────┘
```

### Para: Navegação Horizontal
```
┌─────────────────────────────────────┐
│ LOGO │ NAV HORIZONTAL │ USER MENU  │
├─────────────────────────────────────┤
│           CONTENT                   │
│         (full width)                │
└─────────────────────────────────────┘
```

### Componentes a Criar/Modificar
1. **TopNavigation.tsx** (NOVO) - Navegação horizontal
2. **Header.tsx** - Refatorar completamente
3. **DashboardShell.tsx** - Remover sidebar, usar nav horizontal
4. **Sidebar.tsx** - Manter apenas para mobile (drawer)

---

## 3. Novo Design do Dashboard

### Estrutura Visual (baseada em layout.webp)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Dashboard  Events  My requests  Company news  Tasks │ [User]
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Good morning, [Nome] ☕           [New request] [Schedule] │
│                                                             │
├─────────────────────┬───────────────────────┬───────────────┤
│ ████████████████████│  Efficiency           │    32hr       │
│ Monthly retrospect. │  78%  [====]          │  [Donut]      │
│ In 19 min, 10:00 AM │  Hours  Activity Proj │               │
│ [👤👤] [Join now →] │  32/40  58%     3     │               │
├─────────────────────┼───────────────────────┼───────────────┤
│ Upcoming events     │  Requests [Processing]│ [News Card]   │
│ ● Weekly meeting    │  Dates | Type | Assign│ with image    │
│ ● Design training   │  ...   | ... | ...    │               │
├─────────────────────┴───────────────────────┴───────────────┤
│ [Day off 0/6] [Vacation 12/28] [Sick 10]                    │
└─────────────────────────────────────────────────────────────┘
```

### Novos Componentes Dashboard
1. **WelcomeHeader.tsx** - Saudação + botões de ação
2. **MeetingCard.tsx** - Card escuro de reunião iminente
3. **EfficiencyCard.tsx** - Métricas com gráfico donut
4. **UpcomingEvents.tsx** - Lista de eventos próximos
5. **RequestsTable.tsx** - Tabela de solicitações
6. **LeaveStats.tsx** - Cards de Day off/Vacation/Sick
7. **NewsCard.tsx** - Card de notícias com imagem

---

## 4. Novo Design do Calendário/Agenda

### Estrutura Visual (baseada em layout2.webp)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Dashboard  Events  My requests  Company news  Tasks │
├──────────────┬──────────────────────────────────────────────┤
│ March 2024   │  March, 2024  [Month][Week][Day] [< Today >] │
│ [Calendar]   │  Sun  Mon  Tue  Wed  Thu  Fri  Sat          │
│ ● ● ● ●      │  10   11   12   13   14   15   16           │
├──────────────┼──────────────────────────────────────────────┤
│ My Calendars │  6am ┌──────┬──────┐                        │
│ ☑ Lloyd Rob  │  7am │ Taxi │Design│ [+ Modal criar evento] │
│ ☐ Tasks      │  8am │ book │onbord│                        │
│ ☐ Birthdays  │  9am └──────┴──────┘                        │
├──────────────┤  10am                                        │
│ Projects     │  11am                                        │
│ ● WeBuild    │                                              │
│ ● Marketing  │                                              │
├──────────────┤                                              │
│ [Event Card] │                                              │
│ Meet Gabriel │                                              │
│ [Later][Det] │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Novos Componentes Calendário
1. **CalendarSidebar.tsx** - Sidebar escura com mini-calendário
2. **WeekView.tsx** - Visualização semanal moderna
3. **EventBlock.tsx** - Blocos de evento coloridos
4. **CreateEventModal.tsx** - Modal com tags coloridas
5. **CalendarFilters.tsx** - My Calendars + Projects

---

## 5. Arquivos a Modificar

### Fase 1: Sistema de Cores (Prioridade Alta)
```
src/app/globals.css
tailwind.config.ts
```

### Fase 2: Layout Principal
```
src/components/layout/DashboardShell.tsx
src/components/layout/Header.tsx
src/components/layout/TopNavigation.tsx (NOVO)
src/components/layout/Sidebar.tsx (refatorar para mobile)
```

### Fase 3: Dashboard
```
src/app/(dashboard)/page.tsx
src/components/dashboard/WelcomeHeader.tsx (NOVO)
src/components/dashboard/MeetingCard.tsx (NOVO)
src/components/dashboard/EfficiencyCard.tsx (NOVO)
src/components/dashboard/UpcomingEvents.tsx (NOVO)
src/components/dashboard/RequestsTable.tsx (NOVO)
src/components/dashboard/LeaveStats.tsx (NOVO)
src/components/dashboard/NewsCard.tsx (NOVO)
src/components/dashboard/QuickStats.tsx (REMOVER ou adaptar)
src/components/dashboard/TasksChart.tsx (REMOVER ou adaptar)
```

### Fase 4: Calendário/Agenda
```
src/app/(dashboard)/calendar/page.tsx
src/components/calendar/CalendarSidebar.tsx (NOVO)
src/components/calendar/WeekView.tsx (NOVO)
src/components/calendar/EventBlock.tsx (NOVO)
src/components/calendar/CreateEventModal.tsx (NOVO)
src/components/calendar/CalendarFilters.tsx (NOVO)
```

---

## 6. Especificações de Design

### Tipografia
- **Fonte:** System UI (manter) ou considerar Atyp Display
- **Títulos grandes:** 2.25rem (36px) font-semibold
- **Saudação:** Itálico, grande, com emoji

### Espaçamentos
- **Cards:** rounded-2xl (16px border-radius)
- **Gaps:** gap-4 a gap-6 entre cards
- **Padding cards:** p-6

### Sombras
- **Cards padrão:** shadow-sm
- **Cards hover:** shadow-md com transition

### Elementos Especiais
- **Cards escuros:** bg-black text-white rounded-2xl
- **Botão Primary (laranja):** bg-[#ef5907] text-white rounded-full
- **Botão Secondary (preto):** bg-black text-white rounded-full
- **Badges:** rounded-full px-3 py-1
- **Avatares em grupo:** -space-x-2 (sobreposição)
- **Gráfico Donut:** Recharts PieChart com innerRadius

### Navegação Horizontal
- **Logo:** "N" estilizado em laranja
- **Items ativos:** text-[#ef5907] com underline laranja
- **Items inativos:** text-gray-600

---

## 7. Ordem de Implementação

### Sprint 1: Fundação (Estimativa: 8-12 arquivos)
1. ☐ Atualizar globals.css com novas cores
2. ☐ Atualizar tailwind.config.ts
3. ☐ Criar TopNavigation.tsx
4. ☐ Refatorar DashboardShell.tsx
5. ☐ Refatorar Header.tsx

### Sprint 2: Dashboard (Estimativa: 8-10 arquivos)
1. ☐ Criar WelcomeHeader.tsx
2. ☐ Criar MeetingCard.tsx
3. ☐ Criar EfficiencyCard.tsx
4. ☐ Criar UpcomingEvents.tsx
5. ☐ Criar RequestsTable.tsx
6. ☐ Criar LeaveStats.tsx
7. ☐ Criar NewsCard.tsx
8. ☐ Refatorar page.tsx do dashboard

### Sprint 3: Calendário (Estimativa: 6-8 arquivos)
1. ☐ Criar CalendarSidebar.tsx
2. ☐ Criar WeekView.tsx
3. ☐ Criar EventBlock.tsx
4. ☐ Criar CreateEventModal.tsx
5. ☐ Criar CalendarFilters.tsx
6. ☐ Refatorar page.tsx do calendar

### Sprint 4: Polimento
1. ☐ Ajustar responsividade
2. ☐ Testar dark mode
3. ☐ Animações e transições
4. ☐ Revisão de acessibilidade

---

## 8. Considerações Técnicas

### Compatibilidade
- Manter suporte a dark mode (ajustar cores escuras)
- Manter responsividade mobile-first
- Manter acessibilidade WCAG 2.1 AA

### Dependências Existentes
- Recharts (manter para gráficos)
- Shadcn/UI (manter, ajustar cores)
- Lucide React (manter ícones)
- React Big Calendar (avaliar se mantém ou substitui)

### Breaking Changes
- Layout de sidebar → navbar horizontal
- Estrutura de rotas permanece igual
- Componentes de dashboard serão substituídos

---

## 9. Mockups de Referência

- `layout.webp` - Dashboard principal
- `layout2.webp` - Calendário/Eventos
- `layout3.webp` - Design system (cores e fonte)

---

---

## 10. Decisões do Usuário

- **Layout:** Navegação Horizontal (novo design)
- **Escopo:** Completo (Dashboard + Agenda)
- **Componentes:** Substituir por novos (não adaptar existentes)

---

**Data:** 2026-01-05
**Versão:** 1.0
**Status:** APROVADO - Pronto para implementação
