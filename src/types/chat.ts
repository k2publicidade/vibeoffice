/**
 * Chat Module Types
 * Defines chat rooms, messages, and communication structure
 */

import { Sector } from './auth'

export type RoomType = 'sector' | 'dm' | 'project'

export interface ChatRoom {
  id: string
  name: string
  type: RoomType
  sector?: Sector // For sector rooms
  description?: string // For project groups
  createdBy?: string // UUID of creator
  participants: string[] // User IDs
  messageCount?: number // Total messages in room
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  roomId: string
  userId: string // Who sent it
  content: string
  type?: 'text' | 'image' | 'file'
  timestamp: Date
  edited?: boolean
  editedAt?: Date
  reactions?: { [emoji: string]: string[] } // Emoji -> array of user IDs
  mentionedUsers?: string[] // Array of user IDs mentioned in message
  readBy?: { [userId: string]: string } // userId -> ISO timestamp when read
}

export interface DirectMessage {
  id: string
  senderId: string
  recipientId: string
  content: string
  timestamp: Date
  read: boolean
}

/**
 * Dados para criação de grupo de projeto
 */
export interface CreateProjectGroupData {
  name: string
  description: string
  memberIds: string[]
}

/**
 * Type guards para identificar tipo de sala
 */
export const isProjectGroup = (room: ChatRoom): boolean =>
  room.type === 'project'

export const isSectorRoom = (room: ChatRoom): boolean =>
  room.type === 'sector'

export const isDM = (room: ChatRoom): boolean =>
  room.type === 'dm'

/**
 * Verifica se usuário pode gerenciar o grupo (é o criador)
 */
export const canManageGroup = (room: ChatRoom, userId: string): boolean =>
  room.type === 'project' && room.createdBy === userId

/**
 * Valida dados de criação de grupo de projeto
 * @returns Objeto com valid (boolean) e error opcional
 */
export const validateProjectGroup = (
  data: CreateProjectGroupData
): { valid: boolean; error?: string } => {
  // Validar nome
  if (!data.name.trim()) {
    return { valid: false, error: 'Nome é obrigatório' }
  }

  if (data.name.length > 50) {
    return { valid: false, error: 'Nome muito longo (máx 50 caracteres)' }
  }

  // Validar descrição
  if (!data.description.trim()) {
    return { valid: false, error: 'Descrição é obrigatória' }
  }

  if (data.description.length > 200) {
    return { valid: false, error: 'Descrição muito longa (máx 200 caracteres)' }
  }

  // Validar membros (mínimo 1, criador será adicionado automaticamente)
  if (data.memberIds.length < 1) {
    return { valid: false, error: 'Selecione pelo menos 1 membro' }
  }

  return { valid: true }
}
