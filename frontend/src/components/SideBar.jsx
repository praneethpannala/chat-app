import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Search, LogOut } from 'lucide-react'

function Sidebar({ users, onSelectUser, selectedUser }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">

      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-500">Zync</h1>
      </div>

      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full text-gray-600 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              onClick={() => onSelectUser(u)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                selectedUser?.id === u.id
                  ? 'bg-blue-50 border border-blue-100'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-600">
                  {u.name[0]}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    u.online ? 'bg-green-400' : 'bg-gray-300'
                  }`}
                ></span>
              </div>

              <div>
                <p className="font-medium text-gray-700">{u.name}</p>
                <p className="text-xs text-gray-400">
                  {u.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-300 text-sm mt-6">No users found</p>
        )}
      </div>

      {/* Current User at bottom */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={user?.photoURL || 'https://via.placeholder.com/40'}
            alt="profile"
            className="w-9 h-9 rounded-full"
          />
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-700">
              {user?.displayName}
            </p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>

        {/* Logout Icon Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
        >
          <LogOut size={18} />
        </button>
      </div>

    </div>
  )
}

export default Sidebar