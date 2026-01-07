import { MentionBadge } from '@/components/chat/MentionBadge'

/**
 * Regex para detectar menções no formato @nome ou @nome.sobrenome
 * Captura: @[caracteres alfanuméricos, pontos, hífens, underscores]
 */
const MENTION_REGEX = /@([\w\-.]+)/g

/**
 * Extrai IDs de usuários mencionados do texto
 * @param text - Texto da mensagem
 * @param users - Array de usuários disponíveis
 * @returns Array de user IDs mencionados
 */
export function extractMentionedUserIds(
  text: string,
  users: Array<{ id: string; name: string; email: string }>
): string[] {
  const matches = text.matchAll(MENTION_REGEX)
  const mentionedIds: string[] = []

  for (const match of matches) {
    const mentionText = match[1].toLowerCase()

    // Find user by name or email prefix
    const user = users.find(
      (u) =>
        u.name.toLowerCase().replace(/\s+/g, '.') === mentionText ||
        u.name.toLowerCase().replace(/\s+/g, '-') === mentionText ||
        u.name.toLowerCase().replace(/\s+/g, '') === mentionText ||
        u.email.toLowerCase().split('@')[0] === mentionText
    )

    if (user && !mentionedIds.includes(user.id)) {
      mentionedIds.push(user.id)
    }
  }

  return mentionedIds
}

/**
 * Parse texto e retorna JSX com menções destacadas
 * @param text - Texto da mensagem
 * @param users - Array de usuários para resolver nomes
 * @param currentUserId - ID do usuário atual (para destacar menções próprias)
 * @returns Array de elementos React (string ou MentionBadge)
 */
export function parseMentions(
  text: string,
  users: Array<{ id: string; name: string; email: string }>,
  currentUserId?: string
): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  const matches = Array.from(text.matchAll(MENTION_REGEX))

  if (matches.length === 0) {
    return [text]
  }

  matches.forEach((match, i) => {
    const mentionText = match[1]
    const startIndex = match.index!

    // Add text before mention
    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex))
    }

    // Find mentioned user
    const mentionLower = mentionText.toLowerCase()
    const mentionedUser = users.find(
      (u) =>
        u.name.toLowerCase().replace(/\s+/g, '.') === mentionLower ||
        u.name.toLowerCase().replace(/\s+/g, '-') === mentionLower ||
        u.name.toLowerCase().replace(/\s+/g, '') === mentionLower ||
        u.email.toLowerCase().split('@')[0] === mentionLower
    )

    if (mentionedUser) {
      // Add MentionBadge component
      parts.push(
        <MentionBadge
          key={`mention-${i}`}
          username={mentionedUser.name}
          isCurrentUser={mentionedUser.id === currentUserId}
        />
      )
    } else {
      // If user not found, keep original @mention as text
      parts.push(`@${mentionText}`)
    }

    lastIndex = startIndex + match[0].length
  })

  // Add remaining text after last mention
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

/**
 * Detecta se há um @ sendo digitado no texto e retorna informações para autocomplete
 * @param text - Texto do input
 * @param cursorPosition - Posição do cursor
 * @returns Objeto com informações da menção ou null
 */
export function detectMentionTrigger(
  text: string,
  cursorPosition: number
): { searchTerm: string; startIndex: number } | null {
  // Get text before cursor
  const textBeforeCursor = text.slice(0, cursorPosition)

  // Find last @ before cursor
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex === -1) {
    return null
  }

  // Check if there's a space between @ and cursor (if so, not a mention)
  const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
  if (textAfterAt.includes(' ')) {
    return null
  }

  // Check if @ is at start or preceded by space (valid mention trigger)
  const charBeforeAt = textBeforeCursor[lastAtIndex - 1]
  if (lastAtIndex > 0 && charBeforeAt !== ' ' && charBeforeAt !== '\n') {
    return null
  }

  return {
    searchTerm: textAfterAt,
    startIndex: lastAtIndex,
  }
}
