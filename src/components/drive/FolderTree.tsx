'use client'

import React from 'react'
import { DriveItem } from '@/types/drive'
import { Button } from '@/components/ui/button'
import { Folder, ChevronRight, Home, ChevronDown, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
}: FolderTreeProps) {
  // Get only root folders
  const rootFolders = items.filter(
    (item) => item.type === 'folder' && (item.parentId === null || item.parentId === undefined)
  ).sort((a, b) => a.name.localeCompare(b.name))

  // Get subfolders for a given parent
  const getSubfolders = (parentId: string | null): DriveItem[] => {
    return items
      .filter((item) => item.type === 'folder' && item.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
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
    const hasChildren = subfolders.length > 0

    // Auto expand if active or child is active (simplification: just keeping it simple for now)

    return (
      <div className="select-none">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 h-9 text-sm font-normal mb-0.5 relative transition-all duration-200",
            isActive
              ? "bg-[#fc7a67]/10 text-[#fc7a67] hover:bg-[#fc7a67]/20 hover:text-[#fc7a67]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {isActive && (
            <motion.div
              layoutId="active-indicator"
              className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#fc7a67] rounded-r-full"
            />
          )}

          <div
            className={cn("p-0.5 rounded-md transition-colors", isActive ? "text-[#fc7a67]" : "text-zinc-500")}
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }
            }}
          >
            {hasChildren ? (
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform duration-200', {
                  'rotate-90': isExpanded,
                })}
              />
            ) : (
              <div className="w-3.5" />
            )}
          </div>

          {isActive ? <FolderOpen className="h-4 w-4 fill-current opacity-20" /> : <Folder className="h-4 w-4" />}
          <span className="truncate">{folder.name}</span>
        </Button>

        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {subfolders.map((subfolder) => (
                <FolderItem
                  key={subfolder.id}
                  folder={subfolder}
                  level={level + 1}
                  isActive={currentFolderId === subfolder.id}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="px-4 py-3 mb-2">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Navegação
        </h3>
      </div>

      <div className="px-2 space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 h-9 text-sm font-normal relative",
            currentFolderId === null
              ? "bg-[#fc7a67]/10 text-[#fc7a67] hover:bg-[#fc7a67]/20 hover:text-[#fc7a67]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          )}
          onClick={() => onFolderSelect(null)}
        >
          {currentFolderId === null && (
            <motion.div
              layoutId="active-indicator"
              className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#fc7a67] rounded-r-full"
            />
          )}
          <Home className="h-4 w-4 ml-6" />
          <span>Meu Drive</span>
        </Button>

        <div className="py-2" />

        {rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isActive={currentFolderId === folder.id}
          />
        ))}
      </div>
    </div>
  )
}
