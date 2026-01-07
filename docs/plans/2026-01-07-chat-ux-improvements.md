# Chat UX Improvements - Design Document

**Data:** 2026-01-07
**Status:** Approved
**Escopo:** Implementar funcionalidades avançadas de UX no chat (emojis, reações, menções, busca, status de leitura, arquivar)

---

## Visão Geral

Transformar o chat básico em uma experiência completa e moderna de mensageria, similar a Discord/Slack/WhatsApp, com foco em usabilidade e feedback visual.

## Features a Implementar

1. ✅ **Emoji Picker** - Popover completo com categorias no input
2. ✅ **Reações nas Mensagens** - Hover com botões rápidos, contador, tooltip
3. ✅ **Arquivar Conversas** - Opção no menu para DMs
4. ✅ **Menções** - @usuário com autocomplete e notificações
5. ✅ **Busca de Mensagens** - Modal com filtros e fuzzy search
6. ✅ **Status de Leitura** - Checkmarks (✓ enviada, ✓✓ entregue, ✓✓ azul lida)

---

## Arquitetura e Bibliotecas

### Dependências Necessárias

```bash
npm install emoji-picker-react
# Fuse.js já está no projeto
```

### Estrutura de Dados

**types/chat.ts - Adicionar aos tipos existentes:**

```typescript
interface Message {
  // ... campos existentes (id, content, userId, roomId, timestamp, etc)
  reactions?: MessageReaction[]
  mentionedUsers?: string[] // IDs dos usuários mencionados
  readBy?: string[] // IDs dos usuários que leram
}

interface MessageReaction {
  emoji: string // Unicode emoji (e.g., "👍")
  userId: string
  timestamp: Date
}

interface ChatRoom {
  // ... campos existentes (id, name, type, participants, etc)
  isArchived?: boolean // Por usuário (via user_chat_preferences)
  archivedAt?: Date
}

interface UserChatPreferences {
  userId: string
  roomId: string
  isArchived: boolean
  archivedAt?: Date
}
```

### Banco de Dados (Supabase)

**Migration: `019_chat_ux_features.sql`**

```sql
-- Adicionar colunas à tabela messages
ALTER TABLE messages
ADD COLUMN reactions JSONB DEFAULT '[]',
ADD COLUMN mentioned_users TEXT[] DEFAULT '{}',
ADD COLUMN read_by TEXT[] DEFAULT '{}';

-- Criar tabela de preferências de chat por usuário
CREATE TABLE user_chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

-- Índices para performance
CREATE INDEX idx_messages_mentioned_users ON messages USING GIN(mentioned_users);
CREATE INDEX idx_messages_read_by ON messages USING GIN(read_by);
CREATE INDEX idx_user_chat_prefs_user_room ON user_chat_preferences(user_id, room_id);

-- RLS policies
ALTER TABLE user_chat_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat preferences"
ON user_chat_preferences
FOR ALL
USING (auth.uid() = user_id);
```

---

## 1. Emoji Picker e Reações

### 1.1 Emoji Picker (Input)

**Componente:** `src/components/chat/EmojiPickerPopover.tsx`

```typescript
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPickerPopover({ onEmojiSelect }: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
    setOpen(false) // Fecha após selecionar
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-[#fc7a67] hover:bg-[#ff0300]/20">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-[#ff0300]/20 bg-[#1a1a1a]"
        align="start"
        side="top"
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme="dark"
          skinTonesDisabled={false}
          searchPlaceholder="Buscar emoji..."
          previewConfig={{ showPreview: false }}
          width={350}
          height={400}
        />
      </PopoverContent>
    </Popover>
  )
}
```

**Integração no MessageInputPremium:**
- Substituir botão Smile estático por `<EmojiPickerPopover />`
- `onEmojiSelect` insere emoji na posição do cursor no input
- Usar `ref` no Input para controlar posição do cursor

### 1.2 Reações nas Mensagens

**Componente:** `src/components/chat/MessageReactions.tsx`

**UI Structure:**
```
┌─────────────────────────────┐
│ João Silva - 10:30 AM       │
│ Ótimo trabalho!             │
│                             │
│ [👍 3] [❤️ 2] [😂 1]       │ ← Badges clicáveis
│ Hover: "João, Maria e você" │
└─────────────────────────────┘
   ^ Hover na mensagem: barra aparece
   [👍] [❤️] [😂] [😮] [😢] [➕]
```

