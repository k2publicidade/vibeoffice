'use client'

interface MentionBadgeProps {
  username: string
  isCurrentUser?: boolean
}

export function MentionBadge({ username, isCurrentUser }: MentionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium text-xs transition-colors ${
        isCurrentUser
          ? 'bg-[#fc7a67]/30 text-[#fc7a67] border border-[#fc7a67]/40'
          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
      }`}
    >
      @{username}
    </span>
  )
}
