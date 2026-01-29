'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, isFuture, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Disc3,
  CalendarClock,
  Loader2,
  CheckCircle2,
  Music,
  BarChart3,
  Building2,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Release, ReleaseType } from '@/types/releases'
import type { Sector } from '@/types/auth'

interface ReleasesDashboardProps {
  releases: Release[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  in_progress: 'Em Andamento',
  released: 'Lancado',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  released: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const TYPE_LABELS: Record<ReleaseType, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
}

export function ReleasesDashboard({ releases }: ReleasesDashboardProps) {
  const stats = useMemo(() => {
    const total = releases.length
    const scheduled = releases.filter(r => r.status === 'scheduled').length
    const inProgress = releases.filter(r => r.status === 'in_progress').length
    const released = releases.filter(r => r.status === 'released').length
    return { total, scheduled, inProgress, released }
  }, [releases])

  const upcoming = useMemo(() => {
    return releases
      .filter(r => r.releaseDate && isFuture(r.releaseDate))
      .sort((a, b) => (a.releaseDate!.getTime() - b.releaseDate!.getTime()))
      .slice(0, 8)
  }, [releases])

  const recent = useMemo(() => {
    return [...releases]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
  }, [releases])

  const byType = useMemo(() => {
    const counts: Record<ReleaseType, number> = { single: 0, ep: 0, album: 0 }
    releases.forEach(r => { counts[r.releaseType]++ })
    return counts
  }, [releases])

  const bySector = useMemo(() => {
    const counts: Record<string, number> = {}
    releases.forEach(r => {
      const s = r.sector || 'Sem setor'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [releases])

  const metricCards = [
    {
      label: 'Total de Lancamentos',
      value: stats.total,
      icon: Disc3,
      gradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Programados',
      value: stats.scheduled,
      icon: CalendarClock,
      gradient: 'from-yellow-500/10 to-yellow-600/5',
      border: 'border-yellow-500/20',
      iconColor: 'text-yellow-400',
    },
    {
      label: 'Em Andamento',
      value: stats.inProgress,
      icon: Loader2,
      gradient: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-500/20',
      iconColor: 'text-orange-400',
    },
    {
      label: 'Lancados',
      value: stats.released,
      icon: CheckCircle2,
      gradient: 'from-green-500/10 to-green-600/5',
      border: 'border-green-500/20',
      iconColor: 'text-green-400',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 md:space-y-6"
    >
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {metricCards.map((card) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            className={`bg-gradient-to-br ${card.gradient} border ${card.border} rounded-xl p-4 md:p-5`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                <p className="text-2xl md:text-3xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center ${card.iconColor}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main section: Upcoming + By Type */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        {/* Upcoming Releases */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-[#fc7a67]" />
            <h3 className="text-sm font-semibold text-white">Proximos Lancamentos</h3>
            <Badge className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white text-[10px] px-1.5 py-0 ml-auto">
              {upcoming.length}
            </Badge>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">Nenhum lancamento agendado</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111] hover:bg-[#151515] transition-colors border border-transparent hover:border-[#2a2a2a]"
                >
                  {release.coverUrl ? (
                    <img
                      src={release.coverUrl}
                      alt={release.title}
                      className="w-9 h-9 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{release.title}</p>
                    <p className="text-xs text-gray-500 truncate">{release.artist}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {release.releaseDate
                        ? format(release.releaseDate, 'dd MMM', { locale: ptBR })
                        : '-'}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[release.status]}`}
                    >
                      {STATUS_LABELS[release.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* By Type */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#fc7a67]" />
            <h3 className="text-sm font-semibold text-white">Por Tipo</h3>
          </div>
          <div className="space-y-4">
            {(['single', 'ep', 'album'] as ReleaseType[]).map((type) => {
              const count = byType[type]
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-300">{TYPE_LABELS[type]}</span>
                    <span className="text-xs text-gray-500 font-mono">{count}</span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-[#fc7a67] to-[#ff0300] rounded-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Bottom section: Recent + By Sector */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {/* Recent */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#fc7a67]" />
            <h3 className="text-sm font-semibold text-white">Lancamentos Recentes</h3>
          </div>
          {recent.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">Nenhum lancamento ainda</p>
          ) : (
            <div className="space-y-2">
              {recent.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#111] border border-transparent hover:border-[#2a2a2a] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{release.title}</p>
                    <p className="text-xs text-gray-500">{release.artist}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {format(release.createdAt, "dd/MM HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* By Sector */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[#fc7a67]" />
            <h3 className="text-sm font-semibold text-white">Por Setor</h3>
          </div>
          {bySector.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">Nenhum dado</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {bySector.map(([sector, count]) => (
                <div
                  key={sector}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#111] border border-[#1a1a1a]"
                >
                  <span className="text-sm text-gray-300 truncate">{sector}</span>
                  <span className="text-sm font-bold text-white ml-2">{count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
