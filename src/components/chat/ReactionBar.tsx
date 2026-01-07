'use client'

import { useEffect, useRef } from 'react'

interface ReactionBarProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

const POPULAR_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥']

export function ReactionBar({ onEmojiSelect, onClose }: ReactionBarProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 flex items-center gap-1 bg-[#1a1a1a] border border-[#ff0300]/20 rounded-full px-2 py-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
    >
      {POPULAR_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onEmojiSelect(emoji)}
          className="text-xl hover:scale-125 transition-transform duration-150 p-1 rounded-full hover:bg-[#ff0300]/10"
          title={`Reagir com ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