**Features:**
- Hover na mensagem → barra de 5 emojis populares + botão ➕
- Botão ➕ abre mesmo `EmojiPickerPopover`
- Clicar emoji → adiciona reação (ou remove se já reagiu)
- Badge mostra: `emoji + contador`
- Hover na badge → tooltip com nomes dos usuários
- Limite: 1 reação por usuário por emoji (pode ter múltiplos emojis diferentes)

**Estado:**
```typescript
interface MessageReactionsProps {
  messageId: string
  reactions: MessageReaction[]
  currentUserId: string
  onAddReaction: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
}
```

**Lógica:**
- Agrupa reações por emoji: `{ '👍': ['user1', 'user2'], '❤️': ['user3'] }`
- Toggle: se `currentUserId` já está no array, remove; senão, adiciona
- Optimistic UI: atualiza local primeiro, sync com Supabase depois
- Realtime: subscription em `messages` detecta mudanças em `reactions` JSONB

---

## 2. Menções com Autocomplete

### Componente: `src/components/chat/MentionAutocomplete.tsx`

**Trigger:** Detectar `@` no input + mostrar dropdown

**Features:**
- Busca em tempo real nos participantes da sala
- Navegação por teclado (↑↓ Enter Esc)
- Clique ou Enter seleciona usuário
- Insere no input: `@João Silva` (display) + metadata oculta

**Formato de salvamento:**
```typescript
// Display no input: "Olá @João Silva, tudo bem?"
// Salvo no banco: "Olá @{user-123|João Silva}, tudo bem?"
// Renderização: parse e converte em badges azuis
```

**Parser de Menções:**
```typescript
function parseMentions(text: string): React.ReactNode[] {
  const mentionRegex = /@\{([^|]+)\|([^}]+)\}/g
  const parts = []
  let lastIndex = 0

  text.replace(mentionRegex, (match, userId, userName, offset) => {
    // Adiciona texto antes da menção
    if (offset > lastIndex) {
      parts.push(text.slice(lastIndex, offset))
    }

    // Adiciona badge de menção
    parts.push(
      <MentionBadge key={offset} userId={userId} userName={userName} />
    )

    lastIndex = offset + match.length
    return match
  })

  // Adiciona texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
```

**MentionBadge Component:**
- Badge azul clicável: `@João Silva`
- Hover → mini card (nome, setor, status online)
- Clique → abre perfil ou inicia DM

**Notificações:**
- Ao enviar mensagem com menção → `EventBus.emit('user_mentioned')`
- Payload: `{ mentionedUserId, messageId, roomId, fromUser }`
- Badge na sidebar da sala/DM

---

## 3. Busca de Mensagens

### Componente: `src/components/chat/MessageSearchDialog.tsx`

**Ativação:**
- Botão Search no header abre dialog
- Atalho: `Ctrl+F` / `Cmd+F` (intercepta dentro do chat)

**Interface:**
```typescript
interface SearchFilters {
  query: string
  userId?: string // Filtrar por usuário específico
  dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  customDateRange?: { from: Date; to: Date }
  type?: 'text' | 'attachments' | 'links'
}
```

**Busca Fuzzy com Fuse.js:**
```typescript
const fuse = new Fuse(messages, {
  keys: ['content', 'user.name'],
  threshold: 0.3, // Tolera typos
  includeMatches: true, // Para highlight
})

const results = fuse.search(searchQuery)
```

**Features:**
- Input com autofoco e debounce (300ms)
- Filtros: dropdown de usuários, date picker, tipo de conteúdo
- Resultados paginados: 20 por vez, scroll infinito
- Highlight do termo buscado (negrito amarelo)
- Clique no resultado:
  1. Fecha dialog
  2. Scrolla para mensagem
  3. Highlight temporário (3s com animação pulse)

**Performance:**
- Busca no cliente se <500 mensagens carregadas
- Se sala muito grande: Full Text Search no Supabase
  ```sql
  SELECT * FROM messages
  WHERE room_id = $1
  AND to_tsvector('portuguese', content) @@ plainto_tsquery('portuguese', $2)
  ORDER BY timestamp DESC
  LIMIT 20
  ```

---

## 4. Status de Leitura (Read Receipts)

### Visual

