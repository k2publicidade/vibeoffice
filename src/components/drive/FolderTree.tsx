'use client'

import React from 'react'
import { DriveItem } from '@/types/drive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Folder, ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderTreeProps {
  items: DriveItem[]
  currentFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  breadcrumbs: DriveItem[]
}

export function FolderTree({
  items,
  currentFolderId,
  onFolderSelect,
  breadcrumbs,
}: FolderTreeProps) {
  // Get only root folders
  const rootFolders = items.filter(
    (item) => item.type === 'folder' && !item.parentId
  )

  // Get subfolders for a given parent
  const getSubfolders = (parentId: string | null): DriveItem[] => {
    return items.filter((item) => item.type === 'folder' && item.parentId === parentId)
  }

  const FolderItem = ({
    folder,
    level = 0,
    isActive,
  }: {
    folder: DriveItem
    level?: number
    isActive: boolean
  }) => {
    const subfolders = getSubfolders(folder.id)
    const [isExpanded, setIsExpanded] = React.useState(false)

    return (
      <div>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {subfolders.length > 0 && (
            <ChevronRight
              className={cn('h-3 w-3 shrink-0 transition-transform', {
                'rotate-90': isExpanded,
              })}
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            />
          )}
          {!subfolders.length && <div className="w-3" />}
          <Folder className="h-3 w-3" />
          <span className="truncate">{folder.name}</span>
        </Button>

        {isExpanded && subfolders.length > 0 && (
          <div>
            {subfolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                level={level + 1}
                isActive={currentFolderId === subfolder.id}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Pastas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Root */}
        <Button
          variant={currentFolderId === null ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => onFolderSelect(null)}
        >
          <Home className="h-3 w-3" />
          <span>Raiz</span>
        </Button>

        {/* Root folders */}
        {rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isActive={currentFolderId === folder.id}
          />
        ))}
      </CardContent>
    </Card>
  )
}
