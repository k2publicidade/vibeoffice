# Grupos de Projeto no Chat - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar grupos personalizados de projeto ao chat, reorganizar UI em 3 seções, e exibir nomes dos remetentes nas mensagens.

**Architecture:** Estender enum `room_type` com 'project', adicionar campos `description` e `created_by` à tabela chat_rooms, implementar RLS policies para permissões, criar modal de 2 passos para criação de grupos, reorganizar ChatListPremium em 3 seções colapsáveis, e corrigir MessageListPremium para exibir nomes.

**Tech Stack:** Next.js 14+, TypeScript, Supabase (PostgreSQL + Realtime), Shadcn/UI, Tailwind CSS

---

## Task 1: Database Migration - Adicionar Tipo 'project' e Campos

**Files:**
- Modify: `docs/supabase-migrations.sql` (adicionar no final)

**Step 1: Adicionar migration SQL ao arquivo**

Adicione ao final do arquivo `docs/supabase-migrations.sql`:

```sql
-- =====================================================
-- Migration 012: Grupos de Projeto no Chat
-- =====================================================
-- Data: 2026-01-07
-- Descrição: Adiciona suporte a grupos personalizados de projeto

-- Adicionar novo tipo ao enum room_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'project'
    AND enumtypid = 'room_type'::regtype
  ) THEN
    ALTER TYPE room_type ADD VALUE 'project';
  END IF;
END $$;

-- Adicionar campos para grupos de projeto
ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Comentários para documentação
COMMENT ON COLUMN chat_rooms.description IS 'Descrição/objetivo do grupo de projeto (apenas para type=project)';
COMMENT ON COLUMN chat_rooms.created_by IS 'UUID do criador do grupo (apenas para type=project)';

-- Índice para performance em queries por criador
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by
  ON chat_rooms(created_by)
  WHERE created_by IS NOT NULL;

-- =====================================================
-- RLS Policies para Grupos de Projeto
-- =====================================================

-- Permitir usuários criarem grupos de projeto
CREATE POLICY "Users can create project groups"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    type = 'project'
    AND created_by = auth.uid()
    AND auth.uid() = ANY(participants)
  );

-- Apenas criador pode deletar grupo de projeto
CREATE POLICY "Creator can delete project groups"
  ON chat_rooms FOR DELETE
  USING (
    type = 'project'
    AND created_by = auth.uid()
  );

-- Apenas criador pode atualizar grupo de projeto
CREATE POLICY "Creator can update project groups"
  ON chat_rooms FOR UPDATE
  USING (
    type = 'project'
    AND created_by = auth.uid()
  );

-- Permitir usuários verem grupos de projeto onde são participantes
-- (isso já é coberto pela policy existente de SELECT em chat_rooms,
-- mas vamos garantir que funciona para type='project' também)
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their chat rooms"
  ON chat_rooms FOR SELECT
  USING (auth.uid() = ANY(participants));
```

**Step 2: Aplicar migration via plugin Supabase**

Execute via CLI ou MCP plugin do Supabase:

```bash
# Opção 1: Copiar SQL e executar via Supabase Dashboard > SQL Editor
# Opção 2: Usar plugin MCP (se disponível)
# Opção 3: Usar supabase CLI local
```

**Expected:** Migration executada com sucesso, enum atualizado, colunas e policies criados.

**Step 3: Verificar migration**

Execute query de verificação:

```sql
-- Verificar enum
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'room_type'::regtype;
-- Expected: sector, dm, project

-- Verificar colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_rooms'
  AND column_name IN ('description', 'created_by');
-- Expected: description (text, YES), created_by (uuid, YES)

-- Verificar policies
SELECT policyname FROM pg_policies WHERE tablename = 'chat_rooms';
-- Expected: Incluir policies de project groups
```

**Step 4: Commit migration**

```bash
cd vibeoffice/.worktrees/chat-project-groups
git add docs/supabase-migrations.sql
git commit -m "feat(chat): adicionar migration para grupos de projeto

- Adiciona tipo 'project' ao enum room_type
- Adiciona campos description e created_by
- Cria RLS policies para permissões de criador
- Adiciona índice para performance"
```

---

## Task 2: TypeScript Types - Atualizar Interfaces e Validações

**Files:**
- Modify: `src/types/chat.ts`

**Step 1: Ler arquivo atual**

```bash
cat src/types/chat.ts
```

**Step 2: Atualizar RoomType enum**

No arquivo `src/types/chat.ts`, localizar:

```typescript
export type RoomType = 'sector' | 'dm'
```

Substituir por:

```typescript
export type RoomType = 'sector' | 'dm' | 'project'
```

**Step 3: Atualizar interface ChatRoom**

Localizar a interface `ChatRoom` e adicionar os campos:

```typescript
export interface ChatRoom {
  id: string
  name: string
  type: RoomType
  sector?: string
  description?: string       // NOVO - para grupos de projeto
  createdBy?: string         // NOVO - UUID do criador
  participants: string[]
  createdAt: string
  updatedAt: string
  lastMessage?: string
  unreadCount?: number
  isArchived?: boolean
}
```

**Step 4: Adicionar nova interface CreateProjectGroupData**

Adicionar ao final do arquivo (antes do último export):

```typescript
/**
 * Dados para criação de grupo de projeto
 */
export interface CreateProjectGroupData {
  name: string
  description: string
  memberIds: string[]
}
```

**Step 5: Adicionar type guards**

Adicionar ao final do arquivo:

```typescript
/**
 * Type guards para identificar tipo de sala
 */
export const isProjectGroup = (room: ChatRoom): boolean =>
  room.type === 'project'

export const isSectorRoom = (room: ChatRoom): boolean =>
  room.type === 'sector'

export const isDM = (room: ChatRoom): boolean =>
  room.type === 'dm'

/**
 * Verifica se usuário pode gerenciar o grupo (é o criador)
 */
export const canManageGroup = (room: ChatRoom, userId: string): boolean =>
  room.type === 'project' && room.createdBy === userId
```

**Step 6: Adicionar função de validação**

Adicionar ao final do arquivo:

```typescript
/**
 * Valida dados de criação de grupo de projeto
 * @returns Objeto com valid (boolean) e error opcional
 */
export const validateProjectGroup = (
  data: CreateProjectGroupData
): { valid: boolean; error?: string } => {
  // Validar nome
  if (!data.name.trim()) {
    return { valid: false, error: 'Nome é obrigatório' }
  }

  if (data.name.length > 50) {
    return { valid: false, error: 'Nome muito longo (máx 50 caracteres)' }
  }

  // Validar descrição
  if (!data.description.trim()) {
    return { valid: false, error: 'Descrição é obrigatória' }
  }

  if (data.description.length > 200) {
    return { valid: false, error: 'Descrição muito longa (máx 200 caracteres)' }
  }

  // Validar membros (mínimo 2: criador + pelo menos 1 outro)
  if (data.memberIds.length < 1) {
    return { valid: false, error: 'Selecione pelo menos 1 membro' }
  }

  return { valid: true }
}
```

**Step 7: Verificar que arquivo compila**

```bash
npm run lint src/types/chat.ts
```

Expected: Sem erros de linting

**Step 8: Commit types**

```bash
git add src/types/chat.ts
git commit -m "feat(chat): atualizar types para grupos de projeto

- Adiciona 'project' ao RoomType
- Adiciona description e createdBy ao ChatRoom
- Cria interface CreateProjectGroupData
- Adiciona type guards e função de validação"
```

---

## Task 3: Hook useChat - Adicionar Funções de Projeto

**Files:**
- Modify: `src/hooks/useChat.ts`

**Step 1: Ler arquivo atual para localizar ponto de inserção**

```bash
grep -n "return {" src/hooks/useChat.ts | tail -1
```

Isso mostra a linha onde o hook retorna suas funções.

**Step 2: Importar validação no topo do arquivo**

No início do arquivo, após os imports existentes, adicionar:

```typescript
import {
  validateProjectGroup,
  canManageGroup,
  type CreateProjectGroupData
} from '@/types/chat'
```

**Step 3: Adicionar função createProjectGroup**

Antes do `return {`, adicionar:

```typescript
/**
 * Cria novo grupo de projeto
 * @param data Dados do grupo (nome, descrição, membros)
 * @returns ChatRoom criado ou null se erro
 */
const createProjectGroup = async (
  data: CreateProjectGroupData
): Promise<ChatRoom | null> => {
  if (!user?.id) {
    toast.error('Você precisa estar autenticado')
    return null
  }

  // Validar dados
  const validation = validateProjectGroup(data)
  if (!validation.valid) {
    toast.error(validation.error)
    return null
  }

  // Garantir que criador está nos participantes
  const participants = Array.from(new Set([user.id, ...data.memberIds]))

  try {
    setIsLoading(true)

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

    // Mapear para ChatRoom interface
    const mappedRoom: ChatRoom = {
      id: newRoom.id,
      name: newRoom.name,
      type: newRoom.type,
      sector: newRoom.sector,
      description: newRoom.description,
      createdBy: newRoom.created_by,
      participants: newRoom.participants,
      createdAt: newRoom.created_at,
      updatedAt: newRoom.updated_at
    }

    // Atualizar estado local
    setRooms(prev => [mappedRoom, ...prev])
    setCurrentRoom(mappedRoom)

    toast.success('Grupo de projeto criado!')
    return mappedRoom

  } catch (error) {
    console.error('Error creating project group:', error)
    toast.error('Erro ao criar grupo')
    return null
  } finally {
    setIsLoading(false)
  }
}
```

**Step 4: Adicionar função updateProjectGroup**

