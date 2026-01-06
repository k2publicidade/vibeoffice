'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, File, Image, FileText, FileSpreadsheet, Trash2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onUpload: (files: File[]) => Promise<void>
  currentFolderName?: string
  isUploading?: boolean
}

interface FileWithProgress {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

export function UploadModal({
  open,
  onClose,
  onUpload,
  currentFolderName = 'Raiz',
  isUploading = false,
}: UploadModalProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const newFileItems: FileWithProgress[] = fileArray.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...newFileItems])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files)
      }
    },
    [addFiles]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)

    // Simula progresso de upload para cada arquivo
    const updateProgress = () => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status === 'pending' || f.status === 'uploading') {
            const newProgress = Math.min(f.progress + Math.random() * 30, 100)
            return {
              ...f,
              progress: newProgress,
              status: newProgress >= 100 ? 'completed' : 'uploading',
            }
          }
          return f
        })
      )
    }

    // Atualiza progresso em intervalos
    const interval = setInterval(updateProgress, 200)

    try {
      await onUpload(files.map((f) => f.file))

      // Marca todos como completos
      setFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 100, status: 'completed' }))
      )

      // Fecha após um delay
      setTimeout(() => {
        onClose()
        setFiles([])
      }, 1000)
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status !== 'completed' ? { ...f, status: 'error' } : f
        )
      )
    } finally {
      clearInterval(interval)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFiles([])
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-black border-[#262626] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-[#262626]">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#fc7a67] to-[#ff0300]">
              <Upload className="h-5 w-5 text-white" />
            </div>
            Upload de Arquivos
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1">
            Enviando para: <span className="text-white font-medium">{currentFolderName}</span>
          </p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-[#fc7a67] bg-[#fc7a67]/10'
                : 'border-[#262626] hover:border-[#fc7a67]/50 hover:bg-[#1a1a1a]'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <motion.div
              animate={{ scale: isDragging ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <div
                className={cn(
                  'p-4 rounded-full transition-colors',
                  isDragging ? 'bg-[#fc7a67]/20' : 'bg-[#1a1a1a]'
                )}
              >
                <Upload
                  className={cn(
                    'h-8 w-8 transition-colors',
                    isDragging ? 'text-[#fc7a67]' : 'text-gray-400'
                  )}
                />
              </div>
              <div>
                <p className="text-white font-medium">
                  {isDragging ? 'Solte os arquivos aqui' : 'Arraste e solte arquivos'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  ou clique para selecionar
                </p>
              </div>
            </motion.div>
          </div>

          {/* File List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white">
                    Arquivos selecionados ({files.length})
                  </h4>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles([])}
                      className="text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                    >
                      Limpar tudo
                    </Button>
                  )}
                </div>

                <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
                  {files.map((fileItem) => {
                    const FileIcon = getFileIcon(fileItem.file.type)

                    return (
                      <motion.div
                        key={fileItem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-[#262626] group"
                      >
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            fileItem.status === 'completed'
                              ? 'bg-green-500/20'
                              : fileItem.status === 'error'
                              ? 'bg-red-500/20'
                              : 'bg-[#262626]'
                          )}
                        >
                          {fileItem.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <FileIcon
                              className={cn(
                                'h-5 w-5',
                                fileItem.status === 'error'
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                              )}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {fileItem.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatFileSize(fileItem.file.size)}
                            </span>
                            {fileItem.status === 'uploading' && (
                              <span className="text-xs text-[#fc7a67]">
                                {Math.round(fileItem.progress)}%
                              </span>
                            )}
                          </div>
                          {fileItem.status === 'uploading' && (
                            <Progress
                              value={fileItem.progress}
                              className="h-1 mt-2 bg-[#262626]"
                            />
                          )}
                        </div>

                        {!uploading && fileItem.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(fileItem.id)}
                            className="opacity-0 group-hover:opacity-100 h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
              className="border-[#262626] text-white hover:bg-[#1a1a1a] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] gap-2"
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Enviar {files.length > 0 && `(${files.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
