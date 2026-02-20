import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './SideBar'
import ChatWindow from './ChatWindow'
import InputBar from './InputBar'
import ChatHeader from './ChatHeader'

const users = [
  { id: 1, name: 'Alice', online: true },
  { id: 2, name: 'Bob', online: false },
  { id: 3, name: 'Charlie', online: true },
  { id: 4, name: 'Diana', online: false },
]

const initialMessages = [
  { id: 1, text: 'Hey there!', senderId: 'alice', senderName: 'Alice', time: '10:00 AM', status: 'read' },
  { id: 2, text: 'Hello! How are you?', senderId: 'me', senderName: 'Me', time: '10:01 AM', status: 'read' },
  { id: 3, text: 'I am doing great!', senderId: 'alice', senderName: 'Alice', time: '10:02 AM', status: 'read' },
]

function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedUser, setSelectedUser] = useState(users[0])
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    if (!user) navigate('/')
  }, [user])

  const handleSendMessage = (text) => {
    const newMessage = {
      id: messages.length + 1,
      text,
      senderId: 'me',
      senderName: 'Me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleClearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex h-screen bg-gray-100">

      <div className="w-1/4 bg-white border-r border-gray-200">
        <Sidebar
          users={users}
          onSelectUser={setSelectedUser}
          selectedUser={selectedUser}
        />
      </div>

      <div className="flex flex-col w-3/4">
        <ChatHeader user={selectedUser} onClearChat={handleClearChat} />

        <div className="flex-1 overflow-y-auto">
          <ChatWindow messages={messages} />
        </div>

        <div className="border-t border-gray-200">
          <InputBar onSend={handleSendMessage} />
        </div>
      </div>

    </div>
  )
}

export default Chat