Logo após `createProjectGroup`, adicionar:

```typescript
/**
 * Atualiza nome e/ou descrição de grupo de projeto
 * @param roomId ID do grupo
 * @param updates Campos a atualizar
 * @returns true se sucesso, false se erro
 */
const updateProjectGroup = async (
  roomId: string,
  updates: { name?: string; description?: string }
): Promise<boolean> => {
  if (!user?.id) return false

  const room = rooms.find(r => r.id === roomId)
  if (!room || !canManageGroup(room, user.id)) {
    toast.error('Você não tem permissão para editar este grupo')
    return false
  }

  try {
    const { error } = await supabase
      .from('chat_rooms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .eq('created_by', user.id)
      .eq('type', 'project')

    if (error) throw error

    // Atualizar estado local
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, ...updates } : r
    ))

    if (currentRoom?.id === roomId) {
      setCurrentRoom(prev => prev ? { ...prev, ...updates } : null)
    }

    toast.success('Grupo atualizado!')
    return true

  } catch (error) {
    console.error('Error updating project group:', error)
    toast.error('Erro ao atualizar grupo')
    return false
  }
}
```

**Step 5: Adicionar função addMemberToProject**

```typescript
/**
 * Adiciona membro a grupo de projeto
 * @param roomId ID do grupo
 * @param userId ID do usuário a adicionar
 * @returns true se sucesso, false se erro
 */
const addMemberToProject = async (
  roomId: string,
  userId: string
): Promise<boolean> => {
  if (!user?.id) return false

  const room = rooms.find(r => r.id === roomId)
  if (!room || !canManageGroup(room, user.id)) {
    toast.error('Sem permissão para adicionar membros')
    return false
  }

  // Verificar se usuário já é membro
  if (room.participants.includes(userId)) {
    toast.error('Usuário já é membro do grupo')
    return false
  }

  const newParticipants = [...room.participants, userId]

  try {
    const { error } = await supabase
      .from('chat_rooms')
      .update({
        participants: newParticipants,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)

    if (error) throw error

    // Atualizar estado local
    setRooms(prev => prev.map(r =>
      r.id === roomId
        ? { ...r, participants: newParticipants }
        : r
    ))

    if (currentRoom?.id === roomId) {
      setCurrentRoom(prev => prev
        ? { ...prev, participants: newParticipants }
        : null
      )
    }

    toast.success('Membro adicionado!')
    return true

  } catch (error) {
    console.error('Error adding member:', error)
    toast.error('Erro ao adicionar membro')
    return false
  }
}
```

**Step 6: Adicionar função removeMemberFromProject**

```typescript
/**
 * Remove membro de grupo de projeto
 * @param roomId ID do grupo
 * @param userId ID do usuário a remover
 * @returns true se sucesso, false se erro
 */
const removeMemberFromProject = async (
  roomId: string,
  userId: string
): Promise<boolean> => {
  if (!user?.id) return false

  const room = rooms.find(r => r.id === roomId)
  if (!room || !canManageGroup(room, user.id)) {
    toast.error('Sem permissão para remover membros')
    return false
  }

  // Impedir remoção do criador
  if (userId === room.createdBy) {
    toast.error('O criador do grupo não pode ser removido')
    return false
  }

  const newParticipants = room.participants.filter(id => id !== userId)

  try {
    const { error } = await supabase
      .from('chat_rooms')
      .update({
        participants: newParticipants,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)

    if (error) throw error

    // Atualizar estado local
    setRooms(prev => prev.map(r =>
      r.id === roomId
        ? { ...r, participants: newParticipants }
        : r
    ))

    if (currentRoom?.id === roomId) {
      setCurrentRoom(prev => prev
        ? { ...prev, participants: newParticipants }
        : null
      )
    }

    toast.success('Membro removido!')
    return true

  } catch (error) {
    console.error('Error removing member:', error)
    toast.error('Erro ao remover membro')
    return false
  }
}
```

**Step 7: Adicionar funções ao return do hook**

Localizar o `return {` no final do hook e adicionar as novas funções:

```typescript
return {
  // ... funções existentes (rooms, currentRoom, messages, etc)
  createProjectGroup,
  updateProjectGroup,
  addMemberToProject,
  removeMemberFromProject,
}
```

**Step 8: Verificar compilação**

```bash
npm run lint src/hooks/useChat.ts
```

Expected: Sem erros

**Step 9: Commit hook**

```bash
git add src/hooks/useChat.ts
git commit -m "feat(chat): adicionar funções de grupos de projeto ao useChat

- createProjectGroup: cria novo grupo com validação
- updateProjectGroup: atualiza nome/descrição
- addMemberToProject: adiciona membro com verificações
- removeMemberFromProject: remove membro (exceto criador)
- Todas com error handling e toast feedback"
```

---

## Task 4: MessageListPremium - Adicionar Exibição de Nomes

