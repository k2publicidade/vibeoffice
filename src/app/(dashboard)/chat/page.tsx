'use client'

import { useState, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatListPremium } from '@/components/chat/ChatListPremium'
import { ChatRoomPremium } from '@/components/chat/ChatRoomPremium'
import { NewConversationModal } from '@/components/chat/NewConversationModal'
import { ChatRoom } from '@/types/chat'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function ChatPage() {
  const {
    rooms,
    currentRoom,
    messages,
    setCurrentRoom,
    sendMessage,
    sendAttachment,
    unreadCounts,
    lastMessages,
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
  } = useChat()

  const [showChatList, setShowChatList] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  // Selecionar primeiro room automaticamente
  useEffect(() => {
    if (!currentRoom && rooms.length > 0) {
      setCurrentRoom(rooms[0])
    }
  }, [rooms, currentRoom, setCurrentRoom])

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
    try {
    const newRoom = await createDM(user.id, user.name)
    setCurrentRoom(newRoom)
    setShowNewConversationModal(false)
    } catch { toast.error('Não foi possível iniciar a conversa. Tente novamente.') }
  }

  return (
    <>
      <div className="flex flex-col bg-background text-foreground overflow-hidden h-[calc(100vh-64px)]">
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Integrated List */}
          <div className={cn(
            "bg-black border-r border-[#ff0300]/20 flex flex-col transition-all duration-300 shrink-0 overflow-hidden",
            "absolute lg:relative top-0 left-0 h-full z-40 lg:z-auto",
            showChatList ? "w-full lg:w-80 translate-x-0" : "w-full lg:w-80 -translate-x-full lg:translate-x-0"
          )}>
            <ChatListPremium
              rooms={rooms}
              selectedRoom={currentRoom}
              onSelectRoom={handleSelectRoom}
              onNewConversation={() => setShowNewConversationModal(true)}
              unreadCounts={unreadCounts}
              lastMessages={lastMessages}
              getDMUserInfo={getDMUserInfo}
              createProjectGroup={createProjectGroup}
            />
          </div>

          {/* Overlay for mobile */}
          {showChatList && currentRoom && (
            <div
              className="fixed inset-0 bg-black/50 lg:hidden z-30"
              onClick={() => setShowChatList(false)}
              aria-hidden="true"
            />
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black">
            <ChatRoomPremium
              room={currentRoom}
              messages={messages}
              onSendMessage={sendMessage}
              onSendAttachment={sendAttachment}
              typingUsers={typingUsers}
              onTypingChange={setTyping}
              onUpdateGroup={updateProjectGroup}
              onAddMember={addMemberToProject}
              onRemoveMember={removeMemberFromProject}
              isLoading={isLoading}
              onBack={handleBackToList}
              getDMUserInfo={getDMUserInfo}
            />
          </div>
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
