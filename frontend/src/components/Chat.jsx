import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './SideBar'
import ChatWindow from './ChatWindow'
import InputBar from './InputBar'
import ChatHeader from './ChatHeader'

// dummy selected user for now
const selectedUser = { id: 1, name: 'Alice', online: true }

function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/')
  }, [user])

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Left Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200">
        <Sidebar />
      </div>

      {/* Right Chat Area */}
      <div className="flex flex-col w-3/4">

        {/* Chat Header */}
        <ChatHeader user={selectedUser} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <ChatWindow />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200">
          <InputBar />
        </div>

      </div>
    </div>
  )
}

export default Chat