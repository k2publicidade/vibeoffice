'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { DriveItem, SharedAccess, SharePermission, SharedWithMe, DriveUploadBatchError } from '@/types/drive'

function withPermissions(items: DriveItem[], user: { id: string; role: string } | null): DriveItem[] {
  const byId = new Map(items.map(item => [item.id, item]))
  return items.map(item => {
    const result = { ...item, canManage: user?.role === 'Admin', inheritsPublic: false }
    const visited = new Set<string>()
    let ancestor: DriveItem | undefined = item
    while (ancestor && !visited.has(ancestor.id)) {
      visited.add(ancestor.id)
      if (user && (ancestor.uploadedBy === user.id || ancestor.sharedWith?.some(share => share.userId === user.id && share.permission === 'manage'))) result.canManage = true
      if (ancestor.id !== item.id && ancestor.isPublic) result.inheritsPublic = true
      ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : undefined
    }
    return result
  })
}

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
  createFolder: (input: CreateFolderInput) => Promise<DriveItem>
  deleteItem: (itemId: string) => Promise<void>
  moveItem: (itemId: string, targetFolderId: string | null) => Promise<void>
  renameItem: (itemId: string, newName: string) => Promise<void>
  // Funções de compartilhamento
  shareItem: (input: ShareItemInput) => Promise<void>
  unshareItem: (itemId: string, userId: string) => Promise<void>
  updateShare: (itemId: string, userId: string, permission: SharePermission) => Promise<void>
  getItemShares: (itemId: string) => SharedAccess[]
  getSharedWithMe: () => SharedWithMe[]
  togglePublicAccess: (itemId: string) => Promise<void>
  copyShareLink: (itemId: string) => string
  // Usuários para compartilhamento
  availableUsers: { id: string; name: string; email: string; avatar?: string; sector: string }[]
  getUserById: (userId: string) => Promise<{ name: string; avatar?: string; email: string } | null>
  isLoading: boolean
  isUploading: boolean
  storageUsage: number
  storageLimit: number
}

