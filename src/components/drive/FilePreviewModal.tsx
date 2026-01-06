'use client'

import { useMemo } from 'react'
import {
  X,
  Download,
  Share2,
  Trash2,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Video,
  Music,
  FileCode,
  FileArchive,
  Presentation,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DriveItem } from '@/types/drive'

interface FilePreviewModalProps {
  open: boolean
  onClose: () => void
  file: DriveItem | null
  onDownload?: (file: DriveItem) => void
  onShare?: (file: DriveItem) => void
  onDelete?: (file: DriveItem) => void
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileInfo = (mimeType?: string) => {
  if (!mimeType) return { icon: File, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: 'Arquivo' }

  if (mimeType.startsWith('image/')) {
    return { icon: Image, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Imagem' }
  }
  if (mimeType.startsWith('video/')) {
    return { icon: Video, color: 'text-pink-400', bgColor: 'bg-pink-500/20', label: 'Vídeo' }
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: Music, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Áudio' }
  }
  if (mimeType.includes('pdf')) {
    return { icon: FileText, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'PDF' }
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return { icon: FileSpreadsheet, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Planilha' }
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: Presentation, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Apresentação' }
  }
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) {
    return { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Documento' }
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) {
    return { icon: FileArchive, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Arquivo Compactado' }
  }
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) {
    return { icon: FileCode, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: 'Código' }
  }

  return { icon: File, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: 'Arquivo' }
}

export function FilePreviewModal({
  open,
  onClose,
  file,
  onDownload,
  onShare,
  onDelete,
}: FilePreviewModalProps) {
  const fileInfo = useMemo(() => {
    return getFileInfo(file?.mimeType)
  }, [file?.mimeType])

  const FileIcon = fileInfo.icon

  if (!file) return null

  const isImage = file.mimeType?.startsWith('image/')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-black border-[#262626] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('p-2 rounded-lg', fileInfo.bgColor)}>
              <FileIcon className={cn('h-5 w-5', fileInfo.color)} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{file.name}</h3>
              <p className="text-xs text-gray-400">{fileInfo.label}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview Area */}
        <div className="relative min-h-[300px] max-h-[400px] bg-[#0a0a0a] flex items-center justify-center p-8">
          {isImage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-w-full max-h-full"
            >
              {/* Placeholder para imagem - em produção usaria a URL real */}
              <div className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-[#262626]">
                <Image className="h-16 w-16 text-purple-400 mb-4" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1">Preview da imagem</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className={cn('p-6 rounded-2xl mb-4', fileInfo.bgColor)}>
                <FileIcon className={cn('h-16 w-16', fileInfo.color)} />
              </div>
              <p className="text-lg font-medium text-white">{file.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                Preview não disponível para este tipo de arquivo
              </p>
            </motion.div>
          )}
        </div>

        {/* File Info */}
        <div className="p-4 border-t border-[#262626] bg-[#0a0a0a]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Tamanho</p>
              <p className="text-white font-medium">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Tipo</p>
              <p className="text-white font-medium">{fileInfo.label}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Criado em</p>
              <p className="text-white font-medium">
                {format(new Date(file.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Modificado em</p>
              <p className="text-white font-medium">
                {format(new Date(file.updatedAt), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-[#262626]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(file)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShare?.(file)}
              className="border-[#262626] text-white hover:bg-[#1a1a1a] hover:text-white gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
            <Button
              size="sm"
              onClick={() => onDownload?.(file)}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