```
Você: Olá, tudo bem?        ✓✓  ← Azul (lida)
Você: Reunião às 15h         ✓  ← Cinza (enviada/entregue)
Maria: Ok, vou participar        ← Sem checkmark (mensagem de outros)
```

### Estados

| Estado | Visual | Condição |
|--------|--------|----------|
| Enviada | ✓ cinza | Salva no banco, ainda não entregue |
| Entregue | ✓✓ cinza | Outros usuários carregaram a sala |
| Lida | ✓✓ azul | Usuário scrollou até a mensagem (IntersectionObserver) |

### Implementação

**1. Marcar como lida (IntersectionObserver):**
```typescript
const messageRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !message.readBy?.includes(currentUserId)) {
        markAsRead(message.id, currentUserId)
      }
    },
    { threshold: 0.5 } // 50% visível
  )

  if (messageRef.current) {
    observer.observe(messageRef.current)
  }

  return () => observer.disconnect()
}, [message.id, currentUserId])
```

**2. Batch update (performance):**
- Acumula IDs de mensagens visíveis em um buffer
- Envia update a cada 2 segundos ou quando buffer tem 10+ mensagens
- Query: `UPDATE messages SET read_by = array_append(read_by, $userId) WHERE id = ANY($messageIds)`

**3. Componente ReadReceipt:**
```typescript
function ReadReceipt({ message, currentUserId }) {
  if (message.userId !== currentUserId) return null // Apenas suas mensagens

  const isRead = message.readBy?.length > 0
  const isDelivered = true // TODO: lógica de entrega

  return (
    <div className="flex items-center gap-0.5 text-xs">
      {isRead ? (
        <CheckCheck className="h-3 w-3 text-blue-500" />
      ) : isDelivered ? (
        <CheckCheck className="h-3 w-3 text-gray-500" />
      ) : (
        <Check className="h-3 w-3 text-gray-500" />
      )}
    </div>
  )
}
```

**Privacidade:**
- Apenas em DMs (salas públicas não mostram)
- Setting no perfil: "Desabilitar confirmações de leitura"
  - Se desabilitado: não marca mensagens como lida + não vê status de suas próprias

---

## 5. Arquivar Conversas

### UI

**Dropdown do header (MoreVertical):**
```typescript
<DropdownMenuItem onClick={() => archiveChat(room.id)}>
  <Archive className="h-4 w-4 mr-2" />
  Arquivar conversa
</DropdownMenuItem>
```

**ChatListPremium - Filtro no topo:**
```
┌────────────────────────┐
│ [Todas] | [Arquivadas 3]│
├────────────────────────┤
│ 📦 João Silva          │ ← Badge de arquivada
│    Última mensagem...  │
└────────────────────────┘
```

### Comportamento

1. **Arquivar:**
   - DM some da lista "Todas"
   - Aparece em "Arquivadas" com badge 📦
   - Salva em `user_chat_preferences`: `{ userId, roomId, isArchived: true }`

2. **Desarquivar:**
   - Dropdown → "Desarquivar conversa"
   - Volta para lista "Todas"

3. **Auto-desarquivar:**
   - Receber nova mensagem em DM arquivada → desarquiva automaticamente
   - Hook: `useEffect` que monitora novas mensagens em rooms arquivadas

4. **Apenas DMs:**
   - Salas públicas não podem ser arquivadas
   - Dropdown só mostra opção se `room.type === 'dm'`

### Banco de Dados

```typescript
// Hook: useArchiveChat.ts
async function archiveChat(roomId: string) {
  const { error } = await supabase
    .from('user_chat_preferences')
    .upsert({
      user_id: currentUserId,
      room_id: roomId,
      is_archived: true,
      archived_at: new Date().toISOString(),
    })

  if (error) throw error
}
```

---

## Componentes a Criar

### Novos Componentes

1. `src/components/chat/EmojiPickerPopover.tsx` - Picker completo
2. `src/components/chat/MessageReactions.tsx` - Reações nas mensagens
3. `src/components/chat/ReactionBar.tsx` - Barra de hover com emojis rápidos
4. `src/components/chat/MentionAutocomplete.tsx` - Dropdown de menções
5. `src/components/chat/MentionBadge.tsx` - Badge de menção renderizada
6. `src/components/chat/MessageSearchDialog.tsx` - Modal de busca
7. `src/components/chat/ReadReceipt.tsx` - Checkmarks de leitura

### Componentes a Modificar

