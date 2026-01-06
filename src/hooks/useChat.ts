'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { ChatRoom, Message } from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatUser {
  id: string
  name: string
  email: string
  avatar?: string
  sector: string
  role: string
}

export interface UseChatReturn {
  rooms: ChatRoom[]
  sectorRooms: ChatRoom[]
  dmRooms: ChatRoom[]
  currentRoom: ChatRoom | null
  messages: Message[]
  setCurrentRoom: (room: ChatRoom) => void
  sendMessage: (content: string) => Promise<void>
  createDM: (userId: string, userName: string) => Promise<ChatRoom>
  getExistingDMUserIds: () => string[]
  getUserById: (userId: string) => Promise<ChatUser | null>
  getDMUserInfo: (room: ChatRoom) => Promise<ChatUser | null>
  availableUsers: ChatUser[]
  isLoading: boolean
  typingUsers: string[]
}

export function useChat(): UseChatReturn {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { user } = useAuth()

  // Fetch inicial de salas e usuários
  useEffect(() => {
    if (!user) return

    fetchRooms()
    fetchUsers()
  }, [user])

  async function fetchRooms() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .contains('participants', [user!.id])
        .order('updated_at', { ascending: false })

      if (error) throw error

      setRooms(
        data.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type as 'sector' | 'dm',
          participants: r.participants,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        }))
      )
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar, sector, role')
        .order('name')

      if (error) throw error

      setAvailableUsers(
        data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || undefined,
          sector: u.sector,
          role: u.role,
        }))
      )
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Separar salas por tipo
  const sectorRooms = useMemo(() => rooms.filter(r => r.type === 'sector'), [rooms])
  const dmRooms = useMemo(() => rooms.filter(r => r.type === 'dm'), [rooms])

  // Obter IDs de usuários com DMs existentes
  const getExistingDMUserIds = useCallback(() => {
    return dmRooms.flatMap(room =>
      room.participants.filter(p => p !== 'current-user')
    )
  }, [dmRooms])

  // Obter usuário por ID
  const getUserById = useCallback(async (userId: string): Promise<ChatUser | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, avatar, sector, role')
      .eq('id', userId)
      .single()

    if (error) return null

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar || undefined,
      sector: data.sector,
      role: data.role,
    }
  }, [])

  // Obter informações do usuário de um DM
  const getDMUserInfo = useCallback(async (room: ChatRoom): Promise<ChatUser | null> => {
    if (room.type !== 'dm') return null
    const otherUserId = room.participants.find(p => p !== user?.id)
    if (!otherUserId) return null
    return await getUserById(otherUserId)
  }, [getUserById, user])

  // Criar nova conversa DM
  const createDM = useCallback(async (userId: string, userName: string): Promise<ChatRoom> => {
    if (!user) throw new Error('User not authenticated')

    // Verificar se já existe DM
    const existingDM = rooms.find(
      r => r.type === 'dm' && r.participants.includes(userId)
    )

    if (existingDM) {
      return existingDM
    }

    // Criar nova sala DM no banco
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: userName,
        type: 'dm',
        participants: [user.id, userId],
      })
      .select()
      .single()

    if (error) throw error

    const newRoom: ChatRoom = {
      id: data.id,
      name: data.name,
      type: data.type as 'dm',
      participants: data.participants,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    setRooms(prev => [...prev, newRoom])
    return newRoom
  }, [rooms, user])

  // Fetch mensagens + subscribe Realtime quando trocar de sala
  useEffect(() => {
    if (!currentRoom || !user) return

    let channel: RealtimeChannel

    async function setupMessages() {
      // Fetch mensagens da sala
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoom!.id)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      setMessages(
        data.map((m) => ({
          id: m.id,
          roomId: m.room_id,
          userId: m.user_id,
          content: m.content,
          timestamp: new Date(m.timestamp),
        }))
      )

      // Subscribe para novas mensagens em tempo real
      channel = supabase
        .channel(`room:${currentRoom!.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${currentRoom!.id}`,
          },
          (payload) => {
            const newMessage: Message = {
              id: payload.new.id,
              roomId: payload.new.room_id,
              userId: payload.new.user_id,
              content: payload.new.content,
              timestamp: new Date(payload.new.timestamp),
            }
            setMessages((prev) => [...prev, newMessage])
          }
        )
        .subscribe()
    }

    setupMessages()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentRoom, user])

  const sendMessage = useCallback(async (content: string) => {
    if (!currentRoom || !content.trim() || !user) return

    try {
      const { error } = await supabase.from('messages').insert({
        room_id: currentRoom.id,
        user_id: user.id,
        content: content.trim(),
      })

      if (error) throw error

      // Atualizar updated_at da sala (opcional, pode ter trigger no banco)
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentRoom.id)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [currentRoom, user])

  return {
    rooms,
    sectorRooms,
    dmRooms,
    currentRoom,
    messages,
    setCurrentRoom,
    sendMessage,
    createDM,
    getExistingDMUserIds,
    getUserById,
    getDMUserInfo,
    availableUsers,
    isLoading,
    typingUsers,
  }
}
