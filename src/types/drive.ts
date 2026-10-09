/**
 * Drive Module Types
 * Defines file structure, folders, permissions and sharing
 */

import { Sector } from './auth'

export type ItemType = 'file' | 'folder'
export type SharePermission = 'view' | 'edit' | 'manage'

export interface DriveItem {
  id: string
  name: string
  type: ItemType
  parentId?: string // Null for root items
  sector?: Sector // Acesso controlado por setor
  size?: number // In bytes
  mimeType?: string
  url?: string // Para integração com S3 futura
  uploadedBy: string // User ID
  sharedWith?: SharedAccess[] // Lista de acessos compartilhados
  isPublic?: boolean // Se é acessível publicamente
  inheritsPublic?: boolean
  canManage?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SharedAccess {
  userId: string
  permission: SharePermission
  sharedAt: Date
  sharedBy: string // User ID who shared
}

export interface DrivePermission {
  itemId: string
  sector?: Sector
  allowedRoles?: string[]
  isPublic: boolean
}

export interface ShareItemInput {
  itemId: string
  userId: string
  permission: SharePermission
}

export interface SharedWithMe {
  item: DriveItem
  permission: SharePermission
  sharedBy: string
  sharedAt: Date
}
