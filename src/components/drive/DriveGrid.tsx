'use client'

import { DriveItem } from '@/types/drive'
import { FileCard } from './FileCard'
import { Card } from '@/components/ui/card'
import { FolderOpen, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface DriveGridProps {
    items: DriveItem[]
    currentFolderId: string | null
    onFolderOpen: (folderId: string) => void
    onFileClick?: (fileId: string) => void
    onFileDelete?: (fileId: string) => void
    onFileDownload?: (fileId: string) => void
    onFileShare?: (fileId: string) => void
    onMoveItem?: (itemId: string, targetFolderId: string) => void
    onUpload?: () => void
    disableFiltering?: boolean
}

export function DriveGrid({
    items,
    currentFolderId,
    onFolderOpen,
    onFileClick,
    onFileDelete,
    onFileDownload,
    onFileShare,
    onMoveItem,
    onUpload,
    disableFiltering = false
}: DriveGridProps) {
    // Filter items for current folder if filtering is enabled
    const currentItems = disableFiltering ? items : items.filter((item) => {
        if (currentFolderId === null) {
            return item.parentId === null || item.parentId === undefined
        }
        return item.parentId === currentFolderId
    })

    // Separate and sort
    const folders = currentItems
        .filter((item) => item.type === 'folder')
        .sort((a, b) => a.name.localeCompare(b.name))

    const files = currentItems
        .filter((item) => item.type === 'file')
        .sort((a, b) => a.name.localeCompare(b.name))

    const allItems = [...folders, ...files]

    if (allItems.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="h-full flex flex-col items-center justify-center p-12"
            >
                <div className="w-full max-w-md border-2 border-dashed border-zinc-800 rounded-3xl p-12 bg-zinc-900/20 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                        className="mx-auto w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 shadow-inner"
                    >
                        <FolderOpen className="h-10 w-10 text-zinc-600" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">Pasta Vazia</h3>
                    <p className="text-zinc-500 mb-8">
                        Esta pasta está esperando por seus arquivos sensacionais.
                    </p>
                    <Button
                        onClick={onUpload}
                        className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] hover:opacity-90 text-white rounded-full px-8"
                    >
                        Fazer Upload
                    </Button>
                </div>
            </motion.div>
        )
    }

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 25
            } as any
        }
    }

    return (
        <motion.div
            className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
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
                        initial="hidden"
                        animate="visible"
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
                            onMoveItem={onMoveItem}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    )
}
