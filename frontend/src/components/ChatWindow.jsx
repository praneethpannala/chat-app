import { useAuth } from '../AuthContext'
import { useEffect, useRef } from 'react'

// dummy messages for now, will come from backend later
const messages = [
  { id: 1, text: 'Hey there!', senderId: 'alice', senderName: 'Alice' },
  { id: 2, text: 'Hello! How are you?', senderId: 'me', senderName: 'Me' },
  { id: 3, text: 'I am doing great!', senderId: 'alice', senderName: 'Alice' },
  { id: 4, text: 'Glad to hear that!', senderId: 'me', senderName: 'Me' },
  { id: 5, text: 'What are you up to?', senderId: 'alice', senderName: 'Alice' },
  { id: 6, text: 'Just building a chat app!', senderId: 'me', senderName: 'Me' },
]

function ChatWindow() {
  const { user } = useAuth()
  const bottomRef = useRef(null)

  // auto scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col gap-3 p-4">

      {messages.map((msg) => {
        const isMe = msg.senderId === 'me'
        return (
          <div
            key={msg.id}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
          >

            {/* Avatar for other user */}
            {!isMe && (
              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm mr-2 mt-1">
                {msg.senderName[0]}
              </div>
            )}

            {/* Message Bubble */}
            <div className="flex flex-col">
              {/* Sender name for other user */}
              {!isMe && (
                <p className="text-xs text-gray-400 mb-1 ml-1">
                  {msg.senderName}
                </p>
              )}
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-white text-gray-700 rounded-bl-none shadow'
                }`}
              >
                {msg.text}
              </div>
            </div>

          </div>
        )
      })}

      {/* Scroll to bottom anchor */}
      <div ref={bottomRef}></div>

    </div>
  )
}

export default ChatWindow