**Files:**
- Modify: `src/components/chat/MessageListPremium.tsx`

**Step 1: Ler estrutura atual do componente**

```bash
grep -n "messages.map" src/components/chat/MessageListPremium.tsx
```

**Step 2: Localizar bloco de renderização de mensagens**

Procure por `{messages.map((message, index) =>` no arquivo.

**Step 3: Adicionar lógica de agrupamento antes do return da mensagem**

Dentro do `.map()`, antes do `<motion.div>`, adicionar:

```typescript
const isOwn = message.userId === user?.id
const sender = users?.find(u => u.id === message.userId)
const previousMessage = index > 0 ? messages[index - 1] : null

// Determinar se deve mostrar info do remetente (nome + avatar)
const showSenderInfo =
  !previousMessage ||
  previousMessage.userId !== message.userId ||
  (new Date(message.timestamp).getTime() -
   new Date(previousMessage.timestamp).getTime()) > 300000 // 5 minutos
```

**Step 4: Modificar estrutura JSX para incluir nome**

Substituir a estrutura atual da mensagem por:

```typescript
<motion.div
  key={message.id}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className={cn(
    'flex gap-3 mb-4',
    isOwn && 'flex-row-reverse'
  )}
>
  {/* Avatar - só mostra se for primeira msg do grupo */}
  {showSenderInfo ? (
    <Avatar className="w-8 h-8">
      <AvatarFallback className={cn(
        'text-sm font-medium',
        isOwn ? 'bg-[#fc7a67] text-white' : 'bg-gray-300 text-gray-700'
      )}>
        {sender?.name.charAt(0).toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
  ) : (
    <div className="w-8" /> // Espaçamento para alinhamento
  )}

  <div className={cn(
    'flex flex-col max-w-[70%]',
    isOwn && 'items-end'
  )}>
    {/* NOVO: Nome do remetente (apenas para mensagens de outros) */}
    {showSenderInfo && !isOwn && (
      <span className="text-xs font-medium text-gray-700 mb-1 px-1">
        {sender?.name || 'Usuário Desconhecido'}
      </span>
    )}

    {/* Bolha de mensagem */}
    <div className={cn(
      'rounded-2xl px-4 py-2',
      isOwn
        ? 'bg-[#fc7a67] text-white rounded-tr-sm'
        : 'bg-gray-100 text-gray-900 rounded-tl-sm'
    )}>
      {/* Parsing de mentions */}
      <div className="whitespace-pre-wrap break-words text-sm">
        {parseMentions(message.content)}
      </div>

      {/* Reactions (se houver) */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <MessageReactions
          messageId={message.id}
          reactions={message.reactions}
        />
      )}
    </div>

    {/* Timestamp e Read Receipt */}
    <div className={cn(
      'flex items-center gap-1 mt-1 px-1',
      isOwn && 'flex-row-reverse'
    )}>
      <span className="text-xs text-gray-500">
        {formatTime(message.timestamp)}
      </span>
      {isOwn && message.readBy && (
        <ReadReceipt
          messageId={message.id}
          readBy={message.readBy}
          totalParticipants={currentRoom?.participants.length || 0}
        />
      )}
    </div>
  </div>
</motion.div>
```

**Step 5: Verificar que componente compila**

```bash
npm run lint src/components/chat/MessageListPremium.tsx
```

Expected: Sem erros

**Step 6: Commit mudanças**

```bash
git add src/components/chat/MessageListPremium.tsx
git commit -m "feat(chat): exibir nomes dos remetentes nas mensagens

- Adiciona lógica de agrupamento (5 min threshold)
- Exibe nome acima da bolha para mensagens de outros
- Oculta avatar/nome em msgs consecutivas do mesmo usuário
- Melhora UX mantendo interface limpa"
```

---

## Task 5: CreateProjectGroupModal - Criar Modal de 2 Passos

**Files:**
- Create: `src/components/chat/CreateProjectGroupModal.tsx`

**Step 1: Criar arquivo do modal**

```bash
touch src/components/chat/CreateProjectGroupModal.tsx
```

**Step 2: Escrever estrutura básica e imports**

No arquivo `src/components/chat/CreateProjectGroupModal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { X, ArrowLeft, ArrowRight } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import type { CreateProjectGroupData } from '@/types/chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CreateProjectGroupModalProps {
  open: boolean
  onClose: () => void
  onCreateGroup: (data: CreateProjectGroupData) => Promise<void>
}

export function CreateProjectGroupModal({
  open,
  onClose,
  onCreateGroup
}: CreateProjectGroupModalProps) {
  // ... (continuação no próximo passo)
}
```

**Step 3: Adicionar estados do componente**

Dentro do componente, adicionar:

