'use client'

import { useState } from 'react'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void
  trigger?: React.ReactNode
  className?: string
}

export function EmojiPickerPopover({
  onEmojiSelect,
  trigger,
  className = '',
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
    setOpen(false) // Close popover after selection
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-9 w-9 text-muted-foreground hover:text-foreground ${className}`}
            title="Adicionar emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-full p-0 border-0 bg-transparent shadow-none"
        sideOffset={8}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={Theme.DARK}
          searchPlaceHolder="Buscar emoji..."
          previewConfig={{ showPreview: false }}
          width="100%"
          height={400}
        />
      </PopoverContent>
    </Popover>
  )
}
