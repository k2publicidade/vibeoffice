# Preferências do Usuário - VIBEOFFICE

## Fluxo de Trabalho Automatizado

### 1. Planejamento (OBRIGATÓRIO)
- ✅ **Sempre usar @agent-architecture-planner**: Para TODAS as tarefas de implementação, iniciar automaticamente com o agente architecture-planner
- ✅ **Sem pedir permissão**: Executar o planejamento diretamente sem solicitar aprovação do usuário
- ✅ **Explorar antes de implementar**: O agente deve explorar o codebase e criar plano detalhado antes de qualquer mudança

### 2. Revisão (OBRIGATÓRIO)
- ✅ **Sempre usar @vibeoffice\.claude\agents\architect-review.md**: Após implementar qualquer tarefa, usar o agente architect-review para revisar o código
- ✅ **Evitar bugs e erros**: A revisão deve identificar problemas de arquitetura, bugs potenciais, erros de implementação
- ✅ **Garantir qualidade**: Verificar segurança, performance, TypeScript, React best practices
- ✅ **Sem pedir permissão**: Executar a revisão automaticamente após implementação

### 3. Seleção de Modelos (OBRIGATÓRIO)
- ✅ **Sonnet para Planejamento**: Usar modelo `sonnet` para todas as fases de planejamento
  - Exploração de codebase (@agent-architecture-planner)
  - Análise de requisitos
  - Design de soluções
  - Geração de planos
  - **Razão**: Sonnet é mais rápido e eficiente para análise e planejamento

- ✅ **Opus para Execução**: Usar modelo `opus` para todas as tarefas de desenvolvimento
  - Implementação de código (frontend + backend)
  - Criação de componentes React
  - Desenvolvimento de APIs
  - Integração de funcionalidades
  - Correção de bugs
  - **Razão**: Opus é mais poderoso para escrita de código complexo e desenvolvimento

- ✅ **Sonnet para Revisão**: Usar modelo `sonnet` para revisão de código (@architect-review)
  - Análise de código implementado
  - Identificação de problemas
  - Sugestões de melhorias
  - **Razão**: Sonnet é suficiente para análise e revisão

## Agentes Especializados por Área

### Backend (OBRIGATÓRIO para tarefas de backend)
- ✅ **Sempre usar @vibeoffice\.claude\agents\backend-architect.md**: Para TODAS as tarefas relacionadas a:
  - API Routes
  - Estrutura de dados mockados
  - Autenticação e autorização
  - Validação com Zod
  - Preparação para migração de backend
  - Sistema de permissões
  - Mock data e simulações

### Frontend + UX (OBRIGATÓRIO - Trabalhar em Conjunto)
**Desenvolver como Fullstack Sênior usando AMBOS os agentes:**

- ✅ **@vibeoffice\.claude\agents\ui-ux-designer.md**: Responsável por:
  - Design System VIBE
  - Padrões visuais e componentes
  - Acessibilidade (WCAG 2.1 AA)
  - Responsividade mobile-first
  - Dark mode
  - Animações e transições
  - UX patterns (loading, error, success states)

- ✅ **@vibeoffice\.claude\agents\frontend-developer.md**: Responsável por:
  - Implementação de componentes React
  - Hooks customizados
  - Integração com APIs
  - TypeScript types
  - Validação com Zod
  - Next.js App Router
  - Performance frontend

**IMPORTANTE**: Esses dois agentes devem trabalhar **JUNTOS** em todas as tarefas de frontend para formar um **Desenvolvedor Fullstack Sênior** completo.

## Design System VIBE - Padrão Visual Obrigatório

### Paleta de Cores VIBE Premium
```css
/* Cores VIBE - Usar em TODOS os componentes */
--vibe-orange: #ef5907    /* Cor principal - ações, destaques */
--vibe-blue: #0c67ff      /* Cor secundária - informações, links */
--vibe-coral: #fc7a67     /* Variação suave do laranja */
--vibe-red: #ff0300       /* Alertas, badges importantes */

/* Backgrounds Dark Mode */
--bg-black: #000000       /* Background principal */
--bg-dark: #0a0a0a        /* Background secundário */
--bg-card: #1a1a1a        /* Cards e containers */

/* Borders */
--border-subtle: #262626  /* Borders sutis */
--border-accent: rgba(255, 3, 0, 0.2)  /* Borders com cor VIBE */
```

### Gradientes Premium
```css
/* Gradiente principal VIBE */
background: linear-gradient(135deg, #ef5907 0%, #0c67ff 100%);

/* Gradiente coral-red (alternativo) */
background: linear-gradient(135deg, #fc7a67 0%, #ff0300 100%);
```

### Componentes UI Base (Shadcn/UI)
- **Sempre usar componentes de** `@/components/ui/*`
- Avatar, Badge, Button, Card, Dialog, Input, Select, etc.
- **Nunca criar componentes básicos do zero**
- Customizar apenas com classes Tailwind

### Componentes Premium de Referência

#### 1. Chat Premium ⭐ (Padrão de Qualidade)
**Arquivos:**
- `ChatSidebar.tsx` - Sidebar com ícones de setores
- `ChatListPremium.tsx` - Lista de conversas com busca
- `ChatRoomPremium.tsx` - Área de chat principal
- `MessageListPremium.tsx` - Lista de mensagens animadas
- `MessageInputPremium.tsx` - Input com anexos e emojis
- `MobileSectorNav.tsx` - Bottom navigation mobile

**Características:**
- Background preto (#000000)
- Borders: `#262626` ou `rgba(255, 3, 0, 0.2)`
- Gradiente VIBE em mensagens enviadas
- Animações com Framer Motion
- Totalmente responsivo (mobile-first)
- Bottom navigation em mobile
- 3 áreas: Sidebar 80px + Lista 384px + Chat flex-1

#### 2. MultiSelect (Filtros Avançados)
**Arquivo:** `multi-select.tsx`

**Características:**
- Dark mode: `bg-zinc-900`, `border-zinc-800`
- Custom rendering de valores
- Badges coloridos com ícones
- Animações suaves
- Context API

#### 3. Kanban Board (Drag & Drop)
**Arquivos:**
- `trello-kanban-board.tsx` - Board genérico
- `KanbanTaskCard.tsx` - Card VIBE

**Características:**
- Drag & drop (@dnd-kit)
- Gradientes por prioridade
- Border colorido por status
- Animação overdue

### Padrões de Estilo Obrigatórios

#### Cards e Containers
```typescript
// Dark mode com border sutil
className="bg-black border border-[#262626] rounded-xl p-4"

// Card com destaque VIBE
className="bg-[#1a1a1a] border border-[#ff0300]/20 rounded-xl p-4"
```

#### Botões
```typescript
// Botão primário VIBE
className="bg-[#fc7a67] text-black hover:bg-[#ff0300]"

// Botão secundário
className="bg-[#1a1a1a] text-white border border-[#ff0300]/20 hover:bg-[#ff0300]/20"

// Botão com gradiente
style={{ background: 'linear-gradient(135deg, #ef5907 0%, #0c67ff 100%)' }}
```

#### Inputs
```typescript
// Input dark mode VIBE
className="bg-[#1a1a1a] border-[#ff0300]/20 text-white placeholder:text-gray-500 focus-visible:border-[#fc7a67] focus-visible:ring-[#fc7a67]"
```

#### Badges
```typescript
// Badge VIBE
className="bg-[#ff0300] text-white rounded-full px-2 py-0.5"

// Badge outline
className="border border-[#fc7a67] text-[#fc7a67] bg-[#fc7a67]/10"
```

#### Avatares
```typescript
// Avatar com fallback VIBE
<AvatarFallback className="bg-[#fc7a67] text-black font-bold">
  {initials}
</AvatarFallback>
```

### Animações com Framer Motion

#### Entrada de elementos
```typescript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

#### Lista animada
```typescript
<AnimatePresence>
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    />
  ))}