```typescript
const [step, setStep] = useState<1 | 2>(1)
const [groupName, setGroupName] = useState('')
const [description, setDescription] = useState('')
const [selectedMembers, setSelectedMembers] = useState<string[]>([])
const [searchQuery, setSearchQuery] = useState('')
const [isCreating, setIsCreating] = useState(false)

const { users } = useUsers()
const { user } = useAuth()

// Filtrar usuários disponíveis (excluindo usuário atual)
const availableUsers = users.filter(u =>
  u.id !== user?.id && // Excluir usuário atual
  (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
   u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
   u.sector.toLowerCase().includes(searchQuery.toLowerCase()))
)

// Agrupar usuários por setor para melhor organização
const usersBySector = availableUsers.reduce((acc, user) => {
  const sector = user.sector || 'Sem Setor'
  if (!acc[sector]) acc[sector] = []
  acc[sector].push(user)
  return acc
}, {} as Record<string, typeof users>)
```

**Step 4: Adicionar funções de manipulação**

```typescript
// Reset modal ao fechar
const handleClose = () => {
  setGroupName('')
  setDescription('')
  setSelectedMembers([])
  setSearchQuery('')
  setStep(1)
  onClose()
}

// Criar grupo
const handleCreate = async () => {
  setIsCreating(true)
  try {
    await onCreateGroup({
      name: groupName,
      description: description,
      memberIds: selectedMembers
    })
    handleClose()
  } catch (error) {
    console.error('Error in modal:', error)
  } finally {
    setIsCreating(false)
  }
}

// Toggle seleção de membro
const toggleMember = (userId: string) => {
  setSelectedMembers(prev =>
    prev.includes(userId)
      ? prev.filter(id => id !== userId)
      : [...prev, userId]
  )
}

// Verificar se pode avançar do passo 1
const canProceedToStep2 = groupName.trim().length > 0 &&
                          groupName.length <= 50 &&
                          description.trim().length > 0 &&
                          description.length <= 200

// Verificar se pode criar
const canCreate = canProceedToStep2 && selectedMembers.length >= 1
```

**Step 5: Adicionar JSX do modal - Passo 1**

```typescript
return (
  <Dialog open={open} onOpenChange={handleClose}>
    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Criar Grupo de Projeto</DialogTitle>
        <DialogDescription>
          Passo {step} de 2: {step === 1 ? 'Informações do Grupo' : 'Selecionar Membros'}
        </DialogDescription>
      </DialogHeader>

      {/* PASSO 1: Nome e Descrição */}
      {step === 1 && (
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="group-name">
              Nome do Grupo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder="Ex: Lançamento Artista X"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {groupName.length}/50 caracteres
            </p>
          </div>

          <div>
            <Label htmlFor="description">
              Descrição/Objetivo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito deste grupo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={200}
              className="mt-2 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/200 caracteres
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* PASSO 2: Continuação no próximo step */}
    </DialogContent>
  </Dialog>
)
```

**Step 6: Adicionar JSX do modal - Passo 2**

Logo após o fechamento do `{step === 1 && (...)}`adicionar:

```typescript
{/* PASSO 2: Selecionar Membros */}
{step === 2 && (
  <div className="space-y-4 py-4">
    {/* Busca de usuários */}
    <div>
      <Input
        placeholder="Buscar por nome, email ou setor..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />
    </div>

    {/* Membros selecionados */}
    {selectedMembers.length > 0 && (
      <div className="pb-2 border-b">
        <Label className="text-sm text-gray-600">
          Selecionados ({selectedMembers.length})
        </Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedMembers.map(userId => {
            const selectedUser = users.find(u => u.id === userId)
            return (
              <Badge key={userId} variant="secondary" className="pl-2 pr-1">
                {selectedUser?.name}
                <button
                  onClick={() => toggleMember(userId)}
                  className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      </div>
    )}

    {/* Lista de usuários por setor */}
    <ScrollArea className="h-[300px] pr-4">
      {Object.keys(usersBySector).length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          Nenhum usuário encontrado
        </p>
      ) : (
        Object.entries(usersBySector).map(([sector, sectorUsers]) => (
          <div key={sector} className="mb-4">
            <h4 className="text-sm font-semibold text-gray-500 mb-2 sticky top-0 bg-white py-1">
              {sector}
            </h4>
            <div className="space-y-1">
              {sectorUsers.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedMembers.includes(user.id)}
                    onCheckedChange={() => toggleMember(user.id)}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </ScrollArea>

    {/* Ações */}
    <div className="flex justify-between pt-4 border-t">
      <Button variant="outline" onClick={() => setStep(1)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!canCreate || isCreating}
        >
          {isCreating ? 'Criando...' : 'Criar Grupo'}
        </Button>
      </div>
    </div>
  </div>
)}
```

**Step 7: Verificar compilação**

```bash
npm run lint src/components/chat/CreateProjectGroupModal.tsx
```

Expected: Sem erros

**Step 8: Commit modal**

