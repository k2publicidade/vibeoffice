/**
 * Dashboard Layout - Server Component
 * Usa DashboardShell client component para gerenciar estado do sidebar
 */

import { DashboardShell } from '@/components/layout/DashboardShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
