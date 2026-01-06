'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { ChatRoom, Message } from '@/types/chat'
import { mockChatRooms, mockMessages, mockUsers } from '@/lib/mock-data'

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
  sendMessage: (content: string) => void
  createDM: (userId: string, userName: string) => ChatRoom
  getExistingDMUserIds: () => string[]
  getUserById: (userId: string) => ChatUser | null
  getDMUserInfo: (room: ChatRoom) => ChatUser | null
  availableUsers: ChatUser[]
  isLoading: boolean
  typingUsers: string[]
}

export function useChat(): UseChatReturn {
  const [rooms, setRooms] = useState<ChatRoom[]>(mockChatRooms)
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [isLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Separar salas por tipo
  const sectorRooms = useMemo(() => rooms.filter(r => r.type === 'sector'), [rooms])
  const dmRooms = useMemo(() => rooms.filter(r => r.type === 'dm'), [rooms])

  // Usuários disponíveis para criar DMs
  const availableUsers = useMemo(() => {
    return mockUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      sector: u.sector,
      role: u.role,
    }))
  }, [])

  // Obter IDs de usuários com DMs existentes
  const getExistingDMUserIds = useCallback(() => {
    return dmRooms.flatMap(room =>
      room.participants.filter(p => p !== 'current-user')
    )
  }, [dmRooms])

  // Obter usuário por ID
  const getUserById = useCallback((userId: string): ChatUser | null => {
    const user = mockUsers.find(u => u.id === userId)
    if (!user) return null
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      sector: user.sector,
      role: user.role,
    }
  }, [])

  // Obter informações do usuário de um DM
  const getDMUserInfo = useCallback((room: ChatRoom): ChatUser | null => {
    if (room.type !== 'dm') return null
    const otherUserId = room.participants.find(p => p !== 'current-user')
    if (!otherUserId) return null
    return getUserById(otherUserId)
  }, [getUserById])

  // Criar nova conversa DM
  const createDM = useCallback((userId: string, userName: string): ChatRoom => {
    const existingDM = rooms.find(
      r => r.type === 'dm' && r.participants.includes(userId)
    )

    if (existingDM) {
      return existingDM
    }

    const newRoom: ChatRoom = {
      id: `dm-${Date.now()}`,
      name: userName,
      type: 'dm',
      participants: ['current-user', userId],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setRooms(prev => [...prev, newRoom])
    return newRoom
  }, [rooms])

  // Filtrar mensagens da sala atual
  const currentRoomMessages = currentRoom
    ? messages.filter(m => m.roomId === currentRoom.id)
    : []

  // Simular mensagens de entrada (apenas para demo)
  useEffect(() => {
    if (!currentRoom) return

    const simulateIncomingMessage = () => {
      const randomDelay = Math.random() * 8000 + 2000 // 2-10 segundos
      messageTimerRef.current = setTimeout(() => {
        // 30% de chance de receber uma mensagem
        if (Math.random() > 0.7) {
          const newMessage: Message = {
            id: `msg-${Date.now()}`,
            roomId: currentRoom.id,
            userId: `user-${Math.floor(Math.random() * 20) + 1}`,
            content: getRandomMessage(),
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, newMessage])
        }
        simulateIncomingMessage()
      }, randomDelay)
    }

    simulateIncomingMessage()

    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current)
      }
    }
  }, [currentRoom])

  const sendMessage = useCallback((content: string) => {
    if (!currentRoom || !content.trim()) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      roomId: currentRoom.id,
      userId: 'current-user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, newMessage])

    // Simular digitação de resposta
    setTypingUsers(['other-user'])
    setTimeout(() => {
      setTypingUsers([])
    }, 1500)
  }, [currentRoom])

  return {
    rooms,
    sectorRooms,
    dmRooms,
    currentRoom,
    messages: currentRoomMessages,
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

// Mensagens aleatórias para simular atividade
const randomMessages = [
  'Ótimo trabalho no projeto!',
  'Podemos agendar uma reunião?',
  'Qual é o status do deliverable?',
  'Aprovado! Vamos seguir com a próxima fase.',
  'Pode revisar o documento enviado?',
  'Conforme conversamos antes...',
  'Adorei a apresentação!',
  'Você pode enviar os arquivos?',
  'Perfeito! Vamos em frente.',
  'Tenho uma sugestão para melhorar.',
]

function getRandomMessage(): string {
  return randomMessages[Math.floor(Math.random() * randomMessages.length)]
}