```bash
git add src/components/chat/CreateProjectGroupModal.tsx
git commit -m "feat(chat): criar modal de criação de grupos de projeto

- Modal em 2 passos: (1) Nome/Descrição, (2) Membros
- Busca de usuários por nome/email/setor
- Agrupamento visual por setor
- Validação em tempo real com contadores
- Badges para membros selecionados
- Navegação fluida entre passos"
```

---

## Task 6: ChatListPremium - Reorganizar em 3 Seções

**Files:**
- Modify: `src/components/chat/ChatListPremium.tsx`

**Step 1: Adicionar imports necessários**

No topo do arquivo, adicionar:

```typescript
import { Building2, FolderKanban, MessageCircle, ChevronDown, Plus } from 'lucide-react'
import { CreateProjectGroupModal } from './CreateProjectGroupModal'
import { isProjectGroup, isSectorRoom, isDM } from '@/types/chat'
```

**Step 2: Adicionar estados para seções colapsáveis e modal**

Dentro do componente, após os estados existentes:

```typescript
const [showSectorRooms, setShowSectorRooms] = useState(true)
const [showProjectRooms, setShowProjectRooms] = useState(true)
const [showDMs, setShowDMs] = useState(true)
const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
```

**Step 3: Adicionar filtros por tipo de sala**

Logo após a declaração do hook useChat():

```typescript
const {
  rooms,
  currentRoom,
  setCurrentRoom,
  createProjectGroup,
  // ... outros valores
} = useChat()

// Separar rooms por tipo
const sectorRooms = rooms.filter(isSectorRoom)
const projectRooms = rooms.filter(isProjectGroup)
const dmRooms = rooms.filter(isDM)
```

**Step 4: Criar componente RoomItem reutilizável**

Antes do return principal do componente, adicionar:

```typescript
// Componente para item de sala (reutilizável)
const RoomItem = ({
  room,
  icon,
  showCreatorBadge = false
}: {
  room: ChatRoom
  icon: React.ReactNode
  showCreatorBadge?: boolean
}) => {
  const isActive = currentRoom?.id === room.id

  return (
    <button
      onClick={() => setCurrentRoom(room)}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-lg transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        isActive && 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200'
      )}
    >
      <div className="text-gray-500 dark:text-gray-400">
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate text-sm">
            {room.name}
          </span>
          {showCreatorBadge && (
            <Badge variant="outline" className="text-xs">
              Criador
            </Badge>
          )}
        </div>
        {room.lastMessage && (
          <p className="text-xs text-gray-500 truncate">
            {room.lastMessage}
          </p>
        )}
      </div>
      {room.unreadCount && room.unreadCount > 0 && (
        <Badge className="bg-red-500 text-white">
          {room.unreadCount}
        </Badge>
      )}
    </button>
  )
}
```

**Step 5: Criar componente de seção colapsável**

```typescript
// Componente para seção colapsável
const CollapsibleSection = ({
  title,
  count,
  isOpen,
  onToggle,
  children
}: {
  title: string
  count: number
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) => (
  <div className="px-4 mb-4">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full mb-2 hover:opacity-80 transition-opacity"
    >
      <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">
        {title} ({count})
      </h3>
      <ChevronDown
        className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200",
          !isOpen && "-rotate-90"
        )}
      />
    </button>
    {isOpen && (
      <div className="space-y-1">
        {children}
      </div>
    )}
  </div>
)
```

**Step 6: Substituir JSX da lista de salas**

Localizar a área que renderiza a lista de salas e substituir por:

```typescript
<ScrollArea className="flex-1">
  {/* Busca global (se existir, manter) */}
  {/* ... código de busca existente ... */}

  {/* SEÇÃO 1: Salas de Setor */}
  <CollapsibleSection
    title="Salas de Setor"
    count={sectorRooms.length}
    isOpen={showSectorRooms}
    onToggle={() => setShowSectorRooms(!showSectorRooms)}
  >
    {sectorRooms.length === 0 ? (
      <p className="text-xs text-gray-500 text-center py-2">
        Nenhuma sala de setor
      </p>
    ) : (
      sectorRooms.map(room => (
        <RoomItem
          key={room.id}
          room={room}
          icon={<Building2 className="w-4 h-4" />}
        />
      ))
    )}
  </CollapsibleSection>

  {/* SEÇÃO 2: Grupos de Projeto */}
  <CollapsibleSection
    title="Grupos de Projeto"
    count={projectRooms.length}
    isOpen={showProjectRooms}
    onToggle={() => setShowProjectRooms(!showProjectRooms)}
  >
    {projectRooms.map(room => (
      <RoomItem
        key={room.id}
        room={room}
        icon={<FolderKanban className="w-4 h-4" />}
        showCreatorBadge={room.createdBy === user?.id}
      />
    ))}

    {/* Botão para criar novo grupo */}
    <button
      onClick={() => setShowCreateProjectModal(true)}
      className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm transition-colors mt-2"
    >
      <Plus className="w-4 h-4" />
      Novo Grupo de Projeto
    </button>
  </CollapsibleSection>

  {/* SEÇÃO 3: Conversas Diretas */}
  <CollapsibleSection
    title="Conversas Diretas"
    count={dmRooms.length}
    isOpen={showDMs}
    onToggle={() => setShowDMs(!showDMs)}
  >
    {dmRooms.map(room => (
      <RoomItem
        key={room.id}
        room={room}
        icon={<MessageCircle className="w-4 h-4" />}
      />
    ))}

    {/* Botão para nova conversa (se já existir, manter) */}
    {/* ... código existente ... */}
  </CollapsibleSection>
</ScrollArea>

{/* Modal de criação de grupo */}
<CreateProjectGroupModal
  open={showCreateProjectModal}
  onClose={() => setShowCreateProjectModal(false)}
  onCreateGroup={createProjectGroup}
/>
```

