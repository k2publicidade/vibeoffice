# Design: Quadro de Avisos da Empresa

**Data:** 2026-01-07
**Projeto:** VibeOffice Intranet/CRM
**Status:** Design Aprovado

## Visão Geral

Sistema de quadro de avisos para exibir alertas importantes da empresa na dashboard. Avisos são criados por usuários ADMIN e GERENTE e exibidos para todos os usuários de forma clara e organizada.

## Requisitos Funcionais

### RF1: Exibição de Avisos
- Quadro de avisos exibido no **topo da dashboard**, antes de todo conteúdo
- Formato: **Carrossel com 3 avisos visíveis** simultaneamente
- Responsivo: 1 card (mobile) → 2 cards (tablet) → 3 cards (desktop)
- Navegação por setas laterais e indicadores de paginação
- Auto-play opcional (8 segundos por grupo)

### RF2: Níveis de Prioridade
- **3 níveis:** Info, Atenção, Urgente
- Identificação visual por cores:
  - Info: Azul (`border-blue-500`)
  - Atenção: Amarelo (`border-yellow-500`)
  - Urgente: Vermelho (`border-red-500`)
- Ordenação automática: urgente → atenção → info

### RF3: Data de Expiração
- Todo aviso tem **data de validade obrigatória**
- Avisos expirados desaparecem automaticamente
- Footer do card mostra "Expira em X dias"
- Máximo de 90 dias de validade

### RF4: Segmentação por Setores
- Avisos podem ser direcionados para:
  - **Todos os setores** (target_sectors vazio)
  - **Setores específicos** (array de setores)
- Usuários veem apenas avisos do seu setor ou avisos gerais
- Gerentes podem criar apenas para seu setor
- Admin pode criar para qualquer setor

### RF5: Gerenciamento de Avisos
- **Interface dupla:**
  1. Botão "+" no carrossel → modal rápido de criação
  2. Página `/admin/avisos` → gerenciamento completo
- **Permissões:**
  - Admin: cria, edita, arquiva, deleta todos os avisos
  - Gerente: cria, edita, arquiva avisos do seu setor
  - Colaborador: apenas visualiza

## Arquitetura de Dados

### Tabela: company_announcements

```sql
CREATE TYPE announcement_priority AS ENUM ('info', 'warning', 'urgent');

CREATE TABLE company_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (length(title) <= 100),
  message TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'info',
  created_by UUID NOT NULL REFERENCES users(id),
  target_sectors sector_type[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Índices

```sql
-- Performance para queries de avisos ativos
CREATE INDEX idx_announcements_active_expires
  ON company_announcements(active, expires_at DESC);

-- Busca por setores (GIN index para arrays)
CREATE INDEX idx_announcements_sectors
  ON company_announcements USING GIN(target_sectors);
```

### RLS Policies

**SELECT (Visualização):**
```sql
-- Usuários veem avisos ativos, não expirados, do seu setor ou gerais
CREATE POLICY "Users view active announcements"
  ON company_announcements FOR SELECT
  USING (
    active = true
    AND expires_at > NOW()
    AND (
      target_sectors = '{}'
      OR (SELECT sector FROM users WHERE id = auth.uid()) = ANY(target_sectors)
    )
  );
```

**INSERT/UPDATE/DELETE:**
```sql
-- Admin pode gerenciar todos
CREATE POLICY "Admin manages all announcements"
  ON company_announcements FOR ALL
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'Admin');

-- Gerente gerencia apenas do seu setor
CREATE POLICY "Manager manages own sector announcements"
  ON company_announcements FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Gerente'
    AND (SELECT sector FROM users WHERE id = auth.uid()) = ANY(target_sectors)
  );
