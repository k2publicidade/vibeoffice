'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send,
  Paperclip,
  Smile,
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

interface MessageInputPremiumProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export function MessageInputPremium({
  onSendMessage,
  disabled,
}: MessageInputPremiumProps) {
  const [messageInput, setMessageInput] = useState('')

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput)
      setMessageInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="p-4 border-t border-[#ff0300]/20 bg-[#0a0a0a]">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
        >
          <Smile className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
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

        <Input
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-[#1a1a1a] border-[#ff0300]/20 text-white placeholder:text-gray-500 focus-visible:border-[#fc7a67] focus-visible:ring-[#fc7a67] h-11 px-4"
          disabled={disabled}
        />

        <Button
          variant="ghost"
          size="icon"
          className="text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
        >
          <Mic className="h-5 w-5" />
        </Button>

        <Button
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || disabled}
          className="bg-[#fc7a67] text-black hover:bg-[#ff0300] disabled:bg-[#1a1a1a] disabled:text-gray-600 rounded-lg px-3 h-11 shrink-0 transition-colors shadow-lg shadow-[#fc7a67]/10"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
