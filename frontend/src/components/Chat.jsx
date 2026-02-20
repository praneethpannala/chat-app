import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './SideBar'
import ChatWindow from './ChatWindow'
import InputBar from './InputBar'

function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // if not logged in, go back to login page
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