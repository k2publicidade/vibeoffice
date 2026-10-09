import { parseMentions } from '@/lib/mentions'

export function MessageText({ content, users, currentUserId }: { content: string; users: { id: string; name: string; email: string }[]; currentUserId?: string }) {
  const parts = content.split(/(https:\/\/[^\s<>]+)/g)
  return <>{parts.map((part, index) => {
    if (part.startsWith('https://')) {
      try { const url = new URL(part); if (!url.username && !url.password) return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a> } catch { /* Invalid links stay as text. */ }
    }
    return <span key={index}>{parseMentions(part, users, currentUserId)}</span>
  })}</>
}
