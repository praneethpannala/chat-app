import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'

function Sidebar({ onSelectUser, selectedUser, users }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full">

      {/* App Name */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-500">💬 Zync</h1>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-2">
        {users.map((u) => (
          <div
            key={u.id}
            onClick={() => onSelectUser(u)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
              selectedUser?.id === u.id
                ? 'bg-blue-50 border border-blue-100'
                : 'hover:bg-gray-100'
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-600">
                {u.name[0]}
              </div>
              {/* Online dot */}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  u.online ? 'bg-green-400' : 'bg-gray-300'
                }`}
              ></span>
            </div>

            {/* Name and status */}
            <div>
              <p className="font-medium text-gray-700">{u.name}</p>
              <p className="text-xs text-gray-400">
                {u.online ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Current User at bottom */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={user?.photoURL || 'https://via.placeholder.com/40'}
            alt="profile"
            className="w-9 h-9 rounded-full"
          />
          <p className="text-sm font-medium text-gray-600">
            {user?.displayName}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-red-400 hover:text-red-600"
        >
          Logout
        </button>
      </div>

    </div>
  )
}

export default Sidebar