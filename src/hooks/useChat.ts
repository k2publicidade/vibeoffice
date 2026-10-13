'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useArchiveChat } from './useArchiveChat'
import { ChatRoom, Message } from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'
import { extractMentionedUserIds } from '@/lib/mentions'
import { uploadFile, deleteFile } from '@/lib/supabase/storage'
import {
  validateProjectGroup,
  canManageGroup,
  type CreateProjectGroupData
} from '@/types/chat'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/database.types'
type MessageRow = Database['public']['Tables']['messages']['Row']
type RoomRow = Database['public']['Tables']['chat_rooms']['Row']
function mapRoom(row: RoomRow): ChatRoom {
  return { id: row.id, name: row.name, type: row.type, sector: row.sector || undefined, description: row.description || undefined, createdBy: row.created_by || undefined, participants: row.participants, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) }
}
function mapMessage(row: MessageRow): Message {
  return { id: row.id, roomId: row.room_id, userId: row.user_id, content: row.content, type: row.type, reactions: row.reactions as Message['reactions'], readBy: row.read_by as Message['readBy'], mentionedUsers: row.mentioned_users, timestamp: new Date(row.timestamp) }
}
const orderMessages = (messages: Message[]) => messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime() || a.id.localeCompare(b.id))

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
  sendAttachment: (file: File) => Promise<void>
  unreadCounts: Record<string, number>
  lastMessages: Record<string, { content: string; timestamp: Date }>
  createDM: (userId: string, userName: string) => Promise<ChatRoom>
  getExistingDMUserIds: () => string[]
  getUserById: (userId: string) => Promise<ChatUser | null>
  getDMUserInfo: (room: ChatRoom) => Promise<ChatUser | null>
  availableUsers: ChatUser[]
  isLoading: boolean
  typingUsers: string[]
  setTyping: (typing: boolean) => void
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
  const roomChannel = useRef<RealtimeChannel | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingAt = useRef(0)
  const [roomSummaries, setRoomSummaries] = useState<Record<string, { content: string; timestamp: Date; unread: number }>>({})
  const { user } = useAuth()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])
  const { isRoomArchived, unarchiveRoom } = useArchiveChat(user?.id)
  const archiveActions = useRef({ isRoomArchived, unarchiveRoom })
  useEffect(() => { archiveActions.current = { isRoomArchived, unarchiveRoom } }, [isRoomArchived, unarchiveRoom])
  const context = useRef({ id: user?.id, role: user?.role, sector: user?.sector, generation: 0 })
  const roomReadVersion = useRef(0)
  const userReadVersion = useRef(0)
  const groupReadVersions = useRef(new Map<string, number>())
  const activeRoomId = useRef<string | null>(null)
  const messageJournal = useRef<{ roomId: string; revision: number; events: Map<string, { message: Message | null; revision: number }> } | null>(null)
  const validSession = () => Boolean(user && context.current.id === user.id && context.current.role === user.role && context.current.sector === user.sector)
  const commitRooms = (generation: number, update: (previous: ChatRoom[]) => ChatRoom[]) => {
    if (generation !== context.current.generation) return
    roomReadVersion.current += 1
    setRooms(update)
    setIsLoading(false)
  }
  async function syncGroup(roomId: string, generation: number) {
    if (generation !== context.current.generation) return
    const version = (groupReadVersions.current.get(roomId) || 0) + 1
    groupReadVersions.current.set(roomId, version)
    const listingVersion = ++roomReadVersion.current
    try {
      const { data, error } = await supabase.from('chat_rooms').select('*').eq('id', roomId).maybeSingle()
      if (generation !== context.current.generation || groupReadVersions.current.get(roomId) !== version) return
      if (error) throw error
      const fresh = data ? mapRoom(data) : null
      commitRooms(generation, previous => fresh ? previous.map(room => room.id === roomId ? fresh : room) : previous.filter(room => room.id !== roomId))
      setCurrentRoom(previous => previous?.id === roomId ? fresh : previous)
    } finally {
      if (generation === context.current.generation && roomReadVersion.current === listingVersion) setIsLoading(false)
    }
  }
  useEffect(() => {
    context.current = { id: user?.id, role: user?.role, sector: user?.sector, generation: context.current.generation + 1 }
    roomReadVersion.current += 1; userReadVersion.current += 1
    activeRoomId.current = null
    setRooms([]); setCurrentRoom(null); setMessages([]); setAvailableUsers([]); setRoomSummaries({}); setTypingUsers([])
    setIsLoading(Boolean(user))
    return () => { context.current.generation += 1; roomReadVersion.current += 1; userReadVersion.current += 1 }
  }, [user?.id, user?.role, user?.sector])


  // Fetch inicial de salas e usuários
  useEffect(() => {
    if (!user) return

    fetchRooms()
    fetchUsers()
  }, [user?.id, user?.role, user?.sector])

  async function fetchRooms() {
    if (!validSession()) return
    const version = ++roomReadVersion.current, generation = context.current.generation
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      // [C08] Adicionados campos sector, description, createdBy ao map
      const mappedRooms: ChatRoom[] = data.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          participants: r.participants,
          sector: r.sector || undefined,
          description: r.description || undefined,
          createdBy: r.created_by || undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        }))
      if (generation !== context.current.generation || version !== roomReadVersion.current) return
      setRooms(mappedRooms)
      setCurrentRoom(previous => {
        if (!previous) return null
        const fresh = mappedRooms.find(room => room.id === previous.id)
        if (!fresh) return null
        // Message timestamps must not restart the room subscription.
        return fresh.name === previous.name && fresh.description === previous.description && fresh.type === previous.type && fresh.sector === previous.sector && fresh.createdBy === previous.createdBy &&
          fresh.participants.join(',') === previous.participants.join(',') ? previous : fresh
      })
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      if (generation === context.current.generation && version === roomReadVersion.current) setIsLoading(false)
    }
  }

  async function fetchUsers() {
    if (!validSession()) return
    const version = ++userReadVersion.current, generation = context.current.generation
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar, sector, role')
        .eq('active', true)
        .order('name')

      if (error) throw error

      if (generation !== context.current.generation || version !== userReadVersion.current) return
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

  useEffect(() => {
    if (!user) return
    let disposed = false, revision = 0
    const refresh = async () => {
      const version = ++revision
      const { data, error } = await supabase.rpc('chat_room_summaries' as never)
      if (error || disposed || version !== revision) return
      const summaries: typeof roomSummaries = {}
      for (const item of (data || []) as { room_id: string; content: string; timestamp: string; unread: number }[]) {
        summaries[item.room_id] = { content: item.content, timestamp: new Date(item.timestamp), unread: Number(item.unread) }
      }
      setRoomSummaries(summaries)
    }
    void refresh()
    const channel = supabase.channel(`chat-summary:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => { void fetchRooms(); void refresh() })
      .subscribe()
    return () => { disposed = true; void supabase.removeChannel(channel) }
  }, [user?.id, user?.role, user?.sector, supabase])

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
    if (!user || !validSession()) throw new Error('User not authenticated')
    const generation = context.current.generation

    // Verificar se já existe DM
    const existingDM = rooms.find(
      r => r.type === 'dm' && r.participants.includes(userId)
    )

    if (existingDM) {
      return existingDM
    }

    // Criar nova sala DM no banco
    const { data: insertedRoom, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: userName,
        type: 'dm',
        participants: [user.id, userId],
        created_by: user.id,
      })
      .select()
      .single()

    let data = insertedRoom
    if (error?.code === '23505') {
      const existing = await supabase.from('chat_rooms').select('*').eq('type', 'dm').contains('participants', [user.id, userId]).single()
      if (existing.error) throw existing.error
      data = existing.data
    } else if (error) throw error
    if (!data) throw new Error('Não foi possível criar a conversa')

    const newRoom: ChatRoom = {
      id: data.id,
      name: data.name,
      type: data.type as 'dm',
      participants: data.participants,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    commitRooms(generation, prev => [...prev.filter(room => room.id !== newRoom.id), newRoom])
    return newRoom
  }, [rooms, user, supabase])

  // Fetch mensagens + subscribe Realtime quando trocar de sala
  useEffect(() => {
    activeRoomId.current = currentRoom?.id || null
    setMessages([])
    if (!currentRoom || !user) return

    let channel: RealtimeChannel
    let disposed = false

    const journal = { roomId: currentRoom.id, revision: 0, events: new Map<string, { message: Message | null; revision: number }>() }
    messageJournal.current = journal
    let historyVersion = 0
    async function syncMessages() {
      const version = ++historyVersion
      const startingRevision = journal.revision
      try {
        const { data, error } = await supabase.from('messages').select('*').eq('room_id', currentRoom!.id).order('timestamp', { ascending: true })
        if (error) throw error
        if (disposed || version !== historyVersion) return
        const merged = new Map((data || []).map(row => [row.id, mapMessage(row)]))
        for (const [id, event] of journal.events) {
          if (event.revision <= startingRevision) continue
          if (event.message) merged.set(id, event.message); else merged.delete(id)
        }
        setMessages(orderMessages([...merged.values()]))
      } catch (error) { if (!disposed) console.error('Error fetching messages:', error) }
    }
    function setupMessages() {
      // Subscribe para novas mensagens em tempo real
      channel = supabase
        .channel(`office-room:${currentRoom!.id}`, { config: { private: true, presence: { key: user!.id } } })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${currentRoom!.id}`,
          },
          async (payload) => {
            if (disposed) return
            const newMessage = mapMessage(payload.new as MessageRow)
            journal.events.set(newMessage.id, { message: newMessage, revision: ++journal.revision })
            setMessages(previous => orderMessages([...previous.filter(message => message.id !== newMessage.id), newMessage]))
            // Auto-unarchive: if message is from someone else and room is archived, unarchive it
            if (newMessage.userId !== user?.id && archiveActions.current.isRoomArchived(currentRoom!.id)) {
              try {
                await archiveActions.current.unarchiveRoom(currentRoom!.id)
                if (process.env.NODE_ENV === 'development') console.log('Auto-unarchived room:', currentRoom!.name)
              } catch (error) {
                console.error('Failed to auto-unarchive room:', error)
              }
            }
          }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoom!.id}` }, payload => {
          if (disposed) return
          const updated = mapMessage(payload.new as MessageRow)
          journal.events.set(updated.id, { message: updated, revision: ++journal.revision })
          setMessages(previous => orderMessages([...previous.filter(message => message.id !== updated.id), updated]))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
          if (disposed) return
          journal.events.set(payload.old.id, { message: null, revision: ++journal.revision })
          setMessages(previous => previous.filter(message => message.id !== payload.old.id))
        })
        .on('presence', { event: 'sync' }, () => {
          if (disposed) return
          const state = channel.presenceState<{ userId: string; name: string; typing: boolean; at: number }>()
          setTypingUsers(Array.from(new Set(Object.values(state).flat().filter(member => member.userId !== user!.id && member.typing && member.at > Date.now() - 5000).map(member => member.name))))
        })
        .subscribe(status => {
          if (disposed) return
          if (status === 'SUBSCRIBED') { roomChannel.current = channel; void channel.track({ userId: user!.id, name: user!.name, typing: false, at: Date.now() }); void syncMessages() }
        })
    }

    setupMessages()
    void syncMessages()

    return () => {
      disposed = true
      roomChannel.current = null
      setTypingUsers([])
      if (typingTimer.current) clearTimeout(typingTimer.current)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentRoom?.id, user?.id, user?.role, user?.sector, supabase])

  const setTyping = useCallback((typing: boolean) => {
    const channel = roomChannel.current
    if (!channel || !user) return
    if (typingTimer.current) clearTimeout(typingTimer.current)
    const publish = (value: boolean) => { void channel.track({ userId: user.id, name: user.name, typing: value, at: Date.now() }) }
    if (!typing || Date.now() - lastTypingAt.current > 1000) { lastTypingAt.current = Date.now(); publish(typing) }
    if (typing) typingTimer.current = setTimeout(() => publish(false), 3000)
  }, [user])

  const sendMessage = useCallback(async (content: string) => {
    if (!currentRoom || !content.trim() || !user) return
    if (!validSession()) throw new Error('Sessão alterada')
    const generation = context.current.generation

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content: content.trim(),
          mentioned_users: extractMentionedUserIds(content, availableUsers),
        })
        .select()
        .single()

      if (error) throw error

      // Validar que data existe antes de usar
      if (!data) {
        throw new Error('Mensagem não foi salva')
      }

      if (generation === context.current.generation && activeRoomId.current === currentRoom.id) {
        const journal = messageJournal.current
        if (journal?.roomId === currentRoom.id && !journal.events.has(data.id)) {
          const saved = mapMessage(data)
          journal.events.set(saved.id, { message: saved, revision: ++journal.revision })
          setMessages(previous => orderMessages([...previous.filter(message => message.id !== saved.id), saved]))
        }
      }
      // Notifications and room timestamps are generated atomically by the database.
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [currentRoom, user, supabase, availableUsers])

  const sendAttachment = useCallback(async (file: File) => {
    if (!currentRoom || !user) throw new Error('Selecione uma conversa')
    if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter até 50 MB')
    const path = `${currentRoom.id}/${crypto.randomUUID()}`
    const uploaded = await uploadFile({ file, bucket: 'message-assets', path })
    try {
      const { error } = await supabase.from('messages').insert({ room_id: currentRoom.id, user_id: user.id, type: file.type.startsWith('image/') ? 'image' : 'file', content: JSON.stringify({ name: file.name, url: uploaded.url, size: file.size, mime: file.type }) })
      if (error) throw error
    } catch (error) { await deleteFile('message-assets', path).catch(() => undefined); throw error }
  }, [currentRoom, user, supabase])

  /**
   * Cria novo grupo de projeto
   * @param data Dados do grupo (nome, descrição, membros)
   * @returns ChatRoom criado ou null se erro
   */
  const createProjectGroup = async (
    data: CreateProjectGroupData
  ): Promise<ChatRoom | null> => {
    if (!user?.id || !validSession()) {
      toast.error('Você precisa estar autenticado')
      return null
    }

    const generation = context.current.generation
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
      if (!newRoom) throw new Error('Criação não confirmada')

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
      if (generation !== context.current.generation) return mappedRoom
      commitRooms(generation, prev => [mappedRoom, ...prev.filter(room => room.id !== mappedRoom.id)])
      setCurrentRoom(mappedRoom)

      toast.success('Grupo de projeto criado!')
      return mappedRoom

    } catch (error) {
      console.error('Error creating project group:', error)
      toast.error('Erro ao criar grupo')
      return null
    } finally {
      if (generation === context.current.generation) setIsLoading(false)
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
    if (!user?.id || !validSession()) return false
    const generation = context.current.generation

    const room = rooms.find(r => r.id === roomId)
    if (!room || !canManageGroup(room, user.id)) {
      toast.error('Você não tem permissão para editar este grupo')
      return false
    }

    let confirmed = false
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .eq('created_by', user.id)
        .eq('type', 'project')
        .select('*')
        .single()

      if (error) throw error
      if (!data) throw new Error('Alteração não confirmada')
      confirmed = true
      if (generation !== context.current.generation) return true

      await syncGroup(roomId, generation)

      toast.success('Grupo atualizado!')
      return true

    } catch (error) {
      console.error('Error updating project group:', error)
      toast.error(confirmed ? 'Alteração registrada, mas não foi possível atualizar a conversa. Tente novamente.' : 'Erro ao atualizar grupo')
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
    if (!user?.id || !validSession()) return false
    const generation = context.current.generation

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

    let confirmed = false
    try {
      const { data, error } = await supabase.rpc('manage_group_member', { room_id: roomId, member_id: userId, adding: true })

      if (error) throw error
      if (!data || !Array.isArray(data.participants)) throw new Error('Alteração não confirmada')
      confirmed = true
      if (generation !== context.current.generation) return true
      await syncGroup(roomId, generation)

      toast.success('Membro adicionado!')
      return true

    } catch (error) {
      console.error('Error adding member:', error)
      toast.error(confirmed ? 'Alteração registrada, mas não foi possível atualizar a conversa. Tente novamente.' : 'Erro ao adicionar membro')
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
    if (!user?.id || !validSession()) return false
    const generation = context.current.generation

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

    let confirmed = false
    try {
      const { data, error } = await supabase.rpc('manage_group_member', { room_id: roomId, member_id: userId, adding: false })

      if (error) throw error
      if (!data || !Array.isArray(data.participants)) throw new Error('Alteração não confirmada')
      confirmed = true
      if (generation !== context.current.generation) return true
      await syncGroup(roomId, generation)

      toast.success('Membro removido!')
      return true

    } catch (error) {
      console.error('Error removing member:', error)
      toast.error(confirmed ? 'Alteração registrada, mas não foi possível atualizar a conversa. Tente novamente.' : 'Erro ao remover membro')
      return false
    }
  }

  return {
    rooms,
    sectorRooms,
    dmRooms,
    currentRoom,
    messages,
    setCurrentRoom: (room: ChatRoom) => {
      if (!validSession()) return
      if (activeRoomId.current !== room.id) setMessages([])
      activeRoomId.current = room.id
      setCurrentRoom(room)
    },
    sendMessage,
    sendAttachment,
    unreadCounts: Object.fromEntries(Object.entries(roomSummaries).map(([id, summary]) => [id, summary.unread])),
    lastMessages: Object.fromEntries(Object.entries(roomSummaries).map(([id, summary]) => [id, { content: summary.content, timestamp: summary.timestamp }])),
    createDM,
    getExistingDMUserIds,
    getUserById,
    getDMUserInfo,
    availableUsers,
    isLoading,
    typingUsers,
    setTyping,
    createProjectGroup,
    updateProjectGroup,
    addMemberToProject,
    removeMemberFromProject,
  }
}
