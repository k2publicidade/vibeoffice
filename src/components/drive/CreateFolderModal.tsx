'use client'

import { useState } from 'react'
import { FolderPlus, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'

interface CreateFolderModalProps {
  open: boolean
  onClose: () => void
  onCreateFolder: (name: string) => void | Promise<void>
  currentFolderName?: string
}

export function CreateFolderModal({
  open,
  onClose,
  onCreateFolder,
  currentFolderName = 'Raiz',
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = folderName.trim()

    if (!trimmedName) {
      setError('O nome da pasta é obrigatório')
      return
    }

    if (trimmedName.length > 100) {
      setError('O nome da pasta não pode ter mais de 100 caracteres')
      return
    }

    // Caracteres inválidos para nomes de pasta
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(trimmedName)) {
      setError('O nome contém caracteres inválidos: < > : " / \\ | ? *')
      return
    }

    setIsCreating(true)
    try {
      await onCreateFolder(trimmedName)
      handleClose()
    } catch (err) {
      console.error('Error creating folder:', err)
      setError('Erro ao criar pasta. Tente novamente.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (isCreating) return
    setFolderName('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#fc7a67] to-[#ff0300]" />

        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <FolderPlus className="h-5 w-5 text-[#fc7a67]" />
              </div>
              Nova Pasta
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {currentFolderName && (
            <p className="text-sm text-zinc-500 pl-[52px]">
              Criar em: <span className="text-zinc-300 font-medium">{currentFolderName}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="folderName" className="text-sm font-medium text-zinc-400">
              Nome da pasta
            </Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value)
                setError('')
              }}
              placeholder="Ex: Projetos 2024"
              className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#fc7a67] focus:ring-[#fc7a67]/20 transition-all h-11"
              autoFocus
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-400 font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isCreating}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || isCreating}
              className="bg-white text-black hover:bg-zinc-200 min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Criar Pasta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
