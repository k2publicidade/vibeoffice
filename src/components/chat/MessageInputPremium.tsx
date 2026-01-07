'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  File,
  Camera,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmojiPickerPopover } from './EmojiPickerPopover'
import { MentionAutocomplete } from './MentionAutocomplete'
import { detectMentionTrigger } from '@/lib/mentions'
import { useUsers } from '@/hooks/useUsers'

interface MessageInputPremiumProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export function MessageInputPremium({
  onSendMessage,
  disabled,
}: MessageInputPremiumProps) {
  const [messageInput, setMessageInput] = useState('')
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { users } = useUsers()

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput)
      setMessageInput('')
      setShowMentionAutocomplete(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Don't submit if autocomplete is open (let it handle navigation)
    if (showMentionAutocomplete && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0

    setMessageInput(newValue)

    // Detect mention trigger
    const mentionTrigger = detectMentionTrigger(newValue, cursorPosition)

    if (mentionTrigger) {
      setShowMentionAutocomplete(true)
      setMentionSearch(mentionTrigger.searchTerm)
      setMentionStartIndex(mentionTrigger.startIndex)
    } else {
      setShowMentionAutocomplete(false)
    }
  }

  const handleMentionSelect = (user: { id: string; name: string; email: string }) => {
    // Replace @searchTerm with @username
    const beforeMention = messageInput.slice(0, mentionStartIndex)
    const afterMention = messageInput.slice(inputRef.current?.selectionStart || messageInput.length)
    const username = user.name.replace(/\s+/g, '.')
    const newMessage = `${beforeMention}@${username} ${afterMention}`

    setMessageInput(newMessage)
    setShowMentionAutocomplete(false)

    // Focus input and move cursor after mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionStartIndex + username.length + 2 // +2 for @ and space
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  return (
    <div className="p-2 sm:p-4 border-t border-[#ff0300]/20 bg-[#0a0a0a]">
      <div className="flex items-end gap-1 sm:gap-2">
        <div className="hidden sm:flex">
          <EmojiPickerPopover
            onEmojiSelect={handleEmojiSelect}
            className="text-[#fc7a67] hover:bg-[#ff0300]/20"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-[#ff0300]/20 text-white">
            <DropdownMenuItem className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
              <ImageIcon className="h-4 w-4 mr-2" /> Imagem
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
              <File className="h-4 w-4 mr-2" /> Documento
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
              <Camera className="h-4 w-4 mr-2" /> Câmera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            className="w-full bg-[#1a1a1a] border-[#ff0300]/20 text-white placeholder:text-gray-500 focus-visible:border-[#fc7a67] focus-visible:ring-[#fc7a67] h-9 sm:h-11 px-2 sm:px-4 text-sm sm:text-base"
            disabled={disabled}
          />

          {/* Mention Autocomplete */}
          {showMentionAutocomplete && users && users.length > 0 && (
            <MentionAutocomplete
              users={users}
              searchTerm={mentionSearch}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentionAutocomplete(false)}
            />
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
        >
          <Mic className="h-5 w-5" />
        </Button>

        <Button
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || disabled}
          className="bg-[#fc7a67] text-black hover:bg-[#ff0300] disabled:bg-[#1a1a1a] disabled:text-gray-600 rounded-lg px-2 sm:px-3 h-9 sm:h-11 shrink-0 transition-colors shadow-lg shadow-[#fc7a67]/10"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  )
}
