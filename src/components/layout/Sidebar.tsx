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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navigation = [
  {
    name: 'Início',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Comunicados',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    name: 'Arquivos',
    href: '/drive',
    icon: HardDrive,
  },
  {
    name: 'Tarefas',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Solicitações',
    href: '/tickets',
    icon: Ticket,
  },
  {
    name: 'Cursos',
    href: '/courses',
    icon: BookOpen,
  },
  {
    name: 'Agenda',
    href: '/calendar',
    icon: Calendar,
  },
]

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-background transition-transform duration-200 md:relative md:z-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Yanger Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            // Para a rota raiz, só é ativa se o pathname for exatamente '/'
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-3 py-4 text-xs text-muted-foreground">
          <p className="text-center">© 2026 Yanger</p>
        </div>
      </aside>
    </>
  )
}
