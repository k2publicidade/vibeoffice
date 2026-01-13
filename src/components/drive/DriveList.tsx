'use client'

import { DriveItem } from '@/types/drive'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    File,
    Folder,
    MoreVertical,
    Download,
    Trash2,
    Share2,
    Image,
    FileText,
    Video,
    Music,
    Calendar,
    HardDrive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DriveListProps {
    items: DriveItem[]
    currentFolderId: string | null
    onFolderOpen: (folderId: string) => void
    onFileClick?: (fileId: string) => void
    onFileDelete?: (fileId: string) => void
    onFileDownload?: (fileId: string) => void
    onFileShare?: (fileId: string) => void
    disableFiltering?: boolean
}

const getFileIcon = (mimeType?: string, isFolder?: boolean) => {
    if (isFolder) return { icon: Folder, color: 'text-amber-400' }
    if (!mimeType) return { icon: File, color: 'text-slate-400' }
    if (mimeType.startsWith('image/')) return { icon: Image, color: 'text-purple-400' }
    if (mimeType.startsWith('video/')) return { icon: Video, color: 'text-rose-400' }
    if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-emerald-400' }
    if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-red-400' }
    return { icon: File, color: 'text-slate-400' }
}

export function DriveList({
    items,
    currentFolderId,
    onFolderOpen,
    onFileClick,
    onFileDelete,
    onFileDownload,
    onFileShare,
    disableFiltering
}: DriveListProps) {
    // Filter items
    const currentItems = disableFiltering ? items : items.filter((item) => {
        if (currentFolderId === null) {
            return item.parentId === null || item.parentId === undefined
        }
        return item.parentId === currentFolderId
    })

    const folders = currentItems
        .filter((item) => item.type === 'folder')
        .sort((a, b) => a.name.localeCompare(b.name))

    const files = currentItems
        .filter((item) => item.type === 'file')
        .sort((a, b) => a.name.localeCompare(b.name))

    const allItems = [...folders, ...files]

    if (allItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <p>Pasta vazia</p>
            </div>
        )
    }

    const formatSize = (bytes?: number) => {
        if (bytes === undefined) return '-'
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="rounded-xl border border-zinc-800 bg-black/40 overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-900/50">
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="w-[40%] text-zinc-400">Nome</TableHead>
                        <TableHead className="text-zinc-400">Proprietário</TableHead>
                        <TableHead className="text-zinc-400">Modificado</TableHead>
                        <TableHead className="text-zinc-400">Tamanho</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allItems.map((item) => {
                        const { icon: Icon, color } = getFileIcon(item.mimeType, item.type === 'folder')

                        return (
                            <TableRow
                                key={item.id}
                                className="border-zinc-800 hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                                onDoubleClick={() => {
                                    if (item.type === 'folder') onFolderOpen(item.id)
                                    else onFileClick?.(item.id)
                                }}
                            >
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-zinc-800/50">
                                            <Icon className={cn("h-4 w-4", color)} />
                                        </div>
                                        <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                                            {item.name}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-zinc-500">
                                    {/* Placeholder for owner since we store ID */}
                                    <span className="text-xs">Eu</span>
                                </TableCell>
                                <TableCell className="text-zinc-500 text-xs">
                                    {format(new Date(item.updatedAt), "d 'de' MMM, yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-zinc-500 text-xs font-mono">
                                    {item.type === 'folder' ? '-' : formatSize(item.size)}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800">
                                            {item.type !== 'folder' && (
                                                <>
                                                    <DropdownMenuItem onClick={() => onFileDownload?.(item.id)} className="gap-2 text-zinc-300 cursor-pointer">
                                                        <Download className="h-4 w-4" /> Download
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onFileShare?.(item.id)} className="gap-2 text-zinc-300 cursor-pointer">
                                                        <Share2 className="h-4 w-4" /> Compartilhar
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            <DropdownMenuItem onClick={() => onFileDelete?.(item.id)} className="gap-2 text-red-400 focus:text-red-300 cursor-pointer">
                                                <Trash2 className="h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
