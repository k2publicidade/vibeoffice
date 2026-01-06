'use client'

import { useState, useMemo } from 'react'
import { Search, MessageSquarePlus, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  sector: string
  role: string
}

interface NewConversationModalProps {
  open: boolean
  onClose: () => void
  onSelectUser: (user: User) => void
  users: User[]
  existingDMUserIds: string[]
}

export function NewConversationModal({
  open,
  onClose,
  onSelectUser,
  users,
  existingDMUserIds,
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter users based on search and exclude existing DMs
  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => user.id !== 'current-user')
      .filter((user) => !existingDMUserIds.includes(user.id))
      .filter((user) =>
        searchQuery
          ? user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.sector.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
  }, [users, searchQuery, existingDMUserIds])

  // Group users by sector
  const groupedUsers = useMemo(() => {
    const groups: Record<string, User[]> = {}
    filteredUsers.forEach((user) => {
      if (!groups[user.sector]) {
        groups[user.sector] = []
      }
      groups[user.sector].push(user)
    })
    return groups
  }, [filteredUsers])

  const handleSelect = (user: User) => {
    onSelectUser(user)
    setSearchQuery('')
    onClose()
  }

  const handleClose = () => {
    setSearchQuery('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-black border-[#262626] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-[#262626]">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#fc7a67] to-[#ff0300]">
              <MessageSquarePlus className="h-5 w-5 text-white" />
            </div>
            Nova Conversa
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1">
            Selecione um colega para iniciar uma conversa
          </p>
        </DialogHeader>

        <div className="p-4 border-b border-[#262626]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou setor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-[#262626] text-white placeholder:text-gray-500 focus:border-[#fc7a67] focus:ring-[#fc7a67]"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-4 space-y-4">
            <AnimatePresence mode="wait">
              {Object.keys(groupedUsers).length > 0 ? (
                Object.entries(groupedUsers).map(([sector, sectorUsers]) => (
                  <motion.div
                    key={sector}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
                      {sector}
                    </h4>
                    <div className="space-y-1">
                      {sectorUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelect(user)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1a1a1a] border border-transparent hover:border-[#fc7a67]/30 transition-all group"
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-[#262626] group-hover:border-[#fc7a67]/50 transition-colors">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white font-bold">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium text-white group-hover:text-[#fc7a67] transition-colors truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.role}</p>
                          </div>
                          <MessageSquarePlus className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 group-hover:text-[#fc7a67] transition-all" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="p-4 rounded-full bg-[#1a1a1a] mb-4">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="text-white font-medium mb-1">
                    {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? 'Tente buscar por outro nome ou setor'
                      : 'Você já tem conversas com todos os colegas'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
