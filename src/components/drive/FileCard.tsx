'use client'

import { DriveItem } from '@/types/drive'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { File, Folder, Download, Trash2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FileCardProps {
  item: DriveItem
  onDoubleClick?: () => void
  onDelete?: () => void
  onDownload?: () => void
  onShare?: () => void
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

  const getFileIcon = () => {
    if (isFolder) {
      return <Folder className="h-8 w-8 text-blue-500" />
    }
    return <File className="h-8 w-8 text-gray-500" />
  }

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
      className="cursor-pointer transition-all hover:shadow-md group"
      onDoubleClick={onDoubleClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Icon and name */}
          <div className="flex items-start gap-3">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2">
                {item.name}
              </h3>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {!isFolder && (
              <div className="flex items-center justify-between">
                <span>{getFileSize()}</span>
                {item.type === 'file' && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {item.name.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                )}
              </div>
            )}
            <div>Atualizado {timeAgo}</div>
          </div>

          {/* Sector badge */}
          {item.sector && (
            <Badge variant="secondary" className="w-fit text-xs">
              {item.sector}
            </Badge>
          )}

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isFolder && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
