'use client'

import { DriveItem } from '@/types/drive'
import { FileCard } from './FileCard'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface FileListProps {
  items: DriveItem[]
  currentFolderId: string | null
  onFolderOpen: (folderId: string) => void
  onFileClick?: (fileId: string) => void
  onFileDelete?: (fileId: string) => void
  onFileDownload?: (fileId: string) => void
  onFileShare?: (fileId: string) => void
}

export function FileList({
  items,
  currentFolderId,
  onFolderOpen,
  onFileClick,
  onFileDelete,
  onFileDownload,
  onFileShare,
}: FileListProps) {
  // Get items in current folder
  const currentItems = items.filter((item) => item.parentId === currentFolderId)

  // Separate folders and files
  const folders = currentItems.filter((item) => item.type === 'folder')
  const files = currentItems.filter((item) => item.type === 'file')

  // Sort by name
  const sortedFolders = [...folders].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name))
  const allItems = [...sortedFolders, ...sortedFiles]

  if (allItems.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Pasta vazia</h3>
            <p className="text-sm text-muted-foreground">
              Nenhum arquivo ou pasta encontrado neste local
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {allItems.map((item) => (
        <FileCard
          key={item.id}
          item={item}
          onDoubleClick={() => {
            if (item.type === 'folder') {
              onFolderOpen(item.id)
            } else {
              onFileClick?.(item.id)
            }
          }}
          onDelete={() => onFileDelete?.(item.id)}
          onDownload={() => onFileDownload?.(item.id)}
          onShare={() => onFileShare?.(item.id)}
        />
      ))}
    </div>
  )
}
