'use client'

import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Calendar, Music, Disc3, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Release } from '@/types/releases'

const RELEASE_TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Álbum',
}

const RELEASE_TYPE_COLORS: Record<string, string> = {
  single: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ep: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  album: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

interface ReleaseCardProps {
  release: Release
  onClick?: () => void
  onDelete?: () => void
}

export function ReleaseCard({ release, onClick, onDelete }: ReleaseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: release.id,
    data: { type: 'release', release },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative bg-[#111111] border border-[#2a2a2a] rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#151515]',
        isDragging && 'opacity-40 shadow-xl scale-105'
      )}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Cover + Info */}
      <div className="flex gap-3">
        {/* Mini cover */}
        <div className="w-12 h-12 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {release.coverUrl ? (
            <img src={release.coverUrl} alt={release.title} className="w-full h-full object-cover" />
          ) : (
            <Disc3 className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-semibold truncate">{release.title}</h3>
          <p className="text-gray-500 text-xs truncate flex items-center gap-1">
            <Music className="w-3 h-3" />
            {release.artist}
          </p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#1a1a1a]">
        <Badge className={cn('text-[10px] px-1.5 py-0 border', RELEASE_TYPE_COLORS[release.releaseType])}>
          {RELEASE_TYPE_LABELS[release.releaseType]}
        </Badge>

        {release.releaseDate && (
          <span className="text-gray-600 text-[10px] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(release.releaseDate, 'dd MMM yyyy', { locale: ptBR })}
          </span>
        )}
      </div>

      {/* Genre tag */}
      {release.genre && (
        <div className="mt-2">
          <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">
            {release.genre}
          </span>
        </div>
      )}
    </div>
  )
}
