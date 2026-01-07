'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, X, Filter } from 'lucide-react'
import { Message } from '@/types/chat'
import { useMessageSearch, MessageSearchFilters } from '@/hooks/useMessageSearch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface MessageSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: Message[]
  users: Array<{ id: string; name: string; avatar?: string | null }>
  onMessageClick: (messageId: string) => void
}

export function MessageSearchDialog({
  open,
  onOpenChange,
  messages,
  users,
  onMessageClick,
}: MessageSearchDialogProps) {
  const { searchTerm, setSearchTerm, filters, setFilters, results, resultCount } = useMessageSearch(messages)
  const [showFilters, setShowFilters] = useState(false)

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setFilters({})
      setShowFilters(false)
    }
  }, [open, setSearchTerm, setFilters])

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId)
  }

  const highlightText = (text: string, indices: readonly [number, number][]) => {
    if (!indices || indices.length === 0) {
      return <span>{text}</span>
    }

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    indices.forEach(([start, end], i) => {
      // Add text before highlight
      if (start > lastIndex) {
        parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>)
      }

      // Add highlighted text
      parts.push(
        <mark key={`mark-${i}`} className="bg-[#fc7a67]/30 text-[#fc7a67] font-medium rounded px-0.5">
          {text.slice(start, end + 1)}
        </mark>
      )

      lastIndex = end + 1
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.slice(lastIndex)}</span>)
    }

    return <>{parts}</>
  }

  const handleMessageClick = (messageId: string) => {
    onMessageClick(messageId)
    onOpenChange(false)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-[#0a0a0a] border-[#ff0300]/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Search className="h-5 w-5 text-[#fc7a67]" />
            Buscar Mensagens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar em mensagens..."
              className="pl-10 pr-10 bg-[#1a1a1a] border-[#ff0300]/20 text-white placeholder:text-gray-500 focus-visible:border-[#fc7a67] focus-visible:ring-[#fc7a67]"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-[#fc7a67] hover:bg-[#ff0300]/20"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros {hasActiveFilters && '(ativo)'}
            </Button>
            <span className="text-sm text-gray-500">
              {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#1a1a1a] border border-[#ff0300]/20 rounded-lg">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Remetente</label>
                <Select
                  value={filters.senderId || 'all'}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      senderId: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#0a0a0a] border-[#ff0300]/20 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#ff0300]/20 text-white">
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="w-full border-[#ff0300]/20 text-gray-400 hover:text-white hover:bg-[#ff0300]/10"
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <ScrollArea className="h-[400px] rounded-lg border border-[#ff0300]/20 bg-[#1a1a1a]">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Search className="h-12 w-12 text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Nenhuma mensagem encontrada' : 'Digite para buscar mensagens'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#ff0300]/10">
                {results.map(({ message, matches }) => {
                  const user = getUserById(message.userId)
                  const contentMatch = matches.find((m) => m.key === 'content')
                  const timestamp = new Date(message.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <button
                      key={message.id}
                      onClick={() => handleMessageClick(message.id)}
                      className="w-full p-4 text-left hover:bg-[#ff0300]/5 transition-colors"
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0 border border-[#ff0300]/20">
                          <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
                          <AvatarFallback className="bg-[#fc7a67] text-black text-xs font-bold">
                            {user?.name.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-sm text-white truncate">
                              {user?.name || 'Desconhecido'}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">{timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-300 line-clamp-2">
                            {contentMatch
                              ? highlightText(message.content, contentMatch.indices)
                              : message.content}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
