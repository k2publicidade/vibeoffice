'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Upload, File, Image, FileText, FileSpreadsheet, Trash2, CheckCircle2, CloudUpload, Loader2 } from 'lucide-react'
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

  // Reset state when opening
  useEffect(() => {
    if (open && !uploading) {
      setFiles([])
    }
  }, [open, uploading])

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
    // Prevent huge number of files? No, let user decide.
    // Check duplicates? Maybe.
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
      // Reset input value so same files can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [addFiles]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)

    // Simula progresso visual (já que o supabase upload é uma Promise única por arquivo)
    // Na vida real, o onUpload deveria reportar progresso
    // Aqui vamos 'faking' um pouco para UX
    const updateProgress = () => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status === 'pending' || f.status === 'uploading') {
            const newProgress = Math.min(f.progress + Math.random() * 15, 95)
            return {
              ...f,
              progress: newProgress,
              status: 'uploading',
            }
          }
          return f
        })
      )
    }

    const interval = setInterval(updateProgress, 300)

    try {
      await onUpload(files.map((f) => f.file))

      clearInterval(interval)

      // Mark all as 100%
      setFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 100, status: 'completed' }))
      )

      // Close after delay
      setTimeout(() => {
        onClose()
        setFiles([])
        setUploading(false)
      }, 1500)

    } catch (error) {
      clearInterval(interval)
      setUploading(false)
      setFiles((prev) =>
        prev.map((f) =>
          f.status !== 'completed' ? { ...f, status: 'error' } : f
        )
      )
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
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#fc7a67] to-[#ff0300]" />

        <DialogHeader className="p-6 pb-4 border-b border-zinc-900 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-800">
                <CloudUpload className="h-5 w-5 text-[#fc7a67]" />
              </div>
              Upload de Arquivos
            </DialogTitle>
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-sm text-zinc-500 pl-[52px]">
            Enviando para: <span className="text-zinc-300 font-medium">{currentFolderName}</span>
          </p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 group overflow-hidden',
              isDragging
                ? 'border-[#fc7a67] bg-[#fc7a67]/5 scale-[1.02]'
                : uploading
                  ? 'border-zinc-800 bg-zinc-900/20 cursor-default opacity-50'
                  : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer'
            )}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#fc7a67]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />

            <motion.div
              animate={{ scale: isDragging ? 1.05 : 1, y: isDragging ? -5 : 0 }}
              className="relative z-10 flex flex-col items-center gap-4"
            >
              <div
                className={cn(
                  'p-4 rounded-full transition-colors duration-300 shadow-lg',
                  isDragging ? 'bg-[#fc7a67]/20 shadow-[#fc7a67]/20' : 'bg-zinc-900 shadow-black/50'
                )}
              >
                <Upload
                  className={cn(
                    'h-8 w-8 transition-colors duration-300',
                    isDragging ? 'text-[#fc7a67]' : 'text-zinc-400 group-hover:text-zinc-200'
                  )}
                />
              </div>
              <div className="space-y-1">
                <p className="text-white font-medium text-lg">
                  {isDragging ? 'Solte para adicionar' : 'Arraste e solte arquivos aqui'}
                </p>
                <p className="text-sm text-zinc-500">
                  ou clique para selecionar do seu computador
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
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-sm font-medium text-zinc-400">
                    Arquivos ({files.length})
                  </h4>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles([])}
                      className="h-auto py-1 px-2 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-900/10"
                    >
                      Remover todos
                    </Button>
                  )}
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                  {files.map((fileItem) => {
                    const FileIcon = getFileIcon(fileItem.file.type)

                    return (
                      <motion.div
                        key={fileItem.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group relative overflow-hidden"
                      >
                        {/* Progress bar background for uploading items */}
                        {fileItem.status === 'uploading' && (
                          <div
                            className="absolute bottom-0 left-0 h-[2px] bg-[#fc7a67] transition-all duration-300"
                            style={{ width: `${fileItem.progress}%` }}
                          />
                        )}

                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0',
                            fileItem.status === 'completed'
                              ? 'bg-green-500/10'
                              : fileItem.status === 'error'
                                ? 'bg-red-500/10'
                                : 'bg-zinc-800'
                          )}
                        >
                          {fileItem.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <FileIcon
                              className={cn(
                                'h-5 w-5',
                                fileItem.status === 'error' ? 'text-red-500' : 'text-zinc-400'
                              )}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-zinc-200 truncate pr-2">
                              {fileItem.file.name}
                            </p>
                            {fileItem.status === 'uploading' && (
                              <span className="text-xs font-mono text-[#fc7a67] shrink-0">
                                {Math.round(fileItem.progress)}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-500">
                              {formatFileSize(fileItem.file.size)}
                            </span>
                            {fileItem.status === 'error' && (
                              <span className="text-xs text-red-500">Erro no upload</span>
                            )}
                          </div>
                        </div>

                        {!uploading && fileItem.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(fileItem.id)}
                            className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
          <div className="flex justify-end gap-3 pt-2">
            {!uploading && (
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className={cn(
                "min-w-[140px] transition-all duration-300",
                uploading
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-gradient-to-r from-[#fc7a67] to-[#ff0300] hover:shadow-lg hover:shadow-orange-500/20 text-white"
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Iniciar Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