```

## Componentes React

### 1. AnnouncementsCarousel

**Localização:** `src/components/announcements/AnnouncementsCarousel.tsx`

**Responsabilidades:**
- Buscar avisos ativos via `useAnnouncements()`
- Renderizar carrossel com navegação
- Exibir estado vazio quando não há avisos
- Mostrar botão "+" para Admin/Gerente

**Props:**
```typescript
interface AnnouncementsCarouselProps {
  className?: string;
}
```

**Estados:**
- `currentPage: number` - página atual do carrossel
- `autoPlay: boolean` - controle de auto-play

### 2. AnnouncementCard

**Localização:** `src/components/announcements/AnnouncementCard.tsx`

**Estrutura:**
- Border colorida esquerda (4px) por prioridade
- Header: Badge prioridade + data + setores alvo
- Título: Bold, truncado em 2 linhas
- Mensagem: Até 3 linhas, botão "Ver mais"
- Footer: Avatar criador + nome + tempo de validade
- Ações (hover): Editar/Arquivar (Admin/Gerente)

**Props:**
```typescript
interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
  onViewMore?: (announcement: Announcement) => void;
}
```

### 3. CreateAnnouncementModal

**Localização:** `src/components/announcements/CreateAnnouncementModal.tsx`

**Campos do Formulário:**
1. Título (input, max 100 chars)
2. Mensagem (textarea com markdown preview)
3. Prioridade (select com ícones coloridos)
4. Data de Expiração (DatePicker, min: hoje, max: +90 dias)
5. Setores Alvo (MultiSelect + checkbox "Todos")
6. Link/Anexo (input URL, opcional)

**Validações:**
- Título obrigatório
- Mensagem obrigatória
- Data de expiração futura
- Gerente: setor próprio sempre selecionado e desabilitado

**Props:**
```typescript
interface CreateAnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  editingId?: string; // Para modo edição
}
```

### 4. AdminAnnouncementsPage

**Localização:** `src/app/(dashboard)/admin/avisos/page.tsx`

**Seções:**
- **Header:** Título + botão "Novo Aviso" + stats
- **Filtros:** Busca, prioridade, setor, status, autor
- **Tabela:** Lista de todos os avisos (paginada)
  - Desktop: Tabela completa
  - Mobile: Cards empilhados

**Colunas da Tabela:**
- Status (badge)
- Título
- Prioridade
- Setores (chips)
- Autor
- Criado em / Expira em
- Ações (menu 3-dot)

## Hook Customizado

### useAnnouncements()

**Localização:** `src/hooks/useAnnouncements.ts`

**Estado:**
```typescript
interface UseAnnouncementsReturn {
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  createAnnouncement: (data: CreateAnnouncementData) => Promise<void>;
  updateAnnouncement: (id: string, data: UpdateAnnouncementData) => Promise<void>;
  archiveAnnouncement: (id: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
}
```

**Lógica:**
1. Fetch avisos ativos e não expirados ao montar
2. Filtro automático por setor do usuário (client-side)
3. Ordenação: prioridade (urgent → warning → info) + created_at DESC
4. Métodos CRUD com optimistic updates
5. Toast notifications para feedback

## Integração na Dashboard

**Arquivo:** `src/app/(dashboard)/page.tsx`

**Posicionamento:**
```tsx
<motion.div>
  <WelcomeHeader />

  {/* NOVO: Quadro de Avisos */}
  <AnnouncementsCarousel className="mb-6 md:mb-8" />

