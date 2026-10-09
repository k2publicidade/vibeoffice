'use client'

import { useMemo, useState, useEffect } from 'react'
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
  ExternalLink,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DriveItem } from '@/types/drive'
import { toast } from 'sonner'

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

// [C05] Função para obter URL pública do Supabase Storage — cria client por chamada
const getPublicUrl = (storagePath: string | undefined): string | null => {
  if (!storagePath) return null

  const supabase = createClient()
  const { data } = supabase.storage
    .from('drive-files')
    .getPublicUrl(storagePath)

  return data?.publicUrl || null
}

// [C05] Função para fazer download do arquivo — cria client por chamada
const downloadFile = async (file: DriveItem) => {
  if (!file.url) {
    toast.error('Arquivo não disponível para download')
    return
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('drive-files')
      .download(file.url)

    if (error) throw error

    // Criar blob URL e fazer download
    const blob = new Blob([data], { type: file.mimeType || 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success(`${file.name} baixado com sucesso!`)
  } catch (error) {
    console.error('Download error:', error)
    toast.error('Erro ao baixar arquivo')
  }
}

export function FilePreviewModal({
  open,
  onClose,
  file,
  onDownload,
  onShare,
  onDelete,
}: FilePreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)

  const fileInfo = useMemo(() => {
    return getFileInfo(file?.mimeType)
  }, [file?.mimeType])

  const FileIcon = fileInfo.icon
  const isImage = file?.mimeType?.startsWith('image/')
  const isVideo = file?.mimeType?.startsWith('video/')
  const isAudio = file?.mimeType?.startsWith('audio/')
  const isPdf = file?.mimeType?.includes('pdf')

  // Carregar URL do arquivo (Signed URL)
  useEffect(() => {
    if (open && file && file.url) {
      const fetchUrl = async () => {
        setIsLoadingImage(true)
        setImageError(false)
        setImageUrl(null)

        try {
          // [C05] Gerar URL assinada válida por 1 hora
          const supabase = createClient()
          const { data, error } = await supabase.storage
            .from('drive-files')
            .createSignedUrl(file.url!, 3600)

          if (error) throw error

          if (data?.signedUrl) {
            setImageUrl(data.signedUrl)
          } else {
            console.error('No signed URL returned')
            setImageError(true)
          }
        } catch (error) {
          console.error('Error fetching signed URL:', error)
          setImageError(true)
        } finally {
          setIsLoadingImage(false)
        }
      }

      fetchUrl()
    } else {
      setImageUrl(null)
      setZoom(1)
    }
  }, [open, file])

  // Handler de download
  const handleDownload = async () => {
    if (!file) return

    setIsDownloading(true)
    try {
      if (onDownload) await onDownload(file)
      else await downloadFile(file)
    } finally {
      setIsDownloading(false)
    }
  }

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))
  const handleZoomReset = () => setZoom(1)

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] bg-black border-[#262626] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn('p-2 rounded-lg shrink-0', fileInfo.bgColor)}>
              <FileIcon className={cn('h-5 w-5', fileInfo.color)} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{file.name}</h3>
              <p className="text-xs text-gray-400">{fileInfo.label} • {formatFileSize(file.size)}</p>
            </div>
          </div>

          {/* Zoom controls para imagens */}
          {isImage && imageUrl && !imageError && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-400 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomReset}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1a1a1a] shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isLoadingImage ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-8 absolute inset-0"
              >
                <Loader2 className="h-10 w-10 text-purple-400 animate-spin mb-4" />
                <p className="text-gray-400">Carregando preview...</p>
              </motion.div>
            ) : isImage ? (
              imageUrl && !imageError ? (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full flex items-center justify-center overflow-auto p-4"
                  style={{ cursor: zoom > 1 ? 'move' : 'default' }}
                >
                  <img
                    src={imageUrl}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                    onError={() => setImageError(true)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center p-8"
                >
                  <div className={cn('p-4 rounded-xl mb-4', fileInfo.bgColor)}>
                    <Image className={cn('h-12 w-12', fileInfo.color)} />
                  </div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Não foi possível carregar o preview da imagem
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="mt-4 border-[#262626] text-white hover:bg-[#1a1a1a]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar para visualizar
                  </Button>
                </motion.div>
              )
            ) : isPdf ? (
              imageUrl && !imageError ? (
                <motion.div
                  key="pdf"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full"
                >
                  <iframe
                    src={`${imageUrl}#toolbar=0`}
                    className="w-full h-full border-0 bg-white/5"
                    title={file.name}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="pdf-error"
                  className="flex flex-col items-center justify-center p-8"
                >
                  <p className="text-gray-400">Erro ao carregar PDF.</p>
                </motion.div>
              )
            ) : isVideo ? (
              <motion.div
                key="video"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-8"
              >
                <div className={cn('p-6 rounded-2xl mb-4', fileInfo.bgColor)}>
                  <Video className={cn('h-16 w-16', fileInfo.color)} />
                </div>
                <p className="text-lg font-medium text-white">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  Faça o download para assistir ao vídeo
                </p>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? 'Baixando...' : 'Download'}
                </Button>
              </motion.div>
            ) : isAudio ? (
              <motion.div
                key="audio"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-8"
              >
                <div className={cn('p-6 rounded-2xl mb-4', fileInfo.bgColor)}>
                  <Music className={cn('h-16 w-16', fileInfo.color)} />
                </div>
                <p className="text-lg font-medium text-white">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  Faça o download para ouvir o áudio
                </p>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? 'Baixando...' : 'Download'}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center p-8"
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
          </AnimatePresence>
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
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] gap-2 min-w-[120px]"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