export function useDrive(): UseDriveReturn {
  const readVersion = useRef(0)
  const [storedItems, setItems] = useState<DriveItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUploads, setPendingUploads] = useState(0)
  const { user } = useAuth()
  const items = useMemo(() => withPermissions(storedItems, user), [storedItems, user])
  const isUploading = pendingUploads > 0
  const context = useRef({ id: user?.id, role: user?.role, generation: 0 })
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    context.current = { id: user?.id, role: user?.role, generation: context.current.generation + 1 }
    readVersion.current += 1
    setItems([])
    setAvailableUsers([])
    setCurrentFolderId(null)
    setPendingUploads(0)
    setIsLoading(Boolean(user))
    return () => { context.current.generation += 1; readVersion.current += 1 }
  }, [user?.id, user?.role])

  const commitItems = useCallback((generation: number, update: (previous: DriveItem[]) => DriveItem[]) => {
    if (generation !== context.current.generation) return
    readVersion.current += 1
    setIsLoading(false)
    setItems(update)
  }, [])

  const fetchItems = useCallback(async () => {
    if (user?.id !== context.current.id || user?.role !== context.current.role) return
    const version = ++readVersion.current
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('drive_items')
        .select('*, shared_access(user_id,permission,shared_at,shared_by)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedItems: DriveItem[] = data.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type as 'file' | 'folder',
          parentId: item.parent_id ?? undefined,
          size: item.size ?? undefined,
          mimeType: item.mime_type ?? undefined,
          url: item.storage_path ?? undefined, // URL do Supabase Storage
          uploadedBy: item.uploaded_by,
          sharedWith: (item.shared_access || []).map(share => ({ userId: share.user_id, permission: share.permission as SharePermission, sharedAt: new Date(share.shared_at), sharedBy: share.shared_by })),
          isPublic: item.is_public || false,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        }))
      if (version === readVersion.current) setItems(mappedItems)
    } catch (error) {
      console.error('Error fetching drive items:', error)
    } finally {
      if (version === readVersion.current) setIsLoading(false)
    }
  }, [supabase, user])

  const fetchUsers = useCallback(async () => {
    if (!user) return
    const generation = context.current.generation
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar, sector')
        .eq('active', true)
        .order('name')

      if (error) throw error

      if (generation !== context.current.generation) return
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
  }, [supabase, user])

  // Fetch inicial de items e usuários
  useEffect(() => {
    if (!user) return

    fetchItems()
    fetchUsers()
  }, [user, fetchItems, fetchUsers])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`drive:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drive_items' }, () => void fetchItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_access' }, () => void fetchItems())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user?.id, supabase, fetchItems])

  // Obter usuário por ID
  const getUserById = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('name, avatar, email')
      .eq('id', userId)
      .single()

    if (error) return null
    return { name: data.name, avatar: data.avatar || undefined, email: data.email }
  }, [supabase])

  // Folder da raiz é null
  const currentFolder = currentFolderId
    ? items.find(i => i.id === currentFolderId && i.type === 'folder') || null
    : null

  // Obter itens dentro da pasta atual
  // Nota: parentId pode ser undefined (raiz) enquanto currentFolderId é null
  const currentFolderItems = useMemo(() => {
    return items.filter(i => {
      // Tratar null e undefined como equivalentes para itens na raiz
      if (currentFolderId === null) {
        return i.parentId === null || i.parentId === undefined
      }
      return i.parentId === currentFolderId
    })
  }, [items, currentFolderId])

  // Construir breadcrumbs (caminho)
  const breadcrumbs = useMemo(() => {
    const path: DriveItem[] = []
    const visited = new Set<string>()
    let currentId = currentFolderId

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
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
    return items.filter(i => {
      // Tratar null e undefined como equivalentes para itens na raiz
      if (folderId === null) {
        return i.parentId === null || i.parentId === undefined
      }
      return i.parentId === folderId
    })
  }, [items])

  const getItemById = useCallback((id: string) => {
    return items.find(i => i.id === id) || null
  }, [items])

  const getFolderPath = useCallback((folderId: string | null) => {
    const path: DriveItem[] = []
    const visited = new Set<string>()
    let currentId = folderId

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
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
    if (user.id !== context.current.id || user.role !== context.current.role) throw new Error('Sessão alterada durante o envio')

    const generation = context.current.generation
    setPendingUploads(count => count + 1)

    try {
      // 1. Upload para o Supabase Storage
      const fileName = `${crypto.randomUUID()}-${input.file.name}`
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

      if (error) { await supabase.storage.from('drive-files').remove([storagePath]); throw error }

      const newItem: DriveItem = {
        id: data.id,
        name: data.name,
        type: 'file',
        parentId: data.parent_id ?? undefined,
        size: data.size ?? undefined,
        mimeType: data.mime_type ?? undefined,
        url: data.storage_path ?? undefined, // URL do Supabase Storage
        uploadedBy: data.uploaded_by,
        sharedWith: [],
        isPublic: data.is_public || false,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      commitItems(generation, prev => prev.some(item => item.id === newItem.id) ? prev : [...prev, newItem])
      return withPermissions([...items.filter(item => item.id !== newItem.id), newItem], user).find(item => item.id === newItem.id)!
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    } finally {
      if (generation === context.current.generation) setPendingUploads(count => count - 1)
    }
  }, [user, supabase, items, commitItems])

  // Upload de múltiplos arquivos
  const uploadFiles = useCallback(async (files: File[], parentId?: string | null): Promise<DriveItem[]> => {
    const generation = context.current.generation
    setPendingUploads(count => count + 1)
    const uploadedItems: DriveItem[] = []

    try {
      for (const file of files) {
        if (generation !== context.current.generation) throw new Error('Sessão alterada durante o envio')
        const item = await uploadFile({ file, parentId })
        uploadedItems.push(item)
      }
      return uploadedItems
    } catch (error) {
      console.error('Error uploading files:', error)
      throw new DriveUploadBatchError(uploadedItems.length, error)
    } finally {
      if (generation === context.current.generation) setPendingUploads(count => count - 1)
    }
  }, [uploadFile])

  // Criar nova pasta
  const createFolder = useCallback(async (input: CreateFolderInput): Promise<DriveItem> => {
    if (!user) throw new Error('User not authenticated')
    if (user.id !== context.current.id || user.role !== context.current.role) throw new Error('Sessão alterada')
    const generation = context.current.generation

    // Normalizar parentId: undefined -> null para consistência
    const normalizedParentId = input.parentId === undefined ? null : input.parentId

    const { data, error } = await supabase
      .from('drive_items')
      .insert({
        name: input.name,
        type: 'folder',
        parent_id: normalizedParentId,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    const newFolder: DriveItem = {
      id: data.id,
      name: data.name,
      type: 'folder',
      // Manter consistência: null do banco -> null no objeto (não undefined)
      parentId: data.parent_id === null ? undefined : data.parent_id,
      uploadedBy: data.uploaded_by,
      sharedWith: [],
      isPublic: data.is_public || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    // Atualizar estado local imediatamente
    commitItems(generation, prev => prev.some(item => item.id === newFolder.id) ? prev : [...prev, newFolder])

    // Recarregar dados do servidor para garantir consistência
    await fetchItems()

    return withPermissions([...items.filter(item => item.id !== newFolder.id), newFolder], user).find(item => item.id === newFolder.id)!
  }, [user, supabase, fetchItems, items, commitItems])

  // Metadata deletion and its durable cleanup request commit in one transaction.
  const deleteItem = useCallback(async (itemId: string) => {
    const generation = context.current.generation
    const { data, error } = await supabase.rpc('delete_office_drive_item', { item_id: itemId })
    if (error) throw error
    const result = data as { deletion_id: string; deleted_ids: string[]; cleanup_count: number; parent_id?: string | null } | null
    if (!result?.deleted_ids?.includes(itemId)) throw new Error('Exclusão não confirmada')
    if (generation !== context.current.generation) return
    commitItems(generation, prev => prev.filter(item => !result.deleted_ids.includes(item.id)))
    setCurrentFolderId(prev => prev && result.deleted_ids.includes(prev) ? result.parent_id ?? null : prev)
    if (result.cleanup_count) {
      try {
        const response = await fetch('/api/drive/cleanup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deletionId: result.deletion_id }), signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) console.error('Drive cleanup remains queued')
      } catch { console.error('Drive cleanup remains queued') }
    }
    await fetchItems()
  }, [supabase, fetchItems, commitItems])

  // Renomear item
  const renameItem = useCallback(async (itemId: string, newName: string) => {
    const generation = context.current.generation
    const { data, error } = await supabase
      .from('drive_items')
      .update({ name: newName })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    if (!data || data.id !== itemId) throw new Error('Alteração não confirmada')

    commitItems(generation, prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, name: data.name, updatedAt: new Date(data.updated_at) }
          : item
      )
    )
  }, [supabase, commitItems])

  // Mover item para outra pasta (ou raiz se targetFolderId === null)
  const moveItem = useCallback(async (itemId: string, targetFolderId: string | null) => {
    const generation = context.current.generation
    const item = items.find(i => i.id === itemId)
    if (!item) throw new Error('Item not found')

    // Não mover pasta para dentro de si mesma ou de seus filhos
    if (item.type === 'folder' && targetFolderId) {
      let checkId: string | null = targetFolderId
      const visited = new Set<string>()
      while (checkId) {
        if (checkId === itemId) throw new Error('Cannot move folder into itself')
        if (visited.has(checkId)) throw new Error('Invalid folder hierarchy')
        visited.add(checkId)
        const parent = items.find(i => i.id === checkId)
        checkId = parent?.parentId || null
      }
    }

    // Não mover se já está no destino
    const currentParent = item.parentId || null
    if (currentParent === targetFolderId) return

    const { data, error } = await supabase
      .from('drive_items')
      .update({ parent_id: targetFolderId })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    if (!data || data.id !== itemId) throw new Error('Alteração não confirmada')

    // Atualizar estado local
    commitItems(generation, prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, parentId: data.parent_id ?? undefined, updatedAt: new Date(data.updated_at) }
          : i
      )
    )
  }, [items, supabase, commitItems])

  // Compartilhar item com usuário
  const shareItem = useCallback(async (input: ShareItemInput) => {
    if (!user) throw new Error('User not authenticated')

    const item = items.find(i => i.id === input.itemId)
    if (!item) throw new Error('Item não encontrado')

    // Verificar se já existe compartilhamento
    const { data: existing, error: lookupError } = await supabase
      .from('shared_access')
      .select('id')
      .eq('item_id', input.itemId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (lookupError) throw lookupError

    if (existing) {
      // Atualizar permissão existente
      const { error } = await supabase
        .from('shared_access')
        .update({ permission: input.permission })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (error) throw error
    } else {
      // Criar novo compartilhamento
      const { error } = await supabase
        .from('shared_access')
        .insert({
          item_id: input.itemId,
          user_id: input.userId,
          shared_by: user.id,
          permission: input.permission,
        })
        .select('id')
        .single()

      if (error) throw error
    }

    // Refetch items para atualizar UI
    await fetchItems()
  }, [user, items, supabase, fetchItems])

  // Remover compartilhamento
  const unshareItem = useCallback(async (itemId: string, userId: string) => {
    const { error } = await supabase
      .from('shared_access')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (error) throw error

    // Refetch items para atualizar UI
    await fetchItems()
  }, [supabase, fetchItems])

  // Atualizar permissão de compartilhamento
  const updateShare = useCallback(async (itemId: string, userId: string, permission: SharePermission) => {
    const { error } = await supabase
      .from('shared_access')
      .update({ permission })
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (error) throw error

    // Refetch items para atualizar UI
    await fetchItems()
  }, [supabase, fetchItems])

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
    const generation = context.current.generation
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newPublicState = !item.isPublic

    const { data, error } = await supabase
      .from('drive_items')
      .update({ is_public: newPublicState })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    if (!data || data.id !== itemId) throw new Error('Alteração não confirmada')

    commitItems(generation, prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, isPublic: data.is_public, updatedAt: new Date(data.updated_at) }
          : item
      )
    )
  }, [items, supabase, commitItems])

  // Gerar link de compartilhamento
  const copyShareLink = useCallback((itemId: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://office.vibedistro.com'
    return `${baseUrl}/drive/share/${itemId}`
  }, [])

  return {
    items,
    currentFolder,
    breadcrumbs,
    currentFolderId,
    setCurrentFolder: (folder) => navigateToFolder(folder?.id || null),
    navigateToFolder,
    goBack,
    getItemsInFolder,
    getItemById,
    getFolderPath,
    uploadFile,
    uploadFiles,
    createFolder,
    deleteItem,
    moveItem,
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
    storageUsage: items.reduce((acc, item) => acc + (item.size || 0), 0),
    storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB
  }
}
