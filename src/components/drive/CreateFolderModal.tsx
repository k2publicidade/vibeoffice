'use client'

import { useState } from 'react'
import { FolderPlus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    if (isCreating) return // Não fechar enquanto estiver criando
    setFolderName('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-black border-[#262626] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-[#262626]">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#0c67ff] to-[#0c67ff]/70">
              <FolderPlus className="h-5 w-5 text-white" />
            </div>
            Nova Pasta
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1">
            Criar em: <span className="text-white font-medium">{currentFolderName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="folderName" className="text-sm font-medium text-white">
              Nome da pasta
            </Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value)
                setError('')
              }}
              placeholder="Digite o nome da pasta"
              className="bg-[#1a1a1a] border-[#262626] text-white placeholder:text-gray-500 focus:border-[#0c67ff] focus:ring-[#0c67ff]"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="border-[#262626] text-white hover:bg-[#1a1a1a] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || isCreating}
              className="bg-gradient-to-r from-[#0c67ff] to-[#0c67ff]/80 text-white hover:from-[#0c67ff]/90 hover:to-[#0c67ff] gap-2 min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  Criar Pasta
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