  {/* Resto do conteúdo existente */}
  <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
    ...
  </div>
</motion.div>
```

## Responsividade

### Breakpoints

- **< 768px (Mobile):**
  - 1 card por vez
  - Navegação por swipe + setas
  - Cards ocupam 100% da largura com padding

- **768px - 1024px (Tablet):**
  - 2 cards lado a lado
  - Gap de `4` entre cards

- **> 1024px (Desktop):**
  - 3 cards lado a lado
  - Gap de `6` entre cards

### Touch Targets

- Setas de navegação: mín. 44px × 44px
- Botão "+": 56px × 56px (flutuante)
- Botões de ação: mín. 40px altura

## Fluxos de Uso

### Fluxo: Usuário Comum

1. Abre dashboard
2. Vê avisos importantes no topo
3. Navega pelo carrossel (setas ou swipe)
4. Clica "Ver mais" → modal com mensagem completa
5. Avisos expirados desaparecem automaticamente

### Fluxo: Admin Criar Aviso Rápido

1. Na dashboard, clica botão "+" no carrossel
2. Modal abre com formulário
3. Preenche título, mensagem, prioridade, setores, data
4. Preview em tempo real
5. Clica "Publicar"
6. Aviso aparece instantaneamente no carrossel

### Fluxo: Gerente Gerenciar Avisos

1. Acessa `/admin/avisos`
2. Vê lista de avisos do seu setor
3. Filtra por status/prioridade
4. Clica menu 3-dot → Editar
5. Atualiza informações
6. Salva → mudanças refletem imediatamente

### Fluxo: Admin Arquivar Aviso Expirado

1. Na página `/admin/avisos`
2. Filtra por "Expirados"
3. Seleciona avisos antigos
4. Ação em lote: "Arquivar selecionados"
5. Avisos saem da lista ativa

## Estados de Interface

### Estado Vazio (Sem Avisos)

```
┌─────────────────────────────────────┐
│                                     │
│           📢                        │
│   Nenhum aviso no momento          │
│                                     │
└─────────────────────────────────────┘
```

### Estado Loading

- Skeleton de 3 cards lado a lado
- Animação de shimmer

### Estado Erro

- Toast notification: "Erro ao carregar avisos"
- Botão "Tentar novamente"

## Melhorias Futuras (Fase 2)

1. **Notificações In-App:**
   - Avisos urgentes geram notificação na tabela `notifications`
   - Badge no NotificationBell

2. **Analytics:**
   - Rastrear visualizações de avisos
   - Relatório de engajamento por setor

3. **Rich Text Editor:**
   - Markdown avançado
   - Upload de imagens inline

4. **Reações:**
   - Usuários podem reagir com emojis
   - "Marcar como lido"

## Arquivos a Criar

### Migrations
- `vibeoffice/docs/supabase-migrations/021_company_announcements.sql`

### Hooks
- `vibeoffice/src/hooks/useAnnouncements.ts`

### Componentes
- `vibeoffice/src/components/announcements/AnnouncementsCarousel.tsx`
- `vibeoffice/src/components/announcements/AnnouncementCard.tsx`
- `vibeoffice/src/components/announcements/CreateAnnouncementModal.tsx`
- `vibeoffice/src/components/announcements/AnnouncementPreviewModal.tsx`

### Páginas
- `vibeoffice/src/app/(dashboard)/admin/avisos/page.tsx`

### Types
- Adicionar em `vibeoffice/src/types/index.ts`:
  ```typescript
  export type AnnouncementPriority = 'info' | 'warning' | 'urgent';

  export interface Announcement {
    id: string;
    title: string;
    message: string;
    priority: AnnouncementPriority;
    createdBy: string;
    createdByName?: string;
    createdByAvatar?: string;
    targetSectors: SectorType[];
    expiresAt: Date;
    active: boolean;
    metadata: {
      link?: string;
      attachmentUrl?: string;
    };
    createdAt: Date;
    updatedAt: Date;
  }
  ```

## Checklist de Implementação

- [ ] Criar migration SQL e aplicar no Supabase
- [ ] Criar tipos TypeScript
- [ ] Implementar hook `useAnnouncements`
- [ ] Criar componente `AnnouncementCard`
- [ ] Criar componente `AnnouncementsCarousel`
- [ ] Criar componente `CreateAnnouncementModal`
- [ ] Criar componente `AnnouncementPreviewModal`
- [ ] Integrar carrossel na dashboard principal
- [ ] Criar página `/admin/avisos`
- [ ] Testar permissões (Admin, Gerente, Colaborador)
- [ ] Testar responsividade (mobile, tablet, desktop)
- [ ] Testar expiração automática de avisos
- [ ] Seed com avisos de exemplo

---

**Design aprovado em:** 2026-01-07
**Pronto para implementação**
