'use client'

import { DriveItem } from '@/types/drive'
import { FileCard } from './FileCard'
import { FolderOpen, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { useState } from 'react'
import { createPortal } from 'react-dom'

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

// Wrapper for draggable items
const DraggableDriveItem = ({ item, children }: { item: DriveItem, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: item
    })

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className="outline-none touch-none">
            <div style={{ opacity: isDragging ? 0.4 : 1 }}>
                {children}
            </div>
        </div>
    )
}

// Wrapper for droppable folders (allows dropping files into folders)
const DroppableFolderItem = ({
    item,
    children,
    onClick
}: {
    item: DriveItem,
    children: (isOver: boolean) => React.ReactNode,
    onClick: () => void
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: item.id,
        data: item,
        disabled: item.type !== 'folder'
    })

    return (
        <div ref={setNodeRef} onClick={onClick}>
            {children(isOver)}
        </div>
    )
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
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeItem, setActiveItem] = useState<DriveItem | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag, prevents accidental drags on click
            },
        })
    )

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

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)
        const item = allItems.find(i => i.id === active.id)
        if (item) setActiveItem(item)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        setActiveId(null)
        setActiveItem(null)

        if (!over) return

        const activeItemId = active.id as string
        const overId = over.id as string

        // If dropped on itself or nothing changed
        if (activeItemId === overId) return

        // Find the dropped-over item
        const overItem = allItems.find(i => i.id === overId)

        // Only move if dropped over a folder
        if (overItem && overItem.type === 'folder' && onMoveItem) {
            onMoveItem(activeItemId, overId)
        }
    }

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
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <motion.div
                className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <AnimatePresence mode="popLayout">
                    {allItems.map((item) => (
                        <motion.div
                            key={item.id}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            layoutId={item.id}
                        >
                            {/* We wrap Draggable first */}
                            <DraggableDriveItem item={item}>
                                {item.type === 'folder' ? (
                                    /* If folder, we also wrap/use droppable logic */
                                    <DroppableFolderItem
                                        item={item}
                                        onClick={() => onFolderOpen(item.id)}
                                    >
                                        {(isOver) => (
                                            <FileCard
                                                item={item}
                                                // Event bubble up is handled by wrapper, but we pass onClick for specific non-drag clicks via wrapper
                                                onDelete={() => onFileDelete?.(item.id)}
                                                onDownload={() => onFileDownload?.(item.id)}
                                                onShare={() => onFileShare?.(item.id)}
                                                // Dnd-kit specific props
                                                isOver={isOver}
                                            />
                                        )}
                                    </DroppableFolderItem>
                                ) : (
                                    /* Files are just draggable items */
                                    <FileCard
                                        item={item}
                                        onDoubleClick={() => onFileClick?.(item.id)}
                                        onDelete={() => onFileDelete?.(item.id)}
                                        onDownload={() => onFileDownload?.(item.id)}
                                        onShare={() => onFileShare?.(item.id)}
                                    />
                                )}
                            </DraggableDriveItem>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {createPortal(
                <DragOverlay>
                    {activeItem ? (
                        <div className="w-[200px] sm:w-auto">
                            <FileCard
                                item={activeItem}
                                dragOverlay
                            />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}

