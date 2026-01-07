'use client'

import { Search, Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserMenu } from './UserMenu'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="border-b border-border bg-background sticky top-0 z-40 h-16">
      <div className="flex h-full items-center justify-between gap-2 sm:gap-4 px-4 md:px-6">
        {/* Left Section - Menu e Search */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden min-h-11 min-w-11"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar..."
              className="border-0 bg-transparent outline-none placeholder-muted-foreground text-sm"
            />
          </div>

          {/* Search Icon (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden min-h-11 min-w-11"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Right Section - Notifications, Theme, User */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative min-h-11 min-w-11"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="sm:hidden border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar..."
              className="border-0 bg-transparent outline-none placeholder-muted-foreground text-sm"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  )
}
