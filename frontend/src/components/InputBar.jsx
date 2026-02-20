import { useState } from 'react'

function InputBar({ onSend }) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (!message.trim()) return
    onSend(message)
    setMessage('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-white">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="bg-blue-500 text-white px-5 py-2 rounded-xl text-sm hover:bg-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  )
}

export default InputBar