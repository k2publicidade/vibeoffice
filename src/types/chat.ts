/**
 * Chat Module Types
 * Defines chat rooms, messages, and communication structure
 */

import { Sector } from './auth'

export type RoomType = 'sector' | 'dm'

export interface ChatRoom {
  id: string
  name: string
  type: RoomType
  sector?: Sector // For sector rooms
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
