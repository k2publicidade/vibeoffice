'use client'

import React, { useState } from 'react'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { NotificationToast } from '@/components/notifications/NotificationToast'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <TopNavigation onMenuClick={() => setDrawerOpen(true)} />

      {/* Mobile Drawer (sidebar) */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* Notification Toast */}
      <NotificationToast />
    </div>
  )
}
