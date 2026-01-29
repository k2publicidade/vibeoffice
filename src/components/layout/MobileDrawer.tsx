'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  HardDrive,
  CheckSquare,
  Ticket,
  BookOpen,
  Calendar,
  X,
  Mic2,
  Disc3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { href: '/', label: 'Início', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/drive', label: 'Arquivos', icon: HardDrive },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/tickets', label: 'Solicitações', icon: Ticket },
  { href: '/courses', label: 'Cursos', icon: BookOpen },
  { href: '/calendar', label: 'Agenda', icon: Calendar },
  { href: '/studio', label: 'Estúdio', icon: Mic2 },
  { href: '/lancamentos', label: 'Lançamentos', icon: Disc3 },
]

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-card shadow-xl md:hidden animate-slide-in-left">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4 gap-2">
          <img
            src="/logo.png"
            alt="Yanger Logo"
            className="h-8 w-auto object-contain"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar menu"
            className="min-h-11 min-w-11"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors min-h-12',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground text-center">
            Yanger Intranet
          </p>
        </div>
      </div>
    </>
  )
}
