'use client'

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
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface FileCardProps {
  item: DriveItem
  onDoubleClick?: () => void
  onDelete?: () => void
  onDownload?: () => void
  onShare?: () => void
}

// Função para obter informações visuais do arquivo
const getFileInfo = (mimeType?: string, isFolder?: boolean) => {
  if (isFolder) {
    return { icon: Folder, color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
  }

  if (!mimeType) return { icon: File, color: 'text-gray-400', bgColor: 'bg-gray-500/20' }

  if (mimeType.startsWith('image/')) {
    return { icon: Image, color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
  }
  if (mimeType.startsWith('video/')) {
    return { icon: Video, color: 'text-pink-400', bgColor: 'bg-pink-500/20' }
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: Music, color: 'text-green-400', bgColor: 'bg-green-500/20' }
  }
  if (mimeType.includes('pdf')) {
    return { icon: FileText, color: 'text-red-400', bgColor: 'bg-red-500/20' }
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return { icon: FileSpreadsheet, color: 'text-green-400', bgColor: 'bg-green-500/20' }
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: Presentation, color: 'text-orange-400', bgColor: 'bg-orange-500/20' }
  }
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) {
    return { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) {
    return { icon: FileArchive, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
  }
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) {
    return { icon: FileCode, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' }
  }

  return { icon: File, color: 'text-gray-400', bgColor: 'bg-gray-500/20' }
}

export function FileCard({
  item,
  onDoubleClick,
  onDelete,
  onDownload,
  onShare,
}: FileCardProps) {
  const isFolder = item.type === 'folder'
  const updatedAt = new Date(item.updatedAt)
  const timeAgo = formatDistanceToNow(updatedAt, { addSuffix: true, locale: ptBR })
  const fileInfo = getFileInfo(item.mimeType, isFolder)
  const FileIcon = fileInfo.icon

  const isShared = (item.sharedWith && item.sharedWith.length > 0) || item.isPublic

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
        "cursor-pointer transition-all duration-200 group border-[#262626] bg-black/50",
        "hover:border-[#404040] hover:bg-[#0a0a0a] hover:shadow-lg hover:shadow-black/20",
        "hover:scale-[1.02]"
      )}
      onDoubleClick={onDoubleClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Icon and name */}
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110',
              fileInfo.bgColor
            )}>
              <FileIcon className={cn('h-6 w-6', fileInfo.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white line-clamp-2 text-sm">
                {item.name}
              </h3>
              {/* Share indicator */}
              {isShared && (
                <div className="flex items-center gap-1 mt-1">
                  {item.isPublic ? (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <Globe className="h-3 w-3" />
                      <span>Público</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <Users className="h-3 w-3" />
                      <span>{item.sharedWith?.length} pessoa(s)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-1.5">
            {!isFolder && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{getFileSize()}</span>
                <span className="text-[10px] font-medium bg-[#1a1a1a] px-2 py-0.5 rounded text-gray-300 uppercase">
                  {item.name.split('.').pop() || 'FILE'}
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500">{timeAgo}</div>
          </div>

          {/* Sector badge */}
          {item.sector && (
            <Badge
              variant="secondary"
              className="w-fit text-[10px] bg-[#1a1a1a] text-gray-300 border-[#262626]"
            >
              {item.sector}
            </Badge>
          )}

          {/* Actions - Always visible but subtle */}
          <div className="flex gap-1 pt-1 border-t border-[#1a1a1a] opacity-60 group-hover:opacity-100 transition-opacity">
            {!isFolder && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-[#fc7a67] hover:bg-[#fc7a67]/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownload?.()
                  }}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onShare?.()
                  }}
                  title="Compartilhar"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/10 ml-auto"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.()
              }}
              title="Deletar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
