'use client'

import { useState, useMemo } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatListPremium } from '@/components/chat/ChatListPremium'
import { ChatRoomPremium } from '@/components/chat/ChatRoomPremium'
import { NewConversationModal } from '@/components/chat/NewConversationModal'
import { ChatRoom, Message } from '@/types/chat'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const {
    rooms,
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
  } = useChat()

  const [showChatList, setShowChatList] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  // Selecionar primeiro room automaticamente
  if (!currentRoom && rooms.length > 0) {
    setCurrentRoom(rooms[0])
  }

  // Simular contagem de mensagens não lidas
  const unreadCounts: Record<string, number> = {
    [rooms[0]?.id]: 3,
    [rooms[3]?.id]: 1,
    [rooms[1]?.id]: 5,
    'dm-001': 2,
  }

  // Obter última mensagem de cada sala para preview
  const lastMessages = useMemo(() => {
    const result: Record<string, { content: string; timestamp: Date }> = {}
    rooms.forEach(room => {
      const roomMessages = messages.filter((m: Message) => m.roomId === room.id)
      if (roomMessages.length > 0) {
        const lastMsg = roomMessages[roomMessages.length - 1]
        result[room.id] = {
          content: lastMsg.content,
          timestamp: lastMsg.timestamp,
        }
      }
    })
    return result
  }, [rooms, messages])

  const handleSelectRoom = (room: ChatRoom) => {
    setCurrentRoom(room)
    // Em mobile, esconder a lista ao selecionar um chat
    if (window.innerWidth < 1024) {
      setShowChatList(false)
    }
  }

  const handleBackToList = () => {
    setShowChatList(true)
  }

  const handleNewConversation = async (user: { id: string; name: string }) => {
    const newRoom = await createDM(user.id, user.name)
    setCurrentRoom(newRoom)
    setShowNewConversationModal(false)
  }

  return (
    <>
      <div className="fixed inset-0 top-16 bottom-0 flex bg-black text-white overflow-hidden">
        {/* Sidebar - Integrated List (w-80) */}
        <div className={cn(
          "bg-black border-r border-[#ff0300]/20 flex flex-col transition-all duration-300 shrink-0",
          showChatList ? "w-full lg:w-80" : "w-0 lg:w-80 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto"
        )}>
          <ChatListPremium
            rooms={rooms}
            selectedRoom={currentRoom}
            onSelectRoom={handleSelectRoom}
            onNewConversation={() => setShowNewConversationModal(true)}
            unreadCounts={unreadCounts}
            lastMessages={lastMessages}
            getDMUserInfo={getDMUserInfo}
          />
        </div>

        {/* Main Chat Area (flex-1) */}
        <div className={cn(
          "flex-1 flex flex-col bg-black transition-all duration-300",
          !showChatList ? "fixed inset-0 top-16 z-50 lg:relative lg:top-0" : "hidden lg:flex"
        )}>
          <ChatRoomPremium
            room={currentRoom}
            messages={messages}
            onSendMessage={sendMessage}
            typingUsers={typingUsers}
            isLoading={isLoading}
            onBack={handleBackToList}
            getDMUserInfo={getDMUserInfo}
          />
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onSelectUser={handleNewConversation}
        users={availableUsers}
        existingDMUserIds={getExistingDMUserIds()}
      />
    </>
  )
}
