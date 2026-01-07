# Design: Grupos de Projeto e Melhorias no Chat

**Data:** 2026-01-07
**Status:** Aprovado para implementação
**Autor:** Claude + Usuário

## Sumário Executivo

Expansão do módulo de chat do VibeOffice para suportar grupos personalizados de projeto, melhorar a organização da interface com três seções distintas, e corrigir a exibição de nomes dos remetentes nas mensagens.

## Contexto

### Situação Atual
- Sistema de chat com 2 tipos de salas: `sector` (oficial, criado por admins) e `dm` (1:1)
- Interface organizada em 2 seções: Salas de Setor e Conversas Diretas
- **Problema:** Nomes dos remetentes não aparecem acima das mensagens no MessageListPremium
- **Limitação:** Usuários não podem criar grupos personalizados para projetos

### Objetivos
1. ✅ Permitir usuários criarem grupos personalizados para projetos
2. ✅ Organizar interface em 3 seções distintas
3. ✅ Exibir nomes dos remetentes nas mensagens
4. ✅ Criador do grupo tem controle total (adicionar/remover membros, deletar)

## Requisitos Funcionais

### RF1: Criação de Grupos de Projeto
- Qualquer usuário autenticado pode criar grupo de projeto
- Campos obrigatórios: nome (máx 50 chars), descrição (máx 200 chars), membros (mín 2)
- Criador é automaticamente adicionado aos participantes
- Modal em 2 passos: (1) Informações básicas, (2) Seleção de membros

### RF2: Gestão de Grupos de Projeto
- Apenas criador pode:
  - Adicionar/remover membros
  - Editar nome e descrição
  - Deletar o grupo
- Criador não pode ser removido do grupo
- Membros podem sair voluntariamente

### RF3: Organização da Interface
- 3 seções colapsáveis na sidebar:
  1. **Salas de Setor** - grupos oficiais (ícone: Building2)
  2. **Grupos de Projeto** - grupos personalizados (ícone: FolderKanban)
  3. **Conversas Diretas** - DMs 1:1 (ícone: MessageCircle)
- Badge "Criador" em grupos onde o usuário é dono
- Contadores de mensagens não lidas

### RF4: Exibição de Nomes nas Mensagens
- Nome do remetente aparece acima da bolha de mensagem
- Lógica de agrupamento: oculta nome se mensagem anterior for do mesmo remetente e < 5 minutos
- Não exibe nome para mensagens próprias

## Arquitetura Técnica

### 1. Banco de Dados

#### Migration SQL
```sql
-- Adicionar novo tipo ao enum
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'project';

-- Adicionar campos para grupos de projeto
ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by
  ON chat_rooms(created_by);
```

#### Schema Atualizado: `chat_rooms`
```
id              UUID (PK)
name            TEXT
type            room_type ('sector' | 'dm' | 'project')
sector          sector_type (nullable)
description     TEXT (nullable)
created_by      UUID (nullable, FK users)
participants    UUID[]
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### Regras de Negócio por Tipo
- **sector:** sector preenchido, created_by null, description null
- **dm:** participants.length = 2, description null, created_by null
- **project:** description obrigatória, created_by obrigatório, sector null

#### RLS Policies
```sql
-- Permitir criação de grupos de projeto
CREATE POLICY "Users can create project groups"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    type = 'project'
    AND created_by = auth.uid()
    AND auth.uid() = ANY(participants)
  );

-- Apenas criador pode deletar
CREATE POLICY "Creator can delete project groups"
  ON chat_rooms FOR DELETE
  USING (type = 'project' AND created_by = auth.uid());

-- Apenas criador pode atualizar
CREATE POLICY "Creator can update project groups"
  ON chat_rooms FOR UPDATE
  USING (type = 'project' AND created_by = auth.uid());
```

### 2. TypeScript Types

#### Arquivo: `/src/types/chat.ts`

```typescript
// Atualizar enum
export type RoomType = 'sector' | 'dm' | 'project'

// Atualizar interface
export interface ChatRoom {
  id: string
  name: string
  type: RoomType
  sector?: string
  description?: string      // NOVO
  createdBy?: string        // NOVO
  participants: string[]
  createdAt: string
  updatedAt: string
  lastMessage?: string
  unreadCount?: number
  isArchived?: boolean
}

// Nova interface
export interface CreateProjectGroupData {
  name: string
  description: string
  memberIds: string[]
}

// Type guards
export const isProjectGroup = (room: ChatRoom): boolean =>
  room.type === 'project'

export const isSectorRoom = (room: ChatRoom): boolean =>
  room.type === 'sector'

export const isDM = (room: ChatRoom): boolean =>
  room.type === 'dm'

export const canManageGroup = (room: ChatRoom, userId: string): boolean =>
  room.type === 'project' && room.createdBy === userId

// Validação
export const validateProjectGroup = (
  data: CreateProjectGroupData
): { valid: boolean; error?: string } => {
  if (!data.name.trim()) {
    return { valid: false, error: 'Nome é obrigatório' }
  }
  if (data.name.length > 50) {
    return { valid: false, error: 'Nome muito longo (máx 50 caracteres)' }
  }
  if (!data.description.trim()) {
    return { valid: false, error: 'Descrição é obrigatória' }
  }
  if (data.memberIds.length < 2) {
    return { valid: false, error: 'Selecione pelo menos 2 membros' }
  }
  return { valid: true }
}
```

### 3. Hook useChat

#### Arquivo: `/src/hooks/useChat.ts`

**Novas funções a adicionar:**

```typescript
// 1. Criar grupo de projeto
const createProjectGroup = async (
  data: CreateProjectGroupData
): Promise<ChatRoom | null> => {
  if (!user?.id) return null

  const validation = validateProjectGroup(data)
  if (!validation.valid) {
    toast.error(validation.error)
    return null
  }

  const participants = Array.from(new Set([user.id, ...data.memberIds]))

  const { data: newRoom, error } = await supabase
    .from('chat_rooms')
    .insert({
      name: data.name.trim(),
      type: 'project',
      description: data.description.trim(),
      created_by: user.id,
      participants: participants
    })
    .select()
    .single()

  if (error) throw error

  setRooms(prev => [newRoom, ...prev])
  setCurrentRoom(newRoom)
  toast.success('Grupo de projeto criado!')
  return newRoom
}

// 2. Atualizar grupo de projeto
const updateProjectGroup = async (
  roomId: string,
  updates: { name?: string; description?: string }
): Promise<boolean> => {
  const { error } = await supabase
    .from('chat_rooms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .eq('created_by', user.id)
    .eq('type', 'project')

  if (error) throw error

  setRooms(prev => prev.map(room =>
    room.id === roomId ? { ...room, ...updates } : room
  ))
  toast.success('Grupo atualizado!')
  return true
}

// 3. Adicionar membro
const addMemberToProject = async (
  roomId: string,
  userId: string
): Promise<boolean> => {
  const room = rooms.find(r => r.id === roomId)
  if (!room || !canManageGroup(room, user.id)) {
    toast.error('Sem permissão')
    return false
  }

  const newParticipants = [...room.participants, userId]
  const { error } = await supabase
    .from('chat_rooms')
    .update({ participants: newParticipants })
    .eq('id', roomId)

  if (error) throw error
  return true
}

// 4. Remover membro
const removeMemberFromProject = async (
  roomId: string,
  userId: string
): Promise<boolean> => {
  const room = rooms.find(r => r.id === roomId)
  if (userId === room?.createdBy) {
    toast.error('Não pode remover o criador do grupo')
    return false
  }

  const newParticipants = room.participants.filter(id => id !== userId)
  const { error } = await supabase
    .from('chat_rooms')
    .update({ participants: newParticipants })
    .eq('id', roomId)

  if (error) throw error
  return true
}

// Retornar no hook
return {
  // ... funções existentes
  createProjectGroup,
  updateProjectGroup,
  addMemberToProject,
  removeMemberFromProject,
}
```

### 4. Componentes UI

#### 4.1 ChatListPremium (Sidebar)

**Arquivo:** `/src/components/chat/ChatListPremium.tsx`

**Modificações:**
```typescript
// Separar rooms por tipo
const sectorRooms = rooms.filter(r => r.type === 'sector')
const projectRooms = rooms.filter(r => r.type === 'project')
const dmRooms = rooms.filter(r => r.type === 'dm')

// Estados de collapse
const [showSectorRooms, setShowSectorRooms] = useState(true)
const [showProjectRooms, setShowProjectRooms] = useState(true)
const [showDMs, setShowDMs] = useState(true)

// Estrutura JSX: 3 seções colapsáveis
// - Seção 1: Salas de Setor (ícone Building2)
// - Seção 2: Grupos de Projeto (ícone FolderKanban) + botão "Novo Grupo"
// - Seção 3: Conversas Diretas (ícone MessageCircle) + botão "Nova Conversa"
```

**Componente RoomItem:**
```typescript
const RoomItem = ({
  room,
  icon,
  showCreatorBadge = false
}: {
  room: ChatRoom
  icon: React.ReactNode
  showCreatorBadge?: boolean
}) => (
  <button onClick={() => setCurrentRoom(room)}>
    {icon}
    <div>
      <span>{room.name}</span>
      {showCreatorBadge && <Badge>Criador</Badge>}
      {room.lastMessage && <p>{room.lastMessage}</p>}
    </div>
    {room.unreadCount > 0 && <Badge>{room.unreadCount}</Badge>}
  </button>
)
```

#### 4.2 CreateProjectGroupModal

**Arquivo:** `/src/components/chat/CreateProjectGroupModal.tsx` (NOVO)

**Fluxo em 2 passos:**
- **Passo 1:** Nome (input, max 50) + Descrição (textarea, max 200)
- **Passo 2:** Seleção de membros com busca e agrupamento por setor

**Features:**
- Validação em tempo real
- Contador de caracteres
- Checkboxes para seleção múltipla
- Badges para membros selecionados
- Navegação Voltar/Próximo/Criar

#### 4.3 MessageListPremium (Exibição de Nomes)

**Arquivo:** `/src/components/chat/MessageListPremium.tsx`

**Modificações principais:**
```typescript
// Lógica de agrupamento
const showSenderInfo =
  !previousMessage ||
  previousMessage.userId !== message.userId ||
  (new Date(message.timestamp).getTime() -
   new Date(previousMessage.timestamp).getTime()) > 300000 // 5 min

// Exibir nome (apenas para mensagens de outros)
{showSenderInfo && !isOwn && (
  <span className="text-xs font-medium text-gray-700 mb-1 px-1">
    {sender?.name || 'Usuário Desconhecido'}
  </span>
)}
```

**Benefícios:**
- Identifica claramente remetente
- Interface limpa (não repete nomes desnecessariamente)
- Funciona para todos os tipos de sala

## Fluxo de Dados

```
ChatPage
├─ useChat()
│  ├─ rooms (tipo: 'sector' | 'dm' | 'project')
│  ├─ createProjectGroup(data)
│  ├─ updateProjectGroup(roomId, updates)
│  ├─ addMemberToProject(roomId, userId)
│  └─ removeMemberFromProject(roomId, userId)
│
├─ ChatListPremium
│  ├─ Seção 1: Salas de Setor
│  ├─ Seção 2: Grupos de Projeto → CreateProjectGroupModal
│  └─ Seção 3: Conversas Diretas
│
└─ ChatRoomPremium
   └─ MessageListPremium (exibe nomes)
```

## Arquivos Críticos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `supabase-migrations.sql` | Adicionar migration com ALTER TYPE + ALTER TABLE + RLS policies |
| `/src/types/chat.ts` | Atualizar interfaces, adicionar type guards e validações |
| `/src/hooks/useChat.ts` | Adicionar 4 novas funções (create, update, add, remove) |
| `/src/components/chat/ChatListPremium.tsx` | Reorganizar em 3 seções, adicionar estados collapse |
| `/src/components/chat/CreateProjectGroupModal.tsx` | **CRIAR NOVO** - Modal em 2 passos |
| `/src/components/chat/MessageListPremium.tsx` | Adicionar exibição de nomes com lógica de agrupamento |

## Testes Recomendados

### Testes Unitários
- ✅ Validação de `CreateProjectGroupData`
- ✅ Type guards (`isProjectGroup`, `canManageGroup`)
- ✅ Lógica de agrupamento de mensagens

### Testes de Integração
- ✅ Criação de grupo de projeto
- ✅ Adição/remoção de membros
- ✅ RLS policies (permissões)
- ✅ Realtime updates ao criar grupo

### Testes E2E
- ✅ Fluxo completo: criar grupo → adicionar membro → enviar mensagem → ver nome
- ✅ Validações: tentar criar sem nome/descrição
- ✅ Permissões: usuário comum não pode remover membro de grupo que não criou

## Considerações de Segurança

1. **RLS Policies:** Apenas criador pode modificar/deletar grupo
2. **Validação Frontend + Backend:** Não confiar apenas em validação do cliente
3. **Prevenção de XSS:** Sanitizar nomes de grupos e descrições
4. **Rate Limiting:** Limitar criação de grupos (ex: 10 por hora por usuário)

## Rollout e Migrações

### Fase 1: Database
1. Executar migration SQL
2. Verificar RLS policies
3. Testar em staging

### Fase 2: Backend/Types
1. Atualizar interfaces TypeScript
2. Adicionar funções no useChat
3. Testes unitários

### Fase 3: Frontend
1. Atualizar ChatListPremium (3 seções)
2. Criar CreateProjectGroupModal
3. Corrigir MessageListPremium (nomes)
4. Testes E2E

### Fase 4: Deploy
1. Deploy em staging
2. QA completo
3. Deploy em produção
4. Monitorar logs/erros

## Métricas de Sucesso

- ✅ Usuários conseguem criar grupos de projeto sem erros
- ✅ Nomes aparecem corretamente em 100% das mensagens
- ✅ Interface organizada reduz tempo de navegação em 30%
- ✅ Zero violações de RLS policies
- ✅ Performance: queries < 200ms

## Próximos Passos

1. ✅ Criar branch/worktree isolado
2. ✅ Implementar migration SQL
3. ✅ Atualizar types e hooks
4. ✅ Implementar componentes UI
5. ✅ Testes completos
6. ✅ Code review
7. ✅ Deploy staging → produção

---

**Design aprovado em:** 2026-01-07
**Pronto para implementação:** ✅ Sim