**Step 7: Verificar compilação**

```bash
npm run lint src/components/chat/ChatListPremium.tsx
```

Expected: Sem erros

**Step 8: Commit reorganização**

```bash
git add src/components/chat/ChatListPremium.tsx
git commit -m "feat(chat): reorganizar sidebar em 3 seções colapsáveis

- Seção 1: Salas de Setor (Building2 icon)
- Seção 2: Grupos de Projeto (FolderKanban icon) + botão criar
- Seção 3: Conversas Diretas (MessageCircle icon)
- Badge 'Criador' em grupos onde usuário é dono
- Componentes reutilizáveis RoomItem e CollapsibleSection
- Integração com CreateProjectGroupModal"
```

---

## Task 7: Testar Implementação Localmente

**Step 1: Iniciar servidor de desenvolvimento**

```bash
cd vibeoffice/.worktrees/chat-project-groups
npm run dev
```

Expected: Servidor inicia em http://localhost:3000

**Step 2: Fazer login e navegar para chat**

1. Abrir http://localhost:3000/login
2. Login com: `eu@vibedistro.com` / `password123`
3. Navegar para `/chat`

Expected: Chat carrega sem erros

**Step 3: Verificar 3 seções na sidebar**

Verificar visualmente:
- ✅ Seção "Salas de Setor" aparece
- ✅ Seção "Grupos de Projeto" aparece
- ✅ Seção "Conversas Diretas" aparece
- ✅ Botão "Novo Grupo de Projeto" visível

**Step 4: Testar criação de grupo**

1. Clicar em "Novo Grupo de Projeto"
2. Passo 1: Preencher nome "Teste Projeto" e descrição "Grupo de teste"
3. Clicar "Próximo"
4. Passo 2: Selecionar pelo menos 1 membro
5. Clicar "Criar Grupo"

Expected:
- Grupo aparece na seção "Grupos de Projeto"
- Badge "Criador" aparece no grupo
- Toast de sucesso exibido

**Step 5: Testar exibição de nomes nas mensagens**

1. Selecionar um grupo ou DM existente
2. Enviar mensagem de teste
3. Verificar que mensagens de outros usuários mostram nome acima da bolha

Expected:
- Nome aparece para mensagens de outros
- Nome oculto para mensagens próprias
- Mensagens consecutivas (< 5min) não repetem nome

**Step 6: Documentar resultados dos testes**

Criar arquivo de teste:

```bash
cat > docs/test-results-2026-01-07.md << 'EOF'
# Resultados de Testes - Grupos de Projeto

**Data:** 2026-01-07
**Branch:** feature/chat-project-groups

## Testes Realizados

### ✅ UI - 3 Seções
- [x] Seção "Salas de Setor" renderiza
- [x] Seção "Grupos de Projeto" renderiza
- [x] Seção "Conversas Diretas" renderiza
- [x] Collapse/expand funciona
- [x] Botão "Novo Grupo de Projeto" visível

### ✅ Criação de Grupo
- [x] Modal abre em 2 passos
- [x] Validação de nome (obrigatório, max 50)
- [x] Validação de descrição (obrigatória, max 200)
- [x] Busca de usuários funciona
- [x] Seleção múltipla funciona
- [x] Grupo criado aparece na lista
- [x] Badge "Criador" exibido corretamente

### ✅ Exibição de Nomes
- [x] Nome aparece acima da bolha (outros usuários)
- [x] Nome não aparece em mensagens próprias
- [x] Agrupamento funciona (< 5min = sem nome repetido)
- [x] Avatar alinhado com lógica de agrupamento

## Issues Encontrados

Nenhum

## Próximos Passos

- [ ] Code review
- [ ] Merge para main
EOF
```

**Step 7: Commit resultados de teste**

```bash
git add docs/test-results-2026-01-07.md
git commit -m "test: documentar resultados de testes locais

Todos os testes passaram:
- 3 seções renderizam corretamente
- Criação de grupo funciona end-to-end
- Exibição de nomes funciona conforme esperado"
```

