'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  File as FileIcon,
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
import { toast } from 'sonner'

interface MessageInputPremiumProps {
  onSendMessage: (message: string) => Promise<void> | void
  onSendAttachment?: (file: File) => Promise<void>
  onTypingChange?: (typing: boolean) => void
  disabled?: boolean
}

export function MessageInputPremium({
  onSendMessage,
  onSendAttachment,
  onTypingChange,
  disabled,
}: MessageInputPremiumProps) {
  const [messageInput, setMessageInput] = useState('')
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const { users } = useUsers()

  useEffect(() => () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current)
    const recorder = recorderRef.current
    if (recorder) { recorder.onstop = null; if (recorder.state !== 'inactive') recorder.stop(); recorder.stream.getTracks().forEach(track => track.stop()) }
  }, [])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || busy || disabled) return
    setBusy(true)
    try { await onSendMessage(messageInput); setMessageInput(''); setShowMentionAutocomplete(false); onTypingChange?.(false) }
    catch { toast.error('Não foi possível enviar. Sua mensagem foi mantida para tentar novamente.') }
    finally { setBusy(false) }
  }

  const sendFile = async (file?: File) => {
    if (!file || !onSendAttachment || busy) return
    setBusy(true)
    try { await onSendAttachment(file) } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo') }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; if (cameraRef.current) cameraRef.current.value = '' }
  }

  const toggleRecording = async () => {
    if (recording) { recorderRef.current?.stop(); return }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast.error('Este navegador não suporta gravação de áudio'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      const chunks: BlobPart[] = []
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        if (recordingTimer.current) clearTimeout(recordingTimer.current)
        setRecording(false)
        const mime = recorder.mimeType || 'audio/webm'
        const extension = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm'
        void sendFile(new File(chunks, `audio-${Date.now()}.${extension}`, { type: mime }))
      }
      recorder.start(); setRecording(true)
      recordingTimer.current = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, 120000)
    } catch { toast.error('Não foi possível acessar o microfone. Verifique a permissão do navegador.') }
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
    onTypingChange?.(!!newValue.trim())

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
      <input ref={fileRef} type="file" className="hidden" onChange={event => void sendFile(event.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => void sendFile(event.target.files?.[0])} />
      {recording && <p className="text-sm text-red-400 mb-2">Gravando áudio. Clique em parar para enviar (até 2 minutos).</p>}
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
              disabled={disabled || busy || recording || !onSendAttachment}
              aria-label="Anexar arquivo"
              className="text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-[#ff0300]/20 text-white">
            <DropdownMenuItem onSelect={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click() } }} className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
              <ImageIcon className="h-4 w-4 mr-2" /> Imagem
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { if (fileRef.current) { fileRef.current.accept = ''; fileRef.current.click() } }} className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
              <FileIcon className="h-4 w-4 mr-2" /> Documento
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => cameraRef.current?.click()} className="hover:bg-[#ff0300]/20 focus:bg-[#ff0300]/20">
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
            disabled={disabled || busy || recording}
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
          onClick={() => void toggleRecording()}
          disabled={disabled || busy || !onSendAttachment}
          aria-label={recording ? 'Parar e enviar áudio' : 'Gravar áudio'}
          className="hidden sm:flex text-[#fc7a67] hover:bg-[#ff0300]/20 shrink-0"
        >
          <Mic className="h-5 w-5" />
        </Button>

        <Button
          onClick={handleSendMessage}
          aria-label="Enviar mensagem"
          disabled={!messageInput.trim() || disabled || busy || recording}
          className="bg-[#fc7a67] text-black hover:bg-[#ff0300] disabled:bg-[#1a1a1a] disabled:text-gray-600 rounded-lg px-2 sm:px-3 h-9 sm:h-11 shrink-0 transition-colors shadow-lg shadow-[#fc7a67]/10"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  )
}
