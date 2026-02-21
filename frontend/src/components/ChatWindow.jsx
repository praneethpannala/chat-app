import { useEffect, useRef } from 'react'

function MessageStatus({ status }) {
  if (status === 'sent') return <span className="text-gray-300 text-xs">✓</span>
  if (status === 'delivered') return <span className="text-gray-300 text-xs">✓✓</span>
  if (status === 'read') return <span className="text-blue-400 text-xs">✓✓</span>
  return null
}

function ChatWindow({ messages, currentUserId }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 min-h-full">
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId
        return (
          <div
            key={msg._id || msg.id}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            {!isMe && (
              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm mr-2 mt-1 flex-shrink-0">
                {msg.senderName?.[0] || '?'}
              </div>
            )}

            <div className="flex flex-col">
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
                <p>{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-xs ${isMe ? 'text-blue-100' : 'text-gray-300'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && <MessageStatus status={msg.status} />}
                </div>
              </div>
            </div>

          </div>
        )
      })}

      <div ref={bottomRef}></div>
    </div>
  )
}

export default ChatWindow