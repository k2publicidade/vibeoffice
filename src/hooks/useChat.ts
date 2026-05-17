'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useArchiveChat } from './useArchiveChat'
import { ChatRoom, Message } from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'
import { EventBus } from '@/lib/notifications/eventBus'
import {
  validateProjectGroup,
  canManageGroup,
  type CreateProjectGroupData
} from '@/types/chat'
import { toast } from 'sonner'

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
  createProjectGroup: (data: CreateProjectGroupData) => Promise<ChatRoom | null>
  updateProjectGroup: (roomId: string, updates: { name?: string; description?: string }) => Promise<boolean>
  addMemberToProject: (roomId: string, userId: string) => Promise<boolean>
  removeMemberFromProject: (roomId: string, userId: string) => Promise<boolean>
}

export function useChat(): UseChatReturn {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { user } = useAuth()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])
  const { isRoomArchived, unarchiveRoom } = useArchiveChat(user?.id)

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

      // [C08] Adicionados campos sector, description, createdBy ao map
      setRooms(
        data.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type as 'sector' | 'dm',
          participants: r.participants,
          sector: r.sector || undefined,
          description: r.description || undefined,
          createdBy: r.created_by || undefined,
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

  // [M03] Corrigido: usar user?.id ao invés de 'current-user' hardcoded
  const getExistingDMUserIds = useCallback(() => {
    return dmRooms.flatMap(room =>
      room.participants.filter(p => p !== user?.id)
    )
  }, [dmRooms, user])

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
  }, [supabase])

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
  }, [rooms, user, supabase])

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
          async (payload) => {
            const newMessage: Message = {
              id: payload.new.id,
              roomId: payload.new.room_id,
              userId: payload.new.user_id,
              content: payload.new.content,
              timestamp: new Date(payload.new.timestamp),
            }
            // [M12] Prevenir duplicatas de mensagens via race condition Realtime
            setMessages((prev) => {
              if (prev.some(m => m.id === newMessage.id)) return prev
              return [...prev, newMessage]
            })

            // Auto-unarchive: if message is from someone else and room is archived, unarchive it
            if (newMessage.userId !== user?.id && isRoomArchived(currentRoom!.id)) {
              try {
                await unarchiveRoom(currentRoom!.id)
                if (process.env.NODE_ENV === 'development') console.log('Auto-unarchived room:', currentRoom!.name)
              } catch (error) {
                console.error('Failed to auto-unarchive room:', error)
              }
            }
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
  }, [currentRoom, user, supabase, isRoomArchived, unarchiveRoom])

  const sendMessage = useCallback(async (content: string) => {
    if (!currentRoom || !content.trim() || !user) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single()

      if (error) throw error

      // Validar que data existe antes de usar
      if (!data) {
        console.error('[useChat] Message insert returned no data')
        return
      }

      // Atualizar updated_at da sala (opcional, pode ter trigger no banco)
      const updateResult = await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentRoom.id)

      if (updateResult.error) {
        console.error('[useChat] Failed to update room timestamp:', updateResult.error)
      }

      // Emitir notificação para todos os membros da sala (exceto o sender)
      const recipients = (currentRoom.participants || []).filter(memberId => memberId !== user.id)

      if (recipients.length > 0) {
        EventBus.emit({
          type: 'message_received',
          recipientIds: recipients,
          priority: 'low',
          entityType: 'message',
          entityId: data.id,
          metadata: {
            roomName: currentRoom.name,
            roomId: currentRoom.id,
            senderName: user.name,
            messagePreview: content.trim().substring(0, 50),
          },
        }).catch((err) => {
          console.error('[useChat] Failed to emit notification:', err)
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [currentRoom, user, supabase])

  /**
   * Cria novo grupo de projeto
   * @param data Dados do grupo (nome, descrição, membros)
   * @returns ChatRoom criado ou null se erro
   */
  const createProjectGroup = async (
    data: CreateProjectGroupData
  ): Promise<ChatRoom | null> => {
    if (!user?.id) {
      toast.error('Você precisa estar autenticado')
      return null
    }

    // Validar dados
    const validation = validateProjectGroup(data)
    if (!validation.valid) {
      toast.error(validation.error)
      return null
    }

    // Garantir que criador está nos participantes
    const participants = Array.from(new Set([user.id, ...data.memberIds]))

    try {
      setIsLoading(true)

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: data.name.trim(),
          type: 'project',
          description: data.description.trim(),
          created_by: user.id,
          participants: participants
        })
        .select()
        .single()

      if (error) throw error

      // Mapear para ChatRoom interface
      const mappedRoom: ChatRoom = {
        id: newRoom.id,
        name: newRoom.name,
        type: newRoom.type,
        sector: newRoom.sector || undefined,
        description: newRoom.description || undefined,
        createdBy: newRoom.created_by || undefined,
        participants: newRoom.participants,
        createdAt: new Date(newRoom.created_at),
        updatedAt: new Date(newRoom.updated_at)
      }

      // Atualizar estado local
      setRooms(prev => [mappedRoom, ...prev])
      setCurrentRoom(mappedRoom)

      toast.success('Grupo de projeto criado!')
      return mappedRoom

    } catch (error) {
      console.error('Error creating project group:', error)
      toast.error('Erro ao criar grupo')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Atualiza nome e/ou descrição de grupo de projeto
   * @param roomId ID do grupo
   * @param updates Campos a atualizar
   * @returns true se sucesso, false se erro
   */
  const updateProjectGroup = async (
    roomId: string,
    updates: { name?: string; description?: string }
  ): Promise<boolean> => {
    if (!user?.id) return false

    const room = rooms.find(r => r.id === roomId)
    if (!room || !canManageGroup(room, user.id)) {
      toast.error('Você não tem permissão para editar este grupo')
      return false
    }

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .eq('created_by', user.id)
        .eq('type', 'project')

      if (error) throw error

      // Atualizar estado local
      setRooms(prev => prev.map(r =>
        r.id === roomId ? { ...r, ...updates } : r
      ))

      if (currentRoom?.id === roomId) {
        setCurrentRoom(prev => prev ? { ...prev, ...updates } : null)
      }

      toast.success('Grupo atualizado!')
      return true

    } catch (error) {
      console.error('Error updating project group:', error)
      toast.error('Erro ao atualizar grupo')
      return false
    }
  }

  /**
   * Adiciona membro a grupo de projeto
   * @param roomId ID do grupo
   * @param userId ID do usuário a adicionar
   * @returns true se sucesso, false se erro
   */
  const addMemberToProject = async (
    roomId: string,
    userId: string
  ): Promise<boolean> => {
    if (!user?.id) return false

    const room = rooms.find(r => r.id === roomId)
    if (!room || !canManageGroup(room, user.id)) {
      toast.error('Sem permissão para adicionar membros')
      return false
    }

    // Verificar se usuário já é membro
    if (room.participants.includes(userId)) {
      toast.error('Usuário já é membro do grupo')
      return false
    }

    const newParticipants = [...room.participants, userId]

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          participants: newParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)

      if (error) throw error

      // Atualizar estado local
      setRooms(prev => prev.map(r =>
        r.id === roomId
          ? { ...r, participants: newParticipants }
          : r
      ))

      if (currentRoom?.id === roomId) {
        setCurrentRoom(prev => prev
          ? { ...prev, participants: newParticipants }
          : null
        )
      }

      toast.success('Membro adicionado!')
      return true

    } catch (error) {
      console.error('Error adding member:', error)
      toast.error('Erro ao adicionar membro')
      return false
    }
  }

  /**
   * Remove membro de grupo de projeto
   * @param roomId ID do grupo
   * @param userId ID do usuário a remover
   * @returns true se sucesso, false se erro
   */
  const removeMemberFromProject = async (
    roomId: string,
    userId: string
  ): Promise<boolean> => {
    if (!user?.id) return false

    const room = rooms.find(r => r.id === roomId)
    if (!room || !canManageGroup(room, user.id)) {
      toast.error('Sem permissão para remover membros')
      return false
    }

    // Impedir remoção do criador
    if (userId === room.createdBy) {
      toast.error('O criador do grupo não pode ser removido')
      return false
    }

    const newParticipants = room.participants.filter(id => id !== userId)

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          participants: newParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)

      if (error) throw error

      // Atualizar estado local
      setRooms(prev => prev.map(r =>
        r.id === roomId
          ? { ...r, participants: newParticipants }
          : r
      ))

      if (currentRoom?.id === roomId) {
        setCurrentRoom(prev => prev
          ? { ...prev, participants: newParticipants }
          : null
        )
      }

      toast.success('Membro removido!')
      return true

    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Erro ao remover membro')
      return false
    }
  }

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
    createProjectGroup,
    updateProjectGroup,
    addMemberToProject,
    removeMemberFromProject,
  }
}
