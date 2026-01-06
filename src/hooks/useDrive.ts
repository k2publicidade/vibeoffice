'use client'

import { useState, useCallback, useMemo } from 'react'
import { DriveItem, SharedAccess, SharePermission, SharedWithMe } from '@/types/drive'
import { mockDriveItems, mockUsers } from '@/lib/mock-data'

export interface UploadFileInput {
  file: File
  parentId?: string | null
}

export interface CreateFolderInput {
  name: string
  parentId?: string | null
}

export interface ShareItemInput {
  itemId: string
  userId: string
  permission: SharePermission
}

export interface UseDriveReturn {
  items: DriveItem[]
  currentFolder: DriveItem | null
  breadcrumbs: DriveItem[]
  currentFolderId: string | null
  setCurrentFolder: (folder: DriveItem | null) => void
  navigateToFolder: (folderId: string | null) => void
  goBack: () => void
  getItemsInFolder: (folderId: string | null) => DriveItem[]
  getItemById: (id: string) => DriveItem | null
  getFolderPath: (folderId: string | null) => DriveItem[]
  uploadFile: (input: UploadFileInput) => Promise<DriveItem>
  uploadFiles: (files: File[], parentId?: string | null) => Promise<DriveItem[]>
  createFolder: (input: CreateFolderInput) => DriveItem
  deleteItem: (itemId: string) => void
  renameItem: (itemId: string, newName: string) => void
  // Funções de compartilhamento
  shareItem: (input: ShareItemInput) => void
  unshareItem: (itemId: string, userId: string) => void
  updateShare: (itemId: string, userId: string, permission: SharePermission) => void
  getItemShares: (itemId: string) => SharedAccess[]
  getSharedWithMe: () => SharedWithMe[]
  togglePublicAccess: (itemId: string) => void
  copyShareLink: (itemId: string) => string
  // Usuários para compartilhamento
  availableUsers: { id: string; name: string; email: string; avatar?: string; sector: string }[]
  getUserById: (userId: string) => { name: string; avatar?: string; email: string } | null
  isLoading: boolean
  isUploading: boolean
}

