'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { DriveItem, SharedAccess, SharePermission, SharedWithMe } from '@/types/drive'

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
  const [items, setItems] = useState<DriveItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const { user } = useAuth()

  // Fetch inicial de items e usuários
  useEffect(() => {
    if (!user) return

    fetchItems()
    fetchUsers()
  }, [user])

  async function fetchItems() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('drive_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setItems(
        data.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type as 'file' | 'folder',
          parentId: item.parent_id || undefined,
          size: item.size || undefined,
          mimeType: item.mime_type || undefined,
          storagePath: item.storage_path || undefined,
          uploadedBy: item.uploaded_by,
          sharedWith: item.shared_with || [],
          isPublic: item.is_public || false,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        }))
      )
    } catch (error) {
      console.error('Error fetching drive items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar, sector')
        .ne('id', user!.id) // Exclui o usuário atual
        .order('name')

      if (error) throw error

      setAvailableUsers(
        data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || undefined,
          sector: u.sector,
        }))
      )
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Obter usuário por ID
  const getUserById = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('name, avatar, email')
      .eq('id', userId)
      .single()

    if (error) return null
    return { name: data.name, avatar: data.avatar || undefined, email: data.email }
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

  // Função para obter o mimeType do arquivo
  const getMimeType = (file: File): string => {
    return file.type || 'application/octet-stream'
  }

  // Upload de um único arquivo
  const uploadFile = useCallback(async (input: UploadFileInput): Promise<DriveItem> => {
    if (!user) throw new Error('User not authenticated')

    setIsUploading(true)

    try {
      // 1. Upload para o Supabase Storage
      const fileName = `${Date.now()}-${input.file.name}`
      const storagePath = input.parentId
        ? `${input.parentId}/${fileName}`
        : fileName

      const { error: storageError } = await supabase.storage
        .from('drive-files')
        .upload(storagePath, input.file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) throw storageError

      // 2. Inserir metadata no banco
      const { data, error } = await supabase
        .from('drive_items')
        .insert({
          name: input.file.name,
          type: 'file',
          parent_id: input.parentId || null,
          size: input.file.size,
          mime_type: getMimeType(input.file),
          storage_path: storagePath,
          uploaded_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      const newItem: DriveItem = {
        id: data.id,
        name: data.name,
        type: 'file',
        parentId: data.parent_id || undefined,
        size: data.size,
        mimeType: data.mime_type,
        storagePath: data.storage_path,
        uploadedBy: data.uploaded_by,
        sharedWith: data.shared_with || [],
        isPublic: data.is_public || false,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      setItems(prev => [...prev, newItem])
      return newItem
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [user])

  // Upload de múltiplos arquivos
  const uploadFiles = useCallback(async (files: File[], parentId?: string | null): Promise<DriveItem[]> => {
    setIsUploading(true)
    const uploadedItems: DriveItem[] = []

    try {
      for (const file of files) {
        const item = await uploadFile({ file, parentId })
        uploadedItems.push(item)
      }
      return uploadedItems
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [uploadFile])

  // Criar nova pasta
  const createFolder = useCallback(async (input: CreateFolderInput): Promise<DriveItem> => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('drive_items')
      .insert({
        name: input.name,
        type: 'folder',
        parent_id: input.parentId || null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    const newFolder: DriveItem = {
      id: data.id,
      name: data.name,
      type: 'folder',
      parentId: data.parent_id || undefined,
      uploadedBy: data.uploaded_by,
      sharedWith: data.shared_with || [],
      isPublic: data.is_public || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    setItems(prev => [...prev, newFolder])
    return newFolder
  }, [user])

  // Deletar item
  const deleteItem = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    try {
      // Se for arquivo, deletar do Storage também
      if (item.type === 'file' && item.storagePath) {
        const { error: storageError } = await supabase.storage
          .from('drive-files')
          .remove([item.storagePath])

        if (storageError) console.error('Error deleting from storage:', storageError)
      }

      // Deletar do banco (CASCADE vai deletar filhos automaticamente)
      const { error } = await supabase
        .from('drive_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      // Atualizar estado local
      await fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      throw error
    }
  }, [items])

  // Renomear item
  const renameItem = useCallback(async (itemId: string, newName: string) => {
    const { data, error } = await supabase
      .from('drive_items')
      .update({ name: newName })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, name: newName, updatedAt: new Date(data.updated_at) }
          : item
      )
    )
  }, [])

  // Compartilhar item com usuário
  const shareItem = useCallback(async (input: ShareItemInput) => {
    if (!user) throw new Error('User not authenticated')

    const item = items.find(i => i.id === input.itemId)
    if (!item) return

    const existingShares = item.sharedWith || []
    const alreadyShared = existingShares.some((s: any) => s.userId === input.userId)

    let updatedShares: SharedAccess[]
    if (alreadyShared) {
      // Atualiza permissão
      updatedShares = existingShares.map((s: any) =>
        s.userId === input.userId
          ? { ...s, permission: input.permission }
          : s
      )
    } else {
      // Adiciona novo compartilhamento
      const newShare: SharedAccess = {
        userId: input.userId,
        permission: input.permission,
        sharedAt: new Date(),
        sharedBy: user.id,
      }
      updatedShares = [...existingShares, newShare]
    }

    const { error } = await supabase
      .from('drive_items')
      .update({ shared_with: updatedShares })
      .eq('id', input.itemId)

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === input.itemId
          ? { ...item, sharedWith: updatedShares, updatedAt: new Date() }
          : item
      )
    )
  }, [user, items])

  // Remover compartilhamento
  const unshareItem = useCallback(async (itemId: string, userId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const updatedShares = (item.sharedWith || []).filter((s: any) => s.userId !== userId)

    const { error } = await supabase
      .from('drive_items')
      .update({ shared_with: updatedShares })
      .eq('id', itemId)

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, sharedWith: updatedShares, updatedAt: new Date() }
          : item
      )
    )
  }, [items])

  // Atualizar permissão de compartilhamento
  const updateShare = useCallback(async (itemId: string, userId: string, permission: SharePermission) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const updatedShares = (item.sharedWith || []).map((s: any) =>
      s.userId === userId ? { ...s, permission } : s
    )

    const { error } = await supabase
      .from('drive_items')
      .update({ shared_with: updatedShares })
      .eq('id', itemId)

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, sharedWith: updatedShares, updatedAt: new Date() }
          : item
      )
    )
  }, [items])

  // Obter compartilhamentos de um item
  const getItemShares = useCallback((itemId: string): SharedAccess[] => {
    const item = items.find(i => i.id === itemId)
    return item?.sharedWith || []
  }, [items])

  // Obter itens compartilhados comigo
  const getSharedWithMe = useCallback((): SharedWithMe[] => {
    if (!user) return []

    const sharedItems: SharedWithMe[] = []

    items.forEach(item => {
      if (item.sharedWith) {
        const myShare = (item.sharedWith as any[]).find((s: any) => s.userId === user.id)
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
  }, [items, user])

  // Toggle acesso público
  const togglePublicAccess = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newPublicState = !item.isPublic

    const { error } = await supabase
      .from('drive_items')
      .update({ is_public: newPublicState })
      .eq('id', itemId)

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, isPublic: newPublicState, updatedAt: new Date() }
          : item
      )
    )
  }, [items])

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
