import {
  LayoutDashboard,
  MessageCircle,
  Folder,
  ListTodo,
  Ticket,
  GraduationCap,
  Calendar,
  Image,
  Disc3,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'

export type UserRole = 'Admin' | 'Gerente' | 'Colaborador'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  roles?: UserRole[] // undefined = visível a todos os roles
}

/**
 * Fonte única dos itens de navegação principal.
 *
 * Consumido por:
 *  - `src/components/layout/TopNavigation.tsx` (desktop, via NavBar tubelight)
 *  - `src/components/layout/MobileDrawer.tsx` (mobile)
 *
 * Ordem é a ordem visual. Para gating por role use o campo `roles` —
 * `undefined` significa visível a todos.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', href: '/', icon: LayoutDashboard },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Agenda', href: '/calendar', icon: Calendar },
  { label: 'Tarefas', href: '/tasks', icon: ListTodo },
  { label: 'Solicitações', href: '/tickets', icon: Ticket },
  { label: 'Capas', href: '/vibecanvas', icon: Image },
  { label: 'Drive', href: '/drive', icon: Folder },
  { label: 'Cursos', href: '/courses', icon: GraduationCap },
  { label: 'Estúdio', href: '/studio', icon: Disc3 },
  { label: 'Lançamentos', href: '/lancamentos', icon: Megaphone },
]

/**
 * Filtra `NAV_ITEMS` aplicando gating por role.
 * Se `role` for nulo/undefined retorna apenas itens públicos (sem `roles`).
 */
export function getNavForRole(role?: string | null): NavItem[] {
  if (!role) return NAV_ITEMS.filter((item) => !item.roles)
  return NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role as UserRole),
  )
}