</AnimatePresence>
```

### Responsividade Mobile-First

#### Breakpoints Tailwind
```typescript
// Mobile: default (sem prefixo)
// Tablet: md: (768px)
// Desktop: lg: (1024px)
// Large: xl: (1280px)

// Exemplo:
className="w-full lg:w-96"  // Full em mobile, 96 em desktop
className="hidden lg:block" // Esconde em mobile, mostra em desktop
className="flex lg:hidden"  // Mostra em mobile, esconde em desktop
```

#### Bottom Navigation Mobile
- Usar em telas com navegação lateral em desktop
- Fixed position: `fixed bottom-0 left-0 right-0`
- Background preto com border top
- Ícones com cores VIBE

### Ícones (Lucide React)
```typescript
import { Hash, Users, Building2, Music, Search, Phone, Video } from 'lucide-react'

// Tamanhos
className="h-5 w-5"  // Padrão
className="h-4 w-4"  // Pequeno

// Cor VIBE
className="text-[#fc7a67]"
```

### ScrollArea (Radix UI)
```typescript
// Sempre usar para áreas com scroll
<ScrollArea className="flex-1">
  <div className="p-4">
    {content}
  </div>
</ScrollArea>
```

## Processo Completo Recomendado (Fullstack)

```
1. Receber solicitação do usuário
   ↓
2. 🔵 SONNET: Executar @agent-architecture-planner
   - Explorar codebase
   - Identificar se é tarefa de frontend, backend ou fullstack
   - Criar plano detalhado
   ↓
3. 🟣 OPUS: Implementar conforme especialização

   BACKEND:
   - Usar @backend-architect
   - Criar API routes
   - Estruturar dados mockados
   - Validar com Zod
   - Implementar permissões

   FRONTEND (Trabalho em Conjunto):
   - Usar @ui-ux-designer + @frontend-developer JUNTOS
   - Designer: Define componentes, layout, cores VIBE, UX
   - Developer: Implementa componentes, hooks, integração
   - Resultado: Código com qualidade Fullstack Sênior
   ↓
4. 🔵 SONNET: Executar @architect-review
   - Revisar código implementado
   - Verificar consistência visual VIBE
   - Validar backend (se aplicável)
   - Identificar problemas
   ↓
5. 🟣 OPUS: Corrigir problemas encontrados (se houver)
   ↓
