import { Trash2 } from 'lucide-react'

function ChatHeader({ user, onClearChat }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">

      <div className="flex items-center gap-3">
        <div className="relative">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-600 text-lg">
              {user?.name?.[0]}
            </div>
          )}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              user?.online ? 'bg-green-400' : 'bg-gray-300'
            }`}
          ></span>
        </div>

        <div className="flex flex-col">
          <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
          <p className={`text-xs ${user?.online ? 'text-green-500' : 'text-gray-400'}`}>
            {user?.online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      <button
        onClick={onClearChat}
        className="flex items-center gap-2 text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition text-sm"
      >
        <Trash2 size={16} />
        <span>Clear Chat</span>
      </button>

    </div>
  )
}

export default ChatHeader