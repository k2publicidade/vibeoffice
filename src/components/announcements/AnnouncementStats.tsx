'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, CheckCircle2, XCircle, FileText, Clock } from 'lucide-react'
import type { AnnouncementWithAuthor } from '@/types/announcements'

interface AnnouncementStatsProps {
  announcements: AnnouncementWithAuthor[]
}

export function AnnouncementStats({ announcements }: AnnouncementStatsProps) {
  const now = new Date().toISOString()

  // Calcular estatísticas
  const stats = {
    total: announcements.length,
    active: announcements.filter(a => a.active && a.expires_at > now).length,
    expired: announcements.filter(a => a.active && a.expires_at <= now).length,
    archived: announcements.filter(a => !a.active).length,
    expiringToday: announcements.filter(a => {
      if (!a.active || a.expires_at <= now) return false
      const expiresAt = new Date(a.expires_at)
      const today = new Date()
      return (
        expiresAt.getDate() === today.getDate() &&
        expiresAt.getMonth() === today.getMonth() &&
        expiresAt.getFullYear() === today.getFullYear()
      )
    }).length,
  }

  const statCards = [
    {
      title: 'Total de Avisos',
      value: stats.total,
      icon: Megaphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Ativos',
      value: stats.active,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Expirados',
      value: stats.expired,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Arquivados',
      value: stats.archived,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      title: 'Expiram Hoje',
      value: stats.expiringToday,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