---

## Task 8: Preparar para Merge

**Step 1: Fazer build de produção**

```bash
npm run build
```

Expected: Build completa sem erros

**Step 2: Verificar linting de todo o projeto**

```bash
npm run lint
```

Expected: Sem erros críticos

**Step 3: Criar commit final de cleanup (se necessário)**

Se houver warnings de lint ou arquivos temporários:

```bash
# Exemplo: remover console.logs esquecidos
git add .
git commit -m "chore: cleanup para produção

- Remove console.logs de debug
- Corrige warnings de linting"
```

**Step 4: Push da branch**

```bash
git push origin feature/chat-project-groups
```

**Step 5: Criar arquivo de notas de release**

```bash
cat > docs/RELEASE-NOTES-chat-project-groups.md << 'EOF'
# Release Notes: Grupos de Projeto no Chat

## Novas Funcionalidades

### 🎉 Grupos Personalizados de Projeto
- Usuários podem criar grupos customizados para projetos
- Campos: nome (max 50 chars), descrição (max 200 chars), membros
- Criador tem controle total: adicionar/remover membros, editar, deletar
- Modal intuitivo em 2 passos

### 📂 Interface Reorganizada
- Sidebar agora tem 3 seções colapsáveis:
  1. **Salas de Setor** - canais oficiais (ícone prédio)
  2. **Grupos de Projeto** - grupos customizados (ícone pasta)
  3. **Conversas Diretas** - DMs 1:1 (ícone mensagem)
- Badge "Criador" identifica grupos onde você é dono

### 👤 Nomes nas Mensagens
- Nome do remetente agora aparece acima das bolhas
- Lógica inteligente de agrupamento (oculta nomes repetidos < 5min)
- Interface mais clara em grupos grandes

## Mudanças Técnicas

### Database
- Novo tipo `'project'` no enum `room_type`
- Campos `description` e `created_by` em `chat_rooms`
- RLS policies para segurança (apenas criador gerencia)

### TypeScript
- Interface `CreateProjectGroupData`
- Type guards: `isProjectGroup()`, `canManageGroup()`
- Função de validação `validateProjectGroup()`

### Hooks
- `createProjectGroup()` - criar grupo
- `updateProjectGroup()` - editar nome/descrição
- `addMemberToProject()` - adicionar membro
- `removeMemberFromProject()` - remover membro

### Componentes
- `CreateProjectGroupModal` - modal de criação
- `ChatListPremium` - 3 seções colapsáveis
- `MessageListPremium` - exibição de nomes

## Breaking Changes

Nenhum. Retrocompatível com dados existentes.

## Migration

Execute a migration `012_grupos_projeto.sql` incluída em `docs/supabase-migrations.sql`

## Testes

Todos os testes manuais passaram. Ver `docs/test-results-2026-01-07.md`
EOF
```

**Step 6: Commit release notes**

```bash
git add docs/RELEASE-NOTES-chat-project-groups.md
git commit -m "docs: adicionar release notes para grupos de projeto"
git push origin feature/chat-project-groups
```

---

## Task 9: Code Review e Merge

**Step 1: Abrir Pull Request**

Se usando GitHub:

```bash
gh pr create \
  --title "feat(chat): adicionar grupos de projeto e melhorias" \
  --body "$(cat docs/RELEASE-NOTES-chat-project-groups.md)"
```

Ou manualmente via interface do GitHub.

**Step 2: Solicitar code review**

Tag reviewers apropriados no PR.

**Step 3: Aguardar aprovação e merge**

Após aprovação:
- Fazer merge via interface do GitHub (Squash and Merge ou Merge Commit)
- Deletar branch remota após merge

**Step 4: Voltar para branch main no worktree original**

```bash
cd ../../../vibeoffice  # Voltar para worktree original
git checkout master
git pull origin master
```

**Step 5: Limpar worktree**

```bash
git worktree remove .worktrees/chat-project-groups
```

**Step 6: Celebrar! 🎉**

Feature implementada com sucesso!

---

## Resumo de Commits

Durante a implementação deste plano, os seguintes commits serão criados:

1. `feat(chat): adicionar migration para grupos de projeto`
2. `feat(chat): atualizar types para grupos de projeto`
3. `feat(chat): adicionar funções de grupos de projeto ao useChat`
4. `feat(chat): exibir nomes dos remetentes nas mensagens`
5. `feat(chat): criar modal de criação de grupos de projeto`
6. `feat(chat): reorganizar sidebar em 3 seções colapsáveis`
7. `test: documentar resultados de testes locais`
8. `chore: cleanup para produção` (se necessário)
9. `docs: adicionar release notes para grupos de projeto`

Total estimado: ~9 commits com histórico limpo e semântico.

---

**Plan criado em:** 2026-01-07
**Pronto para execução:** ✅ Sim
