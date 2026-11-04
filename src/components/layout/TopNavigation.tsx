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
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 px-3 sm:px-4 lg:px-6 xl:flex-nowrap">
        {/* Left: Logo + Mobile Menu */}
        <div className="flex min-h-16 min-w-0 items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-11 min-w-11"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo - Yanger */}
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="VIBEDISTRO Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        <NavBar items={navItems} className="order-last hidden w-full py-2 lg:block xl:order-none xl:grow xl:basis-0 xl:w-auto" />

        {/* Right: User Info */}
        <div className="flex min-h-16 min-w-0 items-center gap-2 md:gap-4">
          <OnlineUsersPopover />
          <NotificationBell />
          {user && (
            <div className="hidden min-w-0 items-center gap-2 sm:flex md:gap-3">
              {/* User info text */}
              <div className="min-w-0 text-right">
                <p className="max-w-36 truncate text-sm font-semibold leading-tight">{user.name}</p>
                <p className="max-w-36 truncate text-xs text-muted-foreground">
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