1. `src/components/chat/MessageInputPremium.tsx` - Integrar EmojiPicker, detectar @
2. `src/components/chat/MessageListPremium.tsx` - Adicionar reações, parse menções
3. `src/components/chat/ChatRoomPremium.tsx` - Botão Search funcional, arquivar no dropdown
4. `src/components/chat/ChatListPremium.tsx` - Filtro Todas/Arquivadas, badge

### Hooks a Criar

1. `src/hooks/useMessageReactions.ts` - CRUD de reações
2. `src/hooks/useMentions.ts` - Parse e autocomplete
3. `src/hooks/useMessageSearch.ts` - Busca com Fuse.js
4. `src/hooks/useReadReceipts.ts` - Marcar como lida
5. `src/hooks/useArchiveChat.ts` - Arquivar/desarquivar

---

## Ordem de Implementação Recomendada

### Fase 1 - Emojis e Reações (2-3h)
1. Instalar `emoji-picker-react`
2. Criar `EmojiPickerPopover.tsx`
3. Integrar em `MessageInputPremium`
4. Criar `MessageReactions.tsx` e `ReactionBar.tsx`
5. Migration: adicionar coluna `reactions` JSONB
6. Hook `useMessageReactions` com Supabase
7. Realtime subscriptions para reações

### Fase 2 - Menções (2-3h)
1. Criar `MentionAutocomplete.tsx`
2. Detectar @ no input + mostrar dropdown
3. Parser de menções (regex)
4. `MentionBadge.tsx` para renderizar
5. Migration: adicionar `mentioned_users` TEXT[]
6. EventBus para notificações
7. Badge na sidebar

### Fase 3 - Busca (1-2h)
1. Criar `MessageSearchDialog.tsx`
2. Integrar Fuse.js
3. Filtros e paginação
4. Highlight de resultados
5. Atalho Ctrl+F

### Fase 4 - Status de Leitura (1-2h)
1. Migration: adicionar `read_by` TEXT[]
2. IntersectionObserver para detecção
3. `ReadReceipt.tsx` component
4. Batch updates
5. Setting de privacidade

### Fase 5 - Arquivar (1h)
1. Migration: `user_chat_preferences` table
2. Hook `useArchiveChat`
3. Dropdown com opção
4. Filtro na ChatList
5. Auto-desarquivar em nova mensagem

**Total estimado:** 7-11 horas de implementação

---

## Testes Recomendados

### Testes Manuais

1. **Emojis:**
   - [ ] Picker abre e fecha corretamente
   - [ ] Emoji insere na posição do cursor
   - [ ] Skin tone funciona
   - [ ] Reações aparecem em tempo real para outros usuários
   - [ ] Tooltip de reações mostra nomes corretos

2. **Menções:**
   - [ ] @ abre autocomplete
   - [ ] Busca filtra corretamente
   - [ ] Navegação por teclado funciona
   - [ ] Badge renderiza corretamente
   - [ ] Notificação enviada ao mencionado

3. **Busca:**
   - [ ] Ctrl+F abre modal
   - [ ] Fuzzy search tolera typos
   - [ ] Filtros funcionam
   - [ ] Clique no resultado scrolla para mensagem
   - [ ] Highlight temporário funciona

4. **Status de Leitura:**
   - [ ] ✓ aparece ao enviar
   - [ ] ✓✓ cinza quando entregue
   - [ ] ✓✓ azul quando lido
   - [ ] IntersectionObserver detecta corretamente

5. **Arquivar:**
   - [ ] DM some ao arquivar
   - [ ] Aparece em "Arquivadas"
   - [ ] Desarquiva ao receber mensagem
   - [ ] Badge visual correto

---

## Considerações Finais

### Performance
- Realtime subscriptions podem aumentar carga → monitorar uso de conexões
- Batch updates para read receipts reduzem queries
- Busca client-side é rápida para <500 mensagens

### UX
- Animações suaves (Framer Motion) para transições
- Feedback imediato (optimistic UI)
- Tooltips e placeholders claros
- Acessibilidade (ARIA labels, navegação por teclado)

### Escalabilidade
- Reações em JSONB permite estrutura flexível
- Full Text Search no Postgres para salas grandes
- Índices GIN para arrays (`mentioned_users`, `read_by`)

---

**Documento aprovado em:** 2026-01-07
**Próximo passo:** Implementação ou criação de worktree isolado