6. Build final e validação
```

## Agentes

### Architecture Planner (INÍCIO - Obrigatório)
- **Modelo**: 🔵 Sonnet
- **Quando usar**: SEMPRE antes de qualquer implementação
- **Objetivo**: Explorar codebase e criar plano
- **Não requer aprovação**: Executar automaticamente

### Backend Architect (Backend - Obrigatório)
- **Modelo**: 🟣 Opus
- **Quando usar**: SEMPRE para tarefas de backend
- **Objetivo**: API routes, dados mockados, autenticação, permissões
- **Não requer aprovação**: Executar automaticamente

### UI/UX Designer + Frontend Developer (Frontend - Obrigatório JUNTOS)
- **Modelo**: 🟣 Opus
- **Quando usar**: SEMPRE para tarefas de frontend (AMBOS em conjunto)
- **Objetivo**: Criar experiência Fullstack Sênior
- **Designer**: Design System, UX, acessibilidade, responsividade
- **Developer**: Implementação, hooks, TypeScript, performance
- **Não requer aprovação**: Executar automaticamente

### Architect Review (FIM - Obrigatório)
- **Modelo**: 🔵 Sonnet
- **Quando usar**: SEMPRE após implementação
- **Objetivo**: Revisar código, identificar bugs, garantir qualidade VIBE
- **Checklist**: Arquitetura, TypeScript, React, Segurança, Performance, Design System
- **Não requer aprovação**: Executar automaticamente

### Outros Agentes (Opcionais)
- **Explore**: Buscar código
- **Plan**: Design alternativo
- Podem ser executados sem confirmação

## Princípios

### Autonomia
- ✅ Não pedir permissão para usar agentes
- ✅ Não pedir permissão para entrar em modo de planejamento
- ✅ Executar fluxo completo: Planejar → Implementar → Revisar
- ✅ Usar múltiplos agentes em conjunto quando apropriado

### Comunicação
- ✅ Informar progresso
- ✅ Mostrar resultados da revisão
- ✅ Apresentar problemas (se houver)
- ❌ Não pedir aprovação para cada etapa

### Qualidade Fullstack Sênior
- ✅ Sempre planejar antes de implementar
- ✅ Backend: Usar backend-architect
- ✅ Frontend: Usar ui-ux-designer + frontend-developer JUNTOS
- ✅ Sempre revisar depois de implementar
- ✅ Corrigir problemas críticos imediatamente
- ✅ Build deve passar sem erros
- ✅ Manter consistência visual VIBE em TODOS os componentes
- ✅ Código com padrões de desenvolvedor sênior

### Consistência Visual VIBE
- ✅ Cores VIBE (#ef5907, #0c67ff, #fc7a67, #ff0300)
- ✅ Background preto (#000000) para telas principais
- ✅ Seguir Chat Premium como referência de qualidade
- ✅ Mobile-first com bottom navigation quando apropriado
- ✅ Animações suaves com Framer Motion
- ✅ Shadcn/UI como base de componentes

## Componentes de Referência (Copiar Padrões)

Ao criar novos componentes, usar como referência:
1. **Chat Premium** ⭐ - Layout, cores, animações, responsividade, mobile
2. **MultiSelect** - Dropdowns, seleção múltipla, badges
3. **Kanban Board** - Drag & drop, cards, gradientes

## Exemplo de Fluxo Fullstack

### Tarefa: "Criar módulo de Notificações"

```
1. @architecture-planner
   - Explora codebase
   - Identifica: Fullstack (frontend + backend)
   - Cria plano detalhado

2. BACKEND (@backend-architect)
   - Cria /api/notifications/route.ts
   - Define interface Notification
   - Adiciona mockNotifications
   - Implementa permissões por setor
   - Valida com Zod

3. FRONTEND (@ui-ux-designer + @frontend-developer JUNTOS)
   - Designer: Define layout, cores VIBE, UX do bell icon
   - Developer: Implementa NotificationBell component
   - Designer: Define modal de notificações (dark mode)
   - Developer: Implementa NotificationList + hooks
   - Resultado: Componente premium com UX impecável

4. @architect-review
   - Revisa API routes
   - Revisa componentes frontend
   - Valida consistência VIBE
   - Identifica melhorias

5. Build final ✅
```

## Otimização de Custos e Performance

### Estratégia de Uso de Modelos
- **Sonnet (mais rápido, custo reduzido)**:
  - Planejamento e análise
  - Exploração de código
  - Revisão de código
  - Resposta a perguntas
  - Documentação

- **Opus (mais poderoso, custo maior)**:
  - Implementação de código complexo
  - Desenvolvimento fullstack
  - Correção de bugs críticos
  - Refatoração significativa
  - Integração de sistemas

### Benefícios
- ✅ **Economia**: Usar Sonnet para tarefas analíticas reduz custos
- ✅ **Qualidade**: Usar Opus para código garante implementação robusta
- ✅ **Velocidade**: Sonnet é mais rápido para planejamento
- ✅ **Precisão**: Opus é mais preciso para código complexo

## Notas Importantes

- O usuário **confia no processo** e quer **agilidade**
- **Planejamento e Revisão são obrigatórios**, não opcionais
- **Backend Architect** para backend
- **UI/UX Designer + Frontend Developer JUNTOS** para frontend = **Fullstack Sênior**
- **Design System VIBE é obrigatório** em todos os componentes
- **Autonomia total** para executar o fluxo completo
- Foco em **qualidade, ausência de bugs e consistência visual**

---
*Última atualização: 2026-01-06*
*Projeto: VIBEDISTRO Intranet/CRM*
*Design System: VIBE Dark Premium*
*Nível: Desenvolvedor Fullstack Sênior*
