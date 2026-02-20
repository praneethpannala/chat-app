import React from 'react'

function ChatHeader({ user }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200">

      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-600 text-lg">
          {user?.name[0]}
        </div>
        {/* Online dot */}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            user?.online ? 'bg-green-400' : 'bg-gray-300'
          }`}
        ></span>
      </div>

      {/* Name and status */}
      <div className="flex flex-col">
        <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
        <p className={`text-xs ${user?.online ? 'text-green-500' : 'text-gray-400'}`}>
          {user?.online ? 'Online' : 'Offline'}
        </p>
      </div>

    </div>
  )
}

export default ChatHeader
