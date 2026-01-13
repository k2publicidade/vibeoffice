'use client'

import { DriveItem } from '@/types/drive'
import { FileCard } from './FileCard'
import { Card } from '@/components/ui/card'
import { FolderOpen, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const currentItems = items.filter((item) => {
    if (currentFolderId === null) {
      return item.parentId === null || item.parentId === undefined
    }
    return item.parentId === currentFolderId
  })

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-12 border-dashed border-2 border-[#262626] bg-[#0a0a0a]/50">
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-[#fc7a67]/10 flex items-center justify-center"
            >
              <FolderOpen className="h-8 w-8 text-[#fc7a67]" />
            </motion.div>
            <div>
              <h3 className="font-semibold text-white mb-2">Esta pasta está vazia</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Faça upload de arquivos ou crie novas pastas para organizar seus documentos
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Upload className="h-3 w-3" />
                <span>Arraste arquivos aqui ou use o botão Upload</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Animation variants for stagger effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25
      }
    }
  } as const

  return (
    <motion.div
      className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {allItems.map((item) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            layout
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          >
            <FileCard
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
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
