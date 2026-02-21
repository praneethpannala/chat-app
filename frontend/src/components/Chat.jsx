import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './SideBar'
import ChatWindow from './ChatWindow'
import InputBar from './InputBar'
import ChatHeader from './ChatHeader'
import useSocket from '../hooks/useSocket'

const users = [
  { id: '1', name: 'Alice', online: false },
  { id: '2', name: 'Bob', online: false },
  { id: '3', name: 'Charlie', online: false },
  { id: '4', name: 'Diana', online: false },
]

function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedUser, setSelectedUser] = useState(users[0])
  const { messages, onlineUsers, sendMessage, getMessages, clearChat } = useSocket()

  useEffect(() => {
    if (!user) navigate('/')
  }, [user, navigate])

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser.id)
    }
  }, [selectedUser, getMessages])

  const updatedUsers = users.map((u) => ({
    ...u,
    online: onlineUsers.includes(u.id),
  }))

  const handleSendMessage = (text) => {
    sendMessage(selectedUser.id, text)
  }

  const handleClearChat = () => {
    clearChat(selectedUser.id)
  }

  return (
    <div className="flex h-screen bg-gray-100">

      <div className="w-1/4 bg-white border-r border-gray-200">
        <Sidebar
          users={updatedUsers}
          onSelectUser={setSelectedUser}
          selectedUser={selectedUser}
        />
      </div>

      <div className="flex flex-col w-3/4">
        <ChatHeader user={selectedUser} onClearChat={handleClearChat} />

        <div className="flex-1 overflow-y-auto">
          <ChatWindow messages={messages} currentUserId={user?.uid} />
        </div>

        <div className="border-t border-gray-200">
          <InputBar onSend={handleSendMessage} />
        </div>
      </div>

    </div>
  )
}

export default Chat