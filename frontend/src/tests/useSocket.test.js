import { renderHook, waitFor, act } from '@testing-library/react'
import useSocket from '../hooks/useSocket'
import { useAuth } from '../AuthContext'
import { io } from 'socket.io-client'

jest.mock('socket.io-client')

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('useSocket Hook', () => {
  let mockSocket
  let mockEmit
  let mockOn
  let mockOff
  let mockDisconnect

  beforeEach(() => {
    jest.clearAllMocks()

    mockEmit = jest.fn()
    mockOn = jest.fn()
    mockOff = jest.fn()
    mockDisconnect = jest.fn()

    mockSocket = {
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      disconnect: mockDisconnect,
    }

    io.mockReturnValue(mockSocket)

    useAuth.mockReturnValue({
      user: {
        uid: 'user123',
        displayName: 'John Doe',
        email: 'john@example.com',
      },
    })
  })

  test('initializes with empty messages and online users', () => {
    const { result } = renderHook(() => useSocket())

    expect(result.current.messages).toEqual([])
    expect(result.current.onlineUsers).toEqual([])
  })

  test('connects to socket when user is authenticated', () => {
    renderHook(() => useSocket())

    expect(io).toHaveBeenCalledWith('http://localhost:3001', {
      query: { userId: 'user123' },
    })
  })

  test('does not connect to socket when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null })

    renderHook(() => useSocket())

    expect(io).not.toHaveBeenCalled()
  })

  test('registers receiveMessage event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith(
      'receiveMessage',
      expect.any(Function)
    )
  })

  test('registers onlineUsers event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith('onlineUsers', expect.any(Function))
  })

  test('registers messages event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith('messages', expect.any(Function))
  })

  test('registers chatCleared event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith('chatCleared', expect.any(Function))
  })

  test('adds received message to messages array', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const newMessage = {
      _id: '1',
      text: 'Hello',
      senderId: 'user2',
      createdAt: new Date().toISOString(),
    }

    act(() => {
      receiveMessageHandler(newMessage)
    })

    await waitFor(() => {
      expect(result.current.messages).toContain(newMessage)
    })
  })

  test('updates online users when onlineUsers event is received', async () => {
    const { result } = renderHook(() => useSocket())

    const onlineUsersHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'onlineUsers'
    )[1]

    const users = ['user2', 'user3', 'user4']

    act(() => {
      onlineUsersHandler(users)
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toEqual(users)
    })
  })

  test('replaces messages when messages event is received', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    const newMessages = [
      { _id: '1', text: 'Message 1', senderId: 'user2' },
      { _id: '2', text: 'Message 2', senderId: 'user1' },
    ]

    act(() => {
      messagesHandler(newMessages)
    })

    await waitFor(() => {
      expect(result.current.messages).toEqual(newMessages)
    })
  })

  test('clears messages when chatCleared event is received', async () => {
    const { result } = renderHook(() => useSocket())

    // First add some messages
    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    act(() => {
      messagesHandler([
        { _id: '1', text: 'Message 1', senderId: 'user2' },
      ])
    })

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0)
    })

    // Then trigger chat cleared
    const chatClearedHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'chatCleared'
    )[1]

    act(() => {
      chatClearedHandler()
    })

    await waitFor(() => {
      expect(result.current.messages).toEqual([])
    })
  })

  test('sendMessage emits sendMessage event with correct data', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.sendMessage('user2', 'Hello there')
    })

    expect(mockEmit).toHaveBeenCalledWith('sendMessage', {
      senderId: 'user123',
      receiverId: 'user2',
      text: 'Hello there',
    })
  })

  test('getMessages emits getMessages event with correct data', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.getMessages('user2')
    })

    expect(mockEmit).toHaveBeenCalledWith('getMessages', {
      senderId: 'user123',
      receiverId: 'user2',
    })
  })

  test('clearChat emits clearChat event with correct data', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.clearChat('user2')
    })

    expect(mockEmit).toHaveBeenCalledWith('clearChat', {
      senderId: 'user123',
      receiverId: 'user2',
    })
  })

  test('disconnects socket on cleanup', () => {
    const { unmount } = renderHook(() => useSocket())

    unmount()

    expect(mockDisconnect).toHaveBeenCalled()
  })

  test('handles multiple received messages in sequence', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const message1 = {
      _id: '1',
      text: 'First message',
      senderId: 'user2',
    }

    const message2 = {
      _id: '2',
      text: 'Second message',
      senderId: 'user2',
    }

    act(() => {
      receiveMessageHandler(message1)
      receiveMessageHandler(message2)
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].text).toBe('First message')
      expect(result.current.messages[1].text).toBe('Second message')
    })
  })

  test('returns all hook functions', () => {
    const { result } = renderHook(() => useSocket())

    expect(typeof result.current.sendMessage).toBe('function')
    expect(typeof result.current.getMessages).toBe('function')
    expect(typeof result.current.clearChat).toBe('function')
    expect(Array.isArray(result.current.messages)).toBe(true)
    expect(Array.isArray(result.current.onlineUsers)).toBe(true)
  })

  test('socket connection includes user ID in query', () => {
    renderHook(() => useSocket())

    const callArgs = io.mock.calls[0]
    expect(callArgs[1].query.userId).toBe('user123')
  })

  test('socket connects to correct host', () => {
    renderHook(() => useSocket())

    const hostArg = io.mock.calls[0][0]
    expect(hostArg).toBe('http://localhost:3001')
  })

  test('maintains messages across online users update', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    const onlineUsersHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'onlineUsers'
    )[1]

    const testMessages = [
      { _id: '1', text: 'Test', senderId: 'user2' },
    ]

    act(() => {
      messagesHandler(testMessages)
    })

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0)
    })

    act(() => {
      onlineUsersHandler(['user2', 'user3'])
    })

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0)
      expect(result.current.onlineUsers).toEqual(['user2', 'user3'])
    })
  })

  test('handles rapid sendMessage calls', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.sendMessage('user2', 'Message 1')
      result.current.sendMessage('user3', 'Message 2')
      result.current.sendMessage('user2', 'Message 3')
    })

    expect(mockEmit).toHaveBeenCalledTimes(3)
  })

  test('clears all messages on chatCleared event', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    const chatClearedHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'chatCleared'
    )[1]

    const messages = [
      { _id: '1', text: 'Msg 1', senderId: 'user2' },
      { _id: '2', text: 'Msg 2', senderId: 'user1' },
      { _id: '3', text: 'Msg 3', senderId: 'user2' },
    ]

    act(() => {
      messagesHandler(messages)
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3)
    })

    act(() => {
      chatClearedHandler()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(0)
    })
  })

  test('sendMessage with null socket does not throw error', () => {
    useAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useSocket())

    expect(() => {
      result.current.sendMessage('user2', 'Test')
    }).not.toThrow()
  })

  test('getMessages with null socket does not throw error', () => {
    useAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useSocket())

    expect(() => {
      result.current.getMessages('user2')
    }).not.toThrow()
  })

  test('clearChat with null socket does not throw error', () => {
    useAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useSocket())

    expect(() => {
      result.current.clearChat('user2')
    }).not.toThrow()
  })

  test('reconnects when user changes', () => {
    const { rerender } = renderHook(() => useSocket())

    expect(io).toHaveBeenCalledTimes(1)

    // Change user
    useAuth.mockReturnValue({
      user: {
        uid: 'user456',
        displayName: 'Jane Doe',
        email: 'jane@example.com',
      },
    })

    rerender()

    // Should have reconnected with new user
    expect(io).toHaveBeenCalledTimes(2)
    expect(io).toHaveBeenLastCalledWith('http://localhost:3001', {
      query: { userId: 'user456' },
    })
  })

  test('handles empty receiverId in sendMessage', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.sendMessage('', 'Hello')
    })

    expect(mockEmit).toHaveBeenCalledWith('sendMessage', {
      senderId: 'user123',
      receiverId: '',
      text: 'Hello',
    })
  })

  test('handles empty text in sendMessage', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.sendMessage('user2', '')
    })

    expect(mockEmit).toHaveBeenCalledWith('sendMessage', {
      senderId: 'user123',
      receiverId: 'user2',
      text: '',
    })
  })

  test('handles multiple event listeners registration', () => {
    renderHook(() => useSocket())

    // Should register 4 different event listeners
    expect(mockOn).toHaveBeenCalledTimes(4)

    const eventTypes = mockOn.mock.calls.map((call) => call[0])
    expect(eventTypes).toContain('receiveMessage')
    expect(eventTypes).toContain('onlineUsers')
    expect(eventTypes).toContain('messages')
    expect(eventTypes).toContain('chatCleared')
  })

  test('appends multiple received messages correctly', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const messages = [
      { _id: '1', text: 'Message 1', senderId: 'user2' },
      { _id: '2', text: 'Message 2', senderId: 'user3' },
      { _id: '3', text: 'Message 3', senderId: 'user2' },
    ]

    act(() => {
      messages.forEach((msg) => receiveMessageHandler(msg))
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3)
      expect(result.current.messages[0]._id).toBe('1')
      expect(result.current.messages[1]._id).toBe('2')
      expect(result.current.messages[2]._id).toBe('3')
    })
  })

  test('updates online users to empty array', async () => {
    const { result } = renderHook(() => useSocket())

    const onlineUsersHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'onlineUsers'
    )[1]

    act(() => {
      onlineUsersHandler(['user2', 'user3'])
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toEqual(['user2', 'user3'])
    })

    act(() => {
      onlineUsersHandler([])
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toEqual([])
    })
  })

  test('emits getMessages for specific receiver only', () => {
    const { result } = renderHook(() => useSocket())

    jest.clearAllMocks()

    act(() => {
      result.current.getMessages('user99')
    })

    expect(mockEmit).toHaveBeenCalledWith('getMessages', {
      senderId: 'user123',
      receiverId: 'user99',
    })

    expect(mockEmit).toHaveBeenCalledTimes(1)
  })

  test('emits clearChat for specific receiver only', () => {
    const { result } = renderHook(() => useSocket())

    jest.clearAllMocks()

    act(() => {
      result.current.clearChat('user88')
    })

    expect(mockEmit).toHaveBeenCalledWith('clearChat', {
      senderId: 'user123',
      receiverId: 'user88',
    })

    expect(mockEmit).toHaveBeenCalledTimes(1)
  })

  test('preserves message order when receiving multiple messages', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    const initialMessages = [
      { _id: 'a', text: 'First', senderId: 'user2' },
      { _id: 'b', text: 'Second', senderId: 'user1' },
    ]

    act(() => {
      messagesHandler(initialMessages)
    })

    await waitFor(() => {
      expect(result.current.messages[0]._id).toBe('a')
      expect(result.current.messages[1]._id).toBe('b')
    })
  })

  test('does not call socket methods before socket is initialized', () => {
    jest.clearAllMocks()

    const { result } = renderHook(() => useSocket())

    // At this point, socket should be initialized but no emit should have happened
    expect(mockEmit).not.toHaveBeenCalled()
  })

  test('handles rapid consecutive chat clears', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    const chatClearedHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'chatCleared'
    )[1]

    act(() => {
      messagesHandler([{ _id: '1', text: 'Test', senderId: 'user2' }])
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })

    act(() => {
      chatClearedHandler()
      chatClearedHandler()
      chatClearedHandler()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(0)
    })
  })

  test('clears event listeners on unmount', () => {
    const { unmount } = renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalled()

    unmount()

    expect(mockDisconnect).toHaveBeenCalled()
  })

  test('socket connection uses correct configuration', () => {
    renderHook(() => useSocket())

    const callArgs = io.mock.calls[0]
    expect(callArgs).toHaveLength(2)
    expect(callArgs[0]).toBe('http://localhost:3001')
    expect(callArgs[1]).toEqual({
      query: { userId: 'user123' },
    })
  })

  test('provides initial empty state', () => {
    const { result } = renderHook(() => useSocket())

    expect(result.current).toEqual({
      messages: [],
      onlineUsers: [],
      sendMessage: expect.any(Function),
      getMessages: expect.any(Function),
      clearChat: expect.any(Function),
    })
  })
})
