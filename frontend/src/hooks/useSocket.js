import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../AuthContext'

export default function useSocket() {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!user) return

    socketRef.current = io('http://localhost:3001', {
      query: { userId: user.uid },
      path: '/socket.io',
    })

    socketRef.current.on('receiveMessage', (message) => {
      console.log('receiveMessage event fired:', message)
      setMessages((prev) => [...prev, message])
    })

    socketRef.current.on('onlineUsers', (users) => {
      setOnlineUsers(users)
    })

    socketRef.current.on('messages', (msgs) => {
      setMessages(msgs)
    })

    socketRef.current.on('chatCleared', () => {
      setMessages([])
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected!')
      window.__socket = socketRef.current 
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected!')
    })

    return () => {
      socketRef.current.disconnect()
    }
  }, [user])

  const sendMessage = (receiverId, text) => {
    console.log('Socket connected?', socketRef.current?.connected)

    console.log('Emitting sendMessage:', { senderId: user.uid, receiverId, text })

    if (!socketRef.current) return
    socketRef.current.emit('sendMessage', {
      senderId: user.uid,
      receiverId,
      text,
    })
  }

  const getMessages = (receiverId) => {
    if (!socketRef.current) return
    socketRef.current.emit('getMessages', {
      senderId: user.uid,
      receiverId,
    })
  }

  const clearChat = (receiverId) => {
    if (!socketRef.current) return
    socketRef.current.emit('clearChat', {
      senderId: user.uid,
      receiverId,
    })
  }

  return { messages, onlineUsers, sendMessage, getMessages, clearChat }
}
