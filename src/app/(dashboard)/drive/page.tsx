'use client'

import { useDrive } from '@/hooks/useDrive'
import { DriveGrid } from '@/components/drive/DriveGrid'
import { DriveList } from '@/components/drive/DriveList'
import { FolderTree } from '@/components/drive/FolderTree'
import { UploadModal } from '@/components/drive/UploadModal'
import { CreateFolderModal } from '@/components/drive/CreateFolderModal'
import { FilePreviewModal } from '@/components/drive/FilePreviewModal'
import { ShareModal } from '@/components/drive/ShareModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Upload,
  Search,
  LayoutGrid,
  List,
  Home,
  ChevronRight,
  Filter,
  MoreHorizontal
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmModal, SuccessModal, ErrorModal } from '@/components/drive/AlertModal'
import { DriveItem, SharePermission } from '@/types/drive'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type ViewMode = 'grid' | 'list'

export default function DrivePage() {
  const {
    items,
    currentFolder,
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    goBack,
    getItemsInFolder,
    getItemById,
    uploadFiles,
    createFolder,
    deleteItem,
    moveItem,
    shareItem,
    unshareItem,
    updateShare,
    getItemShares,
    togglePublicAccess,
    copyShareLink,
    availableUsers,
    getUserById,
    isUploading,
    storageUsage,
    storageLimit,
  } = useDrive()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Format bytes helper
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const usagePercentage = Math.min((storageUsage / storageLimit) * 100, 100)
  const isNearLimit = usagePercentage > 90
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null)
  const [shareItem_, setShareItem] = useState<DriveItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description?: string }>({ open: false, title: '' })
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; description?: string }>({ open: false, title: '' })

  // Obter compartilhamentos do item selecionado
  const itemShares = useMemo(() => {
    if (!shareItem_) return []
    return getItemShares(shareItem_.id)
  }, [shareItem_, getItemShares])

  // Filtrar itens baseado na busca
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [items, searchQuery])

  // Se tiver busca, mostramos todos os resultados flat. Se não, usamos a lógica de pastas do componente Grid/List
  const displayItems = searchQuery ? filteredItems : items

  const handleMoveItem = async (itemId: string, targetFolderId: string) => {
    const item = getItemById(itemId)
    const targetFolder = getItemById(targetFolderId)
    if (!item || !targetFolder) return

    try {
      await moveItem(itemId, targetFolderId)
      toast.success(`"${item.name}" movido para "${targetFolder.name}"`)
    } catch (error: any) {
      if (error?.message?.includes('itself')) {
        toast.error('Não é possível mover uma pasta para dentro de si mesma')
      } else {
        toast.error('Erro ao mover arquivo')
      }
    }
  }

  const handleFolderOpen = (folderId: string) => {
    navigateToFolder(folderId)
    setSearchQuery('')
  }

  const handleDelete = (itemId: string) => {
    setDeleteItemId(itemId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (deleteItemId) {
      const item = getItemById(deleteItemId)
      setIsDeleting(true)
      try {
        await deleteItem(deleteItemId)
        setShowDeleteDialog(false)
        setDeleteItemId(null)
        setSuccessModal({
          open: true,
          title: 'Arquivo excluído!',
          description: `"${item?.name}" foi removido com sucesso.`
        })
      } catch (error) {
        console.error('Delete error:', error)
        setErrorModal({
          open: true,
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o item. Tente novamente.'
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleDownload = async (itemId: string) => {
    const item = getItemById(itemId)
    if (!item || item.type !== 'file') return

    try {
      const supabase = createClient()
      // No useDrive, o `storage_path` do banco é mapeado para `item.url`
      const path = item.url
      if (!path) throw new Error('Caminho do arquivo não encontrado')

      const { data, error } = await supabase.storage
        .from('drive-files')
        .download(path)
      if (error) throw error

      // Criar link e disparar download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Download iniciado: ${item.name}`)
    } catch (e) {
      console.error('Download error:', e)
      toast.error('Erro ao baixar arquivo')
    }
  }

  const handleShare = (itemId: string) => {
    const item = getItemById(itemId)
    if (item) {
      setShareItem(item)
    }
  }

  const handleFileClick = (itemId: string) => {
    const item = getItemById(itemId)
    if (item && item.type === 'file') {
      setPreviewFile(item)
    }
  }

  const handleUpload = async (files: File[]) => {
    try {
      await uploadFiles(files, currentFolderId)
      setSuccessModal({
        open: true,
        title: 'Upload concluído!',
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`
      })
    } catch (error) {
      console.error('Upload error:', error)
      setErrorModal({
        open: true,
        title: 'Erro no upload',
        description: 'Não foi possível enviar os arquivos. Tente novamente.'
      })
    }
  }

  const handleCreateFolder = async (name: string) => {
    await createFolder({ name, parentId: currentFolderId })
    setSuccessModal({
      open: true,
      title: 'Pasta criada!',
      description: `A pasta "${name}" foi criada com sucesso.`
    })
  }

  // Handlers de compartilhamento
  const handleShareUser = async (userId: string, permission: SharePermission) => {
    if (!shareItem_) return
    try {
      await shareItem({ itemId: shareItem_.id, userId, permission })
      const user = await getUserById(userId)
      toast.success(`Compartilhado com ${user?.name || 'usuário'}`)
    } catch (error) {
      toast.error('Erro ao compartilhar item')
    }
  }

  const handleUnshareUser = (userId: string) => {
    if (!shareItem_) return
    unshareItem(shareItem_.id, userId)
    toast.success('Acesso removido')
  }

  const handleUpdatePermission = (userId: string, permission: SharePermission) => {
    if (!shareItem_) return
    updateShare(shareItem_.id, userId, permission)
    toast.success('Permissão atualizada')
  }

  const handleTogglePublic = () => {
    if (!shareItem_) return
    togglePublicAccess(shareItem_.id)
    const updatedItem = getItemById(shareItem_.id)
    toast.success(updatedItem?.isPublic ? 'Acesso público ativado' : 'Acesso público desativado')
    if (updatedItem) setShareItem(updatedItem)
  }

  const handleCopyLink = () => {
    if (!shareItem_) return ''
    const link = copyShareLink(shareItem_.id)
    navigator.clipboard.writeText(link)
    toast.success('Link copiado para área de transferência!')
    return link
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] overflow-hidden bg-black text-zinc-100">

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex w-64 flex-col border-r border-[#262626] bg-black/50 backdrop-blur-sm">
        <div className="p-4">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="w-full gap-2 bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] shadow-lg shadow-orange-500/20"
          >
            <Upload className="h-4 w-4" />
            Novo Upload
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <FolderTree
            items={items}
            currentFolderId={currentFolderId}
            onFolderSelect={navigateToFolder}
            breadcrumbs={breadcrumbs}
          />
        </div>
        <div className="p-4 border-t border-[#262626]">
          <div className="rounded-xl bg-zinc-900/50 p-3 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Armazenamento</span>
              <span className={cn(isNearLimit ? "text-red-400" : "text-zinc-400")}>
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-colors duration-300",
                  isNearLimit ? "bg-red-500" : "bg-[#fc7a67]"
                )}
              />
            </div>
            <p className="text-[10px] text-zinc-500 truncate">
              {formatBytes(storageUsage)} de {formatBytes(storageLimit)} usados
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-black to-zinc-900/20">

        {/* Toolbar */}
        <div className="h-16 border-b border-[#262626] flex items-center justify-between px-6 bg-black/40 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Trigger would go here */}

            {/* Breadcrumbs */}
            <nav className="flex items-center text-sm font-medium text-zinc-500 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-white"
                onClick={() => navigateToFolder(null)}
              >
                <Home className="h-4 w-4" />
              </Button>

              {breadcrumbs.map((crumb) => (
                <div key={crumb.id} className="flex items-center">
                  <ChevronRight className="h-4 w-4 mx-1" />
                  <span
                    className="hover:text-white cursor-pointer transition-colors max-w-[150px] truncate"
                    onClick={() => navigateToFolder(crumb.id)}
                  >
                    {crumb.name}
                  </span>
                </div>
              ))}

              {currentFolder && (
                <div className="flex items-center text-white">
                  <ChevronRight className="h-4 w-4 mx-1 text-zinc-500" />
                  <span className="font-semibold max-w-[200px] truncate">{currentFolder.name}</span>
                </div>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Buscar arquivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-sm focus:ring-[#fc7a67] focus:border-[#fc7a67] transition-all"
              />
            </div>

            <div className="h-6 w-px bg-zinc-800 mx-1" />

            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md", viewMode === 'grid' && "bg-zinc-800 text-white shadow-sm")}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md", viewMode === 'list' && "bg-zinc-800 text-white shadow-sm")}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
                <DropdownMenuItem onClick={() => setShowCreateFolderModal(true)} className="gap-2 cursor-pointer">
                  <Plus className="h-4 w-4" /> Nova Pasta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUploadModal(true)} className="gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" /> Fazer Upload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {searchQuery && (
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Resultados da busca</h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>Limpar busca</Button>
            </div>
          )}

          {viewMode === 'grid' ? (
            <DriveGrid
              items={displayItems}
              currentFolderId={searchQuery ? null : (currentFolderId || null)}
              disableFiltering={!!searchQuery}
              onFolderOpen={handleFolderOpen}
              onFileClick={handleFileClick}
              onFileDelete={handleDelete}
              onFileDownload={handleDownload}
              onFileShare={handleShare}
              onMoveItem={handleMoveItem}
              onUpload={() => setShowUploadModal(true)}
            />
          ) : (
            <DriveList
              items={displayItems}
              currentFolderId={searchQuery ? null : (currentFolderId || null)}
              disableFiltering={!!searchQuery}
              onFolderOpen={handleFolderOpen}
              onFileClick={handleFileClick}
              onFileDelete={handleDelete}
              onFileDownload={handleDownload}
              onFileShare={handleShare}
              onMoveItem={handleMoveItem}
            />
          )}
        </div>

      </div>

      {/* Modals */}
      <DeleteConfirmModal
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeleteItemId(null)
        }}
        itemName={deleteItemId ? getItemById(deleteItemId)?.name || 'Item' : 'Item'}
        itemType={deleteItemId ? (getItemById(deleteItemId)?.type === 'folder' ? 'folder' : 'file') : 'file'}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />

      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false, title: '' })}
        title={successModal.title}
        description={successModal.description}
      />

      <ErrorModal
        open={errorModal.open}
        onClose={() => setErrorModal({ open: false, title: '' })}
        title={errorModal.title}
        description={errorModal.description}
      />

      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        currentFolderName={currentFolder?.name || 'Raiz'}
        isUploading={isUploading}
      />

      <CreateFolderModal
        open={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
        currentFolderName={currentFolder?.name || 'Raiz'}
      />

      <FilePreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onDownload={(file) => {
          handleDownload(file.id)
          setPreviewFile(null)
        }}
        onShare={(file) => {
          handleShare(file.id)
          setPreviewFile(null)
        }}
        onDelete={(file) => {
          handleDelete(file.id)
          setPreviewFile(null)
        }}
      />

      <ShareModal
        item={shareItem_}
        open={!!shareItem_}
        onClose={() => setShareItem(null)}
        shares={itemShares}
        onShare={handleShareUser}
        onUnshare={handleUnshareUser}
        onUpdatePermission={handleUpdatePermission}
        onTogglePublic={handleTogglePublic}
        onCopyLink={handleCopyLink}
        availableUsers={availableUsers}
        getUserById={getUserById}
      />
    </div>
  )
}
