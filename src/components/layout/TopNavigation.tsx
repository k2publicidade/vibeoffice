'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'
import { NavBar } from '@/components/ui/tubelight-navbar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { OnlineUsersPopover } from './OnlineUsersPopover'
import { getNavForRole } from '@/lib/navigation'

interface TopNavigationProps {
  onMenuClick?: () => void
}

export function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const { user } = useAuth()

  // Itens vêm de lib/navigation.ts (fonte única).
  // NavBar (tubelight) usa shape { name, url, icon } — mapeamos aqui.
  const navItems = getNavForRole(user?.role).map((item) => ({
    name: item.label,
    url: item.href,
    icon: item.icon,
  }))

  const getUserRole = () => {
    if (user?.role === 'Admin') return 'Administrador'
    if (user?.role === 'Gerente') return 'Gerente'
    return user?.sector || 'Colaborador'
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Left: Logo + Mobile Menu */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-11 min-w-11"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo - Yanger */}
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Yanger Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Center: Navigation - Hidden on mobile and tablet */}
        <NavBar items={navItems} className="hidden md:block pb-[15px]" />

        {/* Right: User Info */}
        <div className="flex items-center gap-2 md:gap-4">
          <OnlineUsersPopover />
          <NotificationBell />
          {user && (
            <div className="hidden sm:flex items-center gap-2 md:gap-3">
              {/* User info text */}
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getUserRole()}
                </p>
              </div>

              {/* Avatar with dropdown */}
              <UserMenu />
            </div>
          )}

          {/* Mobile: Only avatar */}
          <div className="sm:hidden">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
