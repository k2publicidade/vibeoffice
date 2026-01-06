'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { mockUsers } from '@/lib/mock-data'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MessageListPremiumProps {
  messages: Message[]
  typingUsers?: string[]
  isLoading?: boolean
}

export function MessageListPremium({
  messages,
  typingUsers = [],
  isLoading,
}: MessageListPremiumProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#fc7a67]" />
          <p className="text-sm text-gray-500 font-medium">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <p className="text-gray-500 text-sm font-medium">
          Nenhuma mensagem ainda. Comece a conversa!
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-4 lg:p-6 bg-black">
      <div className="space-y-4">
        <AnimatePresence>
          {messages.map((message) => {
            const isOwn = message.userId === 'current-user'
            const user = mockUsers.find(u => u.id === message.userId)

            const timeString = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex gap-3",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8 shrink-0 border-2 border-[#ff0300]/20">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-[#fc7a67] text-black text-[10px] font-bold">
                      {user?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={cn(
                  "max-w-[80%] lg:max-w-[70%] space-y-1",
                  isOwn ? "items-end" : "items-start"
                )}>
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl relative",
                      isOwn
                        ? "bg-[#fc7a67] text-black rounded-tr-none"
                        : "bg-[#1a1a1a] text-white border border-[#ff0300]/20 rounded-tl-none"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-500 opacity-70 block px-1">
                    {timeString}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-end"
          >
            <Avatar className="w-8 h-8 border-2 border-[#ff0300]/20">
              <AvatarFallback className="bg-[#fc7a67] text-black text-xs font-bold">
                ...
              </AvatarFallback>
            </Avatar>
            <div className="bg-[#1a1a1a] border border-[#ff0300]/20 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[#fc7a67] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
import { cn } from '@/lib/utils'
