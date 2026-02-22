import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './SideBar'
import ChatWindow from './ChatWindow'
import InputBar from './InputBar'
import ChatHeader from './ChatHeader'
import useSocket from '../hooks/useSocket'
import axios from 'axios'

function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const { messages, onlineUsers, sendMessage, getMessages, clearChat } = useSocket()

  useEffect(() => {
    if (!user) navigate('/')
  }, [user, navigate])

  useEffect(() => {
    if (user) fetchUsers()
  }, [user])

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser.uid)
    }
  }, [selectedUser, getMessages])

  const fetchUsers = async () => {
    try {
      const token = await user.getIdToken()
      const response = await axios.get('http://localhost:3001/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const fetchedUsers = response.data
      setUsers(fetchedUsers)
      if (fetchedUsers.length > 0) {
        setSelectedUser(fetchedUsers[0])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const updatedUsers = users.map((u) => ({
    ...u,
    online: onlineUsers.includes(u.uid),
  }))

  const handleSendMessage = (text) => {
    sendMessage(selectedUser.uid, text)
  }

  const handleClearChat = () => {
    clearChat(selectedUser.uid)
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
        {selectedUser ? (
          <>
            <ChatHeader user={selectedUser} onClearChat={handleClearChat} />
            <div className="flex-1 overflow-y-auto">
              <ChatWindow messages={messages} currentUserId={user?.uid} />
            </div>
            <div className="border-t border-gray-200">
              <InputBar onSend={handleSendMessage} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <p className="text-6xl mb-4">💬</p>
            <p className="text-xl font-semibold">Welcome to Zync</p>
            <p className="text-sm mt-2">No users found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat