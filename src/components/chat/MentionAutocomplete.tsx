'use client'

import { useEffect, useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'

interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  sector?: string | null
}

interface MentionAutocompleteProps {
  users: User[]
  searchTerm: string
  onSelect: (user: User) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export function MentionAutocomplete({
  users,
  searchTerm,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // Filter users based on search term
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5) // Limit to 5 results

  // Reset selected index when search term changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredUsers.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % filteredUsers.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length)
          break
        case 'Enter':
          e.preventDefault()
          if (filteredUsers[selectedIndex]) {
            onSelect(filteredUsers[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredUsers, selectedIndex, onSelect, onClose])

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

  if (filteredUsers.length === 0) {
    return null
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 w-72 rounded-lg border border-[#ff0300]/20 bg-[#1a1a1a] shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{
        bottom: position?.top ? undefined : '100%',
        left: position?.left || 0,
        marginBottom: position?.top ? undefined : '8px',
      }}
    >
      <Command className="bg-transparent">
        <CommandList className="max-h-60">
          <CommandEmpty className="py-6 text-center text-sm text-gray-500">
            Nenhum usuário encontrado
          </CommandEmpty>
          <CommandGroup>
            {filteredUsers.map((user, index) => (
              <CommandItem
                key={user.id}
                onSelect={() => onSelect(user)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-[#fc7a67]/20 text-white'
                    : 'text-gray-300 hover:bg-[#ff0300]/10'
                }`}
              >
                <Avatar className="h-8 w-8 border border-[#ff0300]/20">
                  <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                  <AvatarFallback className="bg-[#fc7a67] text-black text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.sector || user.email}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}
