import React, { useState, useRef, useEffect } from 'react'
import { Send, Smile } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'

function InputBar({ onSend }) {
  const [message, setMessage] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const emojiRef = useRef(null)

  const handleSend = () => {
    if (!message.trim()) return
    onSend(message)
    setMessage('')
    setShowEmoji(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative flex items-center gap-3 p-4 bg-white">
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-16 left-4 z-10">
          <EmojiPicker onEmojiClick={handleEmojiClick} height={350} width={300} />
        </div>
      )}

      <button
        onClick={() => setShowEmoji((prev) => !prev)}
        className="text-gray-400 hover:text-yellow-400 transition"
      >
        <Smile size={22} />
      </button>

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
        className="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={18} />
      </button>
    </div>
  )
}

export default InputBar