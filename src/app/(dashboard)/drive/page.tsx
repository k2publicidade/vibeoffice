'use client'

import { useDrive } from '@/hooks/useDrive'
import { FileList } from '@/components/drive/FileList'
import { FolderTree } from '@/components/drive/FolderTree'
import { UploadModal } from '@/components/drive/UploadModal'
import { CreateFolderModal } from '@/components/drive/CreateFolderModal'
import { FilePreviewModal } from '@/components/drive/FilePreviewModal'
import { ShareModal } from '@/components/drive/ShareModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Upload, ArrowUp, Users } from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DriveItem, SharePermission } from '@/types/drive'

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
    shareItem,
    unshareItem,
    updateShare,
    getItemShares,
    togglePublicAccess,
    copyShareLink,
    availableUsers,
    getUserById,
    isUploading,
  } = useDrive()

  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null)
  const [shareItem_, setShareItem] = useState<DriveItem | null>(null)

  // Obter compartilhamentos do item selecionado
  const itemShares = useMemo(() => {
    if (!shareItem_) return []
    return getItemShares(shareItem_.id)
  }, [shareItem_, getItemShares])

  const handleFolderOpen = (folderId: string) => {
    navigateToFolder(folderId)
  }

  const handleGoBack = () => {
    goBack()
  }

  const handleDelete = (itemId: string) => {
    setDeleteItemId(itemId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (deleteItemId) {
      const item = getItemById(deleteItemId)
      deleteItem(deleteItemId)
      toast.success(`"${item?.name}" foi excluído com sucesso`)
    }
    setShowDeleteDialog(false)
    setDeleteItemId(null)
  }

  const handleDownload = (itemId: string) => {
    const item = getItemById(itemId)
    if (item) {
      toast.success(`Download de "${item.name}" iniciado`)
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
    await uploadFiles(files, currentFolderId)
    toast.success(`${files.length} arquivo(s) enviado(s) com sucesso!`)
  }

  const handleCreateFolder = (name: string) => {
    createFolder({ name, parentId: currentFolderId })
    toast.success(`Pasta "${name}" criada com sucesso!`)
  }

  // Handlers de compartilhamento
  const handleShareUser = (userId: string, permission: SharePermission) => {
    if (!shareItem_) return
    shareItem({ itemId: shareItem_.id, userId, permission })
    const user = getUserById(userId)
    toast.success(`Compartilhado com ${user?.name || 'usuário'}`)
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
    // Atualiza o item local para refletir mudança
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
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drive</h1>
            <p className="text-muted-foreground">
              Gerencie documentos e arquivos compartilhados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="gap-2 bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67]"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateFolderModal(true)}
              className="gap-2 border-[#262626] hover:bg-[#1a1a1a] hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Nova Pasta
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToFolder(null)}
          className="text-xs"
        >
          Raiz
        </Button>

        {breadcrumbs.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToFolder(folder.id)}
              className="text-xs"
            >
              {folder.name}
            </Button>
          </div>
        ))}

        {currentFolder && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{currentFolder.name}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getItemsInFolder(currentFolder?.id || null).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pastas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getItemsInFolder(currentFolder?.id || null).filter(
                (i) => i.type === 'folder'
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Arquivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getItemsInFolder(currentFolder?.id || null).filter(
                (i) => i.type === 'file'
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-[#fc7a67]" />
              Compartilhados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#fc7a67]">
              {items.filter(i => (i.sharedWith && i.sharedWith.length > 0) || i.isPublic).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar - Folder Tree */}
        <div className="lg:col-span-1">
          <FolderTree
            items={items}
            currentFolderId={currentFolder?.id || null}
            onFolderSelect={navigateToFolder}
            breadcrumbs={breadcrumbs}
          />
        </div>

        {/* Main Area - File List */}
        <div className="lg:col-span-3">
          {breadcrumbs.length > 0 && (
            <div className="mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                className="gap-2"
              >
                <ArrowUp className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          )}

          <FileList
            items={items}
            currentFolderId={currentFolder?.id || null}
            onFolderOpen={handleFolderOpen}
            onFileClick={handleFileClick}
            onFileDelete={handleDelete}
            onFileDownload={handleDownload}
            onFileShare={handleShare}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-black border-[#262626]">
          <AlertDialogTitle className="text-white">Deletar item</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Tem certeza que deseja deletar este item? Esta ação não pode ser
            desfeita.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="border-[#262626] text-white hover:bg-[#1a1a1a] hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Modal */}
      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        currentFolderName={currentFolder?.name || 'Raiz'}
        isUploading={isUploading}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
        currentFolderName={currentFolder?.name || 'Raiz'}
      />

      {/* File Preview Modal */}
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

      {/* Share Modal */}
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
