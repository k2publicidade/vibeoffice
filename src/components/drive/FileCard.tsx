'use client'

import { useState, DragEvent } from 'react'
import { DriveItem } from '@/types/drive'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  File,
  Folder,
  Download,
  Trash2,
  Share2,
  Image,
  FileText,
  FileSpreadsheet,
  Video,
  Music,
  FileCode,
  FileArchive,
  Presentation,
  Users,
  Globe,
  MoreVertical,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface FileCardProps {
  item: DriveItem
  onDoubleClick?: () => void
  onDelete?: () => void
  onDownload?: () => void
  onShare?: () => void
  onMoveItem?: (itemId: string, targetFolderId: string) => void
  // dnd-kit props
  isDragging?: boolean
  isOver?: boolean
  dragOverlay?: boolean
}

// Função para obter informações visuais do arquivo
const getFileInfo = (mimeType?: string, isFolder?: boolean) => {
  if (isFolder) {
    return {
      icon: Folder,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      gradient: 'from-amber-400/20 to-orange-400/5'
    }
  }

  if (!mimeType) return { icon: File, color: 'text-slate-400', bgColor: 'bg-slate-500/10', gradient: 'from-slate-500/10 to-slate-600/5' }

  if (mimeType.startsWith('image/')) {
    return { icon: Image, color: 'text-purple-400', bgColor: 'bg-purple-500/10', gradient: 'from-purple-500/20 to-indigo-500/5' }
  }
  if (mimeType.startsWith('video/')) {
    return { icon: Video, color: 'text-rose-400', bgColor: 'bg-rose-500/10', gradient: 'from-rose-500/20 to-pink-500/5' }
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: Music, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', gradient: 'from-emerald-500/20 to-teal-500/5' }
  }
  if (mimeType.includes('pdf')) {
    return { icon: FileText, color: 'text-red-400', bgColor: 'bg-red-500/10', gradient: 'from-red-500/20 to-orange-500/5' }
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return { icon: FileSpreadsheet, color: 'text-green-400', bgColor: 'bg-green-500/10', gradient: 'from-green-500/20 to-emerald-500/5' }
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: Presentation, color: 'text-orange-400', bgColor: 'bg-orange-500/10', gradient: 'from-orange-500/20 to-amber-500/5' }
  }
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) {
    return { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/10', gradient: 'from-blue-500/20 to-cyan-500/5' }
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) {
    return { icon: FileArchive, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', gradient: 'from-yellow-500/20 to-amber-500/5' }
  }
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) {
    return { icon: FileCode, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', gradient: 'from-cyan-500/20 to-sky-500/5' }
  }

  return { icon: File, color: 'text-slate-400', bgColor: 'bg-slate-500/10', gradient: 'from-slate-500/10 to-gray-500/5' }
}

export function FileCard({
  item,
  onDoubleClick,
  onDelete,
  onDownload,
  onShare,
  onMoveItem,
  isDragging,
  isOver,
  dragOverlay,
}: FileCardProps) {
  const isFolder = item.type === 'folder'
  const updatedAt = new Date(item.updatedAt)
  const timeAgo = formatDistanceToNow(updatedAt, { addSuffix: true, locale: ptBR })
  const fileInfo = getFileInfo(item.mimeType, isFolder)
  const FileIcon = fileInfo.icon
  // --- Drag & Drop removido em favor do dnd-kit implementado no DriveGrid ---

  const getFileSize = () => {
    if (!item.size) return null
    const bytes = item.size
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card
      className={cn(
        "cursor-pointer group relative overflow-hidden border-0 bg-zinc-900/40 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:bg-zinc-800/60 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1",
        "ring-1 ring-white/5 hover:ring-white/10",
        isDragging && "opacity-40 scale-95 ring-2 ring-blue-400/40",
        isOver && isFolder && "ring-2 ring-amber-400/60 bg-amber-400/10 scale-[1.05] shadow-lg shadow-amber-400/20",
        dragOverlay && "cursor-grabbing shadow-2xl scale-105 rotate-3 z-50 bg-zinc-800"
      )}
      onDoubleClick={onDoubleClick}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        fileInfo.gradient
      )} />

      {/* Drop zone indicator */}
      {isOver && isFolder && !dragOverlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-amber-400/15 backdrop-blur-[2px] rounded-lg border-2 border-dashed border-amber-400/60">
          <span className="text-amber-300 text-xs font-semibold px-3 py-1.5 bg-black/60 rounded-full">
            Solte aqui
          </span>
        </div>
      )}

      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={cn(
            'p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg shadow-black/10',
            fileInfo.bgColor
          )}>
            <FileIcon className={cn('h-6 w-6', fileInfo.color)} strokeWidth={isFolder ? 2 : 1.5} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800">
              {!isFolder && (
                <>
                  <DropdownMenuItem onClick={onDownload} className="gap-2 text-zinc-300 focus:text-white focus:bg-white/10 cursor-pointer">
                    <Download className="h-4 w-4" /> Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShare} className="gap-2 text-zinc-300 focus:text-white focus:bg-white/10 cursor-pointer">
                    <Share2 className="h-4 w-4" /> Compartilhar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <h3 className="font-medium text-zinc-200 text-sm truncate pr-2 group-hover:text-white transition-colors">
            {item.name}
          </h3>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{isFolder ? 'Pasta' : getFileSize()}</span>
            {(item.isPublic || (item.sharedWith && item.sharedWith.length > 0)) && (
              <div className="flex items-center gap-1.5" title={item.isPublic ? "Público" : "Compartilhado"}>
                {item.isPublic ? (
                  <Globe className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Users className="h-3 w-3 text-blue-500" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
            {timeAgo}
          </span>

          {item.sector && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 border-0"
            >
              {item.sector}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