export function useDrive(): UseDriveReturn {
  const [items, setItems] = useState<DriveItem[]>(mockDriveItems)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [isLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Usuários disponíveis para compartilhamento (exclui o atual)
  const availableUsers = useMemo(() => {
    return mockUsers
      .filter(u => u.id !== 'current-user')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        sector: u.sector,
      }))
  }, [])

  // Obter usuário por ID
  const getUserById = useCallback((userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    if (!user) return null
    return { name: user.name, avatar: user.avatar, email: user.email }
  }, [])

  // Folder da raiz é null
  const currentFolder = currentFolderId
    ? items.find(i => i.id === currentFolderId && i.type === 'folder') || null
    : null

  // Obter itens dentro da pasta atual
  const currentFolderItems = useMemo(() => {
    return items.filter(i => i.parentId === currentFolderId)
  }, [items, currentFolderId])

  // Construir breadcrumbs (caminho)
  const breadcrumbs = useMemo(() => {
    const path: DriveItem[] = []
    let currentId = currentFolderId

    while (currentId) {
      const folder = items.find(i => i.id === currentId)
      if (folder) {
        path.unshift(folder)
        currentId = folder.parentId || null
      } else {
        break
      }
    }

    return path
  }, [items, currentFolderId])

  const navigateToFolder = useCallback((folderId: string | null) => {
    if (folderId === null) {
      setCurrentFolderId(null)
      return
    }
    const folder = items.find(i => i.id === folderId && i.type === 'folder')
    if (folder) {
      setCurrentFolderId(folderId)
    }
  }, [items])

  const goBack = useCallback(() => {
    const parentFolder = items.find(i => i.id === currentFolderId)
    if (parentFolder?.parentId) {
      setCurrentFolderId(parentFolder.parentId)
    } else {
      setCurrentFolderId(null)
    }
  }, [items, currentFolderId])

  const getItemsInFolder = useCallback((folderId: string | null) => {
    return items.filter(i => i.parentId === folderId)
  }, [items])

  const getItemById = useCallback((id: string) => {
    return items.find(i => i.id === id) || null
  }, [items])

  const getFolderPath = useCallback((folderId: string | null) => {
    const path: DriveItem[] = []
    let currentId = folderId

    while (currentId) {
      const folder = items.find(i => i.id === currentId)
      if (folder) {
        path.unshift(folder)
        currentId = folder.parentId || null
      } else {
        break
      }
    }

    return path
  }, [items])

  // Função para gerar um ID único
  const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Função para obter o mimeType do arquivo
  const getMimeType = (file: File): string => {
    return file.type || 'application/octet-stream'
  }

  // Upload de um único arquivo
  const uploadFile = useCallback(async (input: UploadFileInput): Promise<DriveItem> => {
    setIsUploading(true)

    // Simula delay de upload
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    const newItem: DriveItem = {
      id: generateId(),
      name: input.file.name,
      type: 'file',
      parentId: input.parentId || undefined,
      size: input.file.size,
      mimeType: getMimeType(input.file),
      uploadedBy: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setItems(prev => [...prev, newItem])
    setIsUploading(false)

    return newItem
  }, [])

  // Upload de múltiplos arquivos
  const uploadFiles = useCallback(async (files: File[], parentId?: string | null): Promise<DriveItem[]> => {
    setIsUploading(true)
    const uploadedItems: DriveItem[] = []

    for (const file of files) {
      // Simula delay de upload
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))

      const newItem: DriveItem = {
        id: generateId(),
        name: file.name,
        type: 'file',
        parentId: parentId || undefined,
        size: file.size,
        mimeType: getMimeType(file),
        uploadedBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      uploadedItems.push(newItem)
    }

    setItems(prev => [...prev, ...uploadedItems])
    setIsUploading(false)

    return uploadedItems
  }, [])

  // Criar nova pasta
  const createFolder = useCallback((input: CreateFolderInput): DriveItem => {
    const newFolder: DriveItem = {
      id: generateId(),
      name: input.name,
      type: 'folder',
      parentId: input.parentId || undefined,
      uploadedBy: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setItems(prev => [...prev, newFolder])

    return newFolder
  }, [])

  // Deletar item
  const deleteItem = useCallback((itemId: string) => {
    setItems(prev => {
      // Função recursiva para pegar todos os IDs dos itens filhos
      const getChildIds = (parentId: string): string[] => {
        const children = prev.filter(item => item.parentId === parentId)
        let ids: string[] = []
        for (const child of children) {
          ids.push(child.id)
          if (child.type === 'folder') {
            ids = [...ids, ...getChildIds(child.id)]
          }
        }
        return ids
      }

      // Pega todos os IDs para deletar (item + filhos)
      const idsToDelete = [itemId, ...getChildIds(itemId)]

      return prev.filter(item => !idsToDelete.includes(item.id))
    })
  }, [])

  // Renomear item
  const renameItem = useCallback((itemId: string, newName: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, name: newName, updatedAt: new Date() }
          : item
      )
    )
  }, [])

  // Compartilhar item com usuário
  const shareItem = useCallback((input: ShareItemInput) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === input.itemId) {
          const existingShares = item.sharedWith || []
          // Verifica se já está compartilhado com esse usuário
          const alreadyShared = existingShares.some(s => s.userId === input.userId)
          if (alreadyShared) {
            // Atualiza permissão
            return {
              ...item,
              sharedWith: existingShares.map(s =>
                s.userId === input.userId
                  ? { ...s, permission: input.permission }
                  : s
              ),
              updatedAt: new Date(),
            }
          }
          // Adiciona novo compartilhamento
          const newShare: SharedAccess = {
            userId: input.userId,
            permission: input.permission,
            sharedAt: new Date(),
            sharedBy: 'current-user',
          }
          return {
            ...item,
            sharedWith: [...existingShares, newShare],
            updatedAt: new Date(),
          }
        }
        return item
      })
    )
  }, [])

  // Remover compartilhamento
  const unshareItem = useCallback((itemId: string, userId: string) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId && item.sharedWith) {
          return {
            ...item,
            sharedWith: item.sharedWith.filter(s => s.userId !== userId),
            updatedAt: new Date(),
          }
        }
        return item
      })
    )
  }, [])

  // Atualizar permissão de compartilhamento
  const updateShare = useCallback((itemId: string, userId: string, permission: SharePermission) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId && item.sharedWith) {
          return {
            ...item,
            sharedWith: item.sharedWith.map(s =>
              s.userId === userId ? { ...s, permission } : s
            ),
            updatedAt: new Date(),
          }
        }
        return item
      })
    )
  }, [])

  // Obter compartilhamentos de um item
  const getItemShares = useCallback((itemId: string): SharedAccess[] => {
    const item = items.find(i => i.id === itemId)
    return item?.sharedWith || []
  }, [items])

  // Obter itens compartilhados comigo
  const getSharedWithMe = useCallback((): SharedWithMe[] => {
    const sharedItems: SharedWithMe[] = []

    items.forEach(item => {
      if (item.sharedWith) {
        const myShare = item.sharedWith.find(s => s.userId === 'current-user')
        if (myShare) {
          sharedItems.push({
            item,
            permission: myShare.permission,
            sharedBy: myShare.sharedBy,
            sharedAt: myShare.sharedAt,
          })
        }
      }
    })

    return sharedItems
  }, [items])

  // Toggle acesso público
  const togglePublicAccess = useCallback((itemId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, isPublic: !item.isPublic, updatedAt: new Date() }
          : item
      )
    )
  }, [])

  // Gerar link de compartilhamento
  const copyShareLink = useCallback((itemId: string): string => {
    // Simula geração de link
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vibeoffice.app'
    return `${baseUrl}/drive/share/${itemId}`
  }, [])

  return {
    items,
    currentFolder,
    breadcrumbs,
    currentFolderId,
    setCurrentFolder: () => {},
    navigateToFolder,
    goBack,
    getItemsInFolder,
    getItemById,
    getFolderPath,
    uploadFile,
    uploadFiles,
    createFolder,
    deleteItem,
    renameItem,
    shareItem,
    unshareItem,
    updateShare,
    getItemShares,
    getSharedWithMe,
    togglePublicAccess,
    copyShareLink,
    availableUsers,
    getUserById,
    isLoading,
    isUploading,
  }
}
