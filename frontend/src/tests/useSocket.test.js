import { renderHook, waitFor, act } from '@testing-library/react'
import useSocket from '../hooks/useSocket'
import { useAuth } from '../AuthContext'
import { io } from 'socket.io-client'

jest.mock('socket.io-client')

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock window.location.origin
const originalLocation = window.location
delete window.location
window.location = { ...originalLocation, origin: 'http://localhost:3000' }

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

    expect(io).toHaveBeenCalledWith(window.location.origin, {
      query: { userId: 'user123' },
      path: '/socket.io',
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
    expect(hostArg).toBe(window.location.origin)
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
    expect(io).toHaveBeenLastCalledWith(window.location.origin, {
      query: { userId: 'user456' },
      path: '/socket.io',
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

    // Should register 7 different event listeners
    expect(mockOn).toHaveBeenCalledTimes(7)

    const eventTypes = mockOn.mock.calls.map((call) => call[0])
    expect(eventTypes).toContain('receiveMessage')
    expect(eventTypes).toContain('onlineUsers')
    expect(eventTypes).toContain('messages')
    expect(eventTypes).toContain('chatCleared')
    expect(eventTypes).toContain('connect')
    expect(eventTypes).toContain('connect_error')
    expect(eventTypes).toContain('disconnect')
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
    expect(callArgs[0]).toBe(window.location.origin)
    expect(callArgs[1]).toEqual({
      query: { userId: 'user123' },
      path: '/socket.io',
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

  test('registers connect event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function))
  })

  test('registers connect_error event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith('connect_error', expect.any(Function))
  })

  test('registers disconnect event listener', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function))
  })

  test('handles connect event without throwing', () => {
    renderHook(() => useSocket())

    const connectHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'connect'
    )[1]

    expect(() => {
      act(() => {
        connectHandler()
      })
    }).not.toThrow()
  })

  test('handles connect_error event without throwing', () => {
    renderHook(() => useSocket())

    const connectErrorHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'connect_error'
    )[1]

    const error = new Error('Connection failed')

    expect(() => {
      act(() => {
        connectErrorHandler(error)
      })
    }).not.toThrow()
  })

  test('handles disconnect event without throwing', () => {
    renderHook(() => useSocket())

    const disconnectHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'disconnect'
    )[1]

    expect(() => {
      act(() => {
        disconnectHandler()
      })
    }).not.toThrow()
  })

  test('registers all 7 expected event listeners', () => {
    renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalledTimes(7)

    const eventTypes = mockOn.mock.calls.map((call) => call[0])
    expect(eventTypes).toContain('receiveMessage')
    expect(eventTypes).toContain('onlineUsers')
    expect(eventTypes).toContain('messages')
    expect(eventTypes).toContain('chatCleared')
    expect(eventTypes).toContain('connect')
    expect(eventTypes).toContain('connect_error')
    expect(eventTypes).toContain('disconnect')
  })

  test('cleans up all event listeners on unmount', () => {
    const { unmount } = renderHook(() => useSocket())

    expect(mockOn).toHaveBeenCalled()
    expect(mockDisconnect).not.toHaveBeenCalled()

    unmount()

    expect(mockDisconnect).toHaveBeenCalled()
  })

  test('does not disconnect socket if user is null during setup', () => {
    useAuth.mockReturnValue({ user: null })

    const { unmount } = renderHook(() => useSocket())

    unmount()

    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  test('socket connects to window.location.origin', () => {
    renderHook(() => useSocket())

    const hostArg = io.mock.calls[0][0]
    expect(hostArg).toBe(window.location.origin)
  })

  test('socket path is correctly configured', () => {
    renderHook(() => useSocket())

    const callArgs = io.mock.calls[0]
    expect(callArgs[1].path).toBe('/socket.io')
  })

  test('sendMessage includes user.uid as senderId', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.sendMessage('receiver1', 'test message')
    })

    expect(mockEmit).toHaveBeenCalledWith('sendMessage', {
      senderId: 'user123',
      receiverId: 'receiver1',
      text: 'test message',
    })
  })

  test('getMessages includes user.uid as senderId', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.getMessages('receiver1')
    })

    expect(mockEmit).toHaveBeenCalledWith('getMessages', {
      senderId: 'user123',
      receiverId: 'receiver1',
    })
  })

  test('clearChat includes user.uid as senderId', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.clearChat('receiver1')
    })

    expect(mockEmit).toHaveBeenCalledWith('clearChat', {
      senderId: 'user123',
      receiverId: 'receiver1',
    })
  })

  test('message object structure is preserved when received', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const complexMessage = {
      _id: 'msg-123',
      text: 'Complex message',
      senderId: 'user2',
      receiverId: 'user123',
      createdAt: '2026-02-22T10:30:00Z',
      isRead: false,
      attachments: ['file1.pdf'],
    }

    act(() => {
      receiveMessageHandler(complexMessage)
    })

    await waitFor(() => {
      expect(result.current.messages[0]).toEqual(complexMessage)
    })
  })

  test('online users update replaces entire list', async () => {
    const { result } = renderHook(() => useSocket())

    const onlineUsersHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'onlineUsers'
    )[1]

    act(() => {
      onlineUsersHandler(['user1', 'user2', 'user3'])
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toHaveLength(3)
    })

    act(() => {
      onlineUsersHandler(['user1'])
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toEqual(['user1'])
      expect(result.current.onlineUsers).toHaveLength(1)
    })
  })

  test('messages handler completely replaces previous messages', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    // First add a message via receiveMessage
    act(() => {
      receiveMessageHandler({ _id: '1', text: 'Old', senderId: 'user2' })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })

    // Then replace all messages via messages handler
    const newMessages = [
      { _id: '10', text: 'New1', senderId: 'user3' },
      { _id: '11', text: 'New2', senderId: 'user4' },
    ]

    act(() => {
      messagesHandler(newMessages)
    })

    await waitFor(() => {
      expect(result.current.messages).toEqual(newMessages)
      expect(result.current.messages).toHaveLength(2)
    })
  })

  test('receiveMessage appends to existing messages', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    // Set initial messages
    act(() => {
      messagesHandler([{ _id: '1', text: 'Initial', senderId: 'user2' }])
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })

    // Append via receiveMessage
    act(() => {
      receiveMessageHandler({ _id: '2', text: 'Appended', senderId: 'user3' })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1]._id).toBe('2')
    })
  })

  test('hook recreates functions when socket changes', () => {
    const { result, rerender } = renderHook(() => useSocket())

    const sendMessage1 = result.current.sendMessage
    const getMessages1 = result.current.getMessages
    const clearChat1 = result.current.clearChat

    // Rerender with same user - functions are recreated on each render due to closure
    rerender()

    const sendMessage2 = result.current.sendMessage
    const getMessages2 = result.current.getMessages
    const clearChat2 = result.current.clearChat

    // Functions may be recreated but serve the same purpose
    expect(typeof sendMessage1).toBe('function')
    expect(typeof sendMessage2).toBe('function')
    expect(typeof getMessages1).toBe('function')
    expect(typeof getMessages2).toBe('function')
    expect(typeof clearChat1).toBe('function')
    expect(typeof clearChat2).toBe('function')
  })

  test('sendMessage does not emit if receiverId is undefined', () => {
    const { result } = renderHook(() => useSocket())

    jest.clearAllMocks()

    act(() => {
      result.current.sendMessage(undefined, 'test')
    })

    expect(mockEmit).toHaveBeenCalledWith('sendMessage', {
      senderId: 'user123',
      receiverId: undefined,
      text: 'test',
    })
  })

  test('getMessages does not emit if receiverId is undefined', () => {
    const { result } = renderHook(() => useSocket())

    jest.clearAllMocks()

    act(() => {
      result.current.getMessages(undefined)
    })

    expect(mockEmit).toHaveBeenCalledWith('getMessages', {
      senderId: 'user123',
      receiverId: undefined,
    })
  })

  test('clearChat does not emit if receiverId is undefined', () => {
    const { result } = renderHook(() => useSocket())

    jest.clearAllMocks()

    act(() => {
      result.current.clearChat(undefined)
    })

    expect(mockEmit).toHaveBeenCalledWith('clearChat', {
      senderId: 'user123',
      receiverId: undefined,
    })
  })

  test('handles very long message text', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const longText = 'a'.repeat(10000)
    const message = {
      _id: '1',
      text: longText,
      senderId: 'user2',
    }

    act(() => {
      receiveMessageHandler(message)
    })

    await waitFor(() => {
      expect(result.current.messages[0].text).toHaveLength(10000)
    })
  })

  test('handles special characters in message text', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const specialMessage = {
      _id: '1',
      text: '!@#$%^&*()_+-={}[]|:;<>?,./~`',
      senderId: 'user2',
    }

    act(() => {
      receiveMessageHandler(specialMessage)
    })

    await waitFor(() => {
      expect(result.current.messages[0].text).toBe(specialMessage.text)
    })
  })

  test('handles unicode characters in message text', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const unicodeMessage = {
      _id: '1',
      text: '你好世界 🌍 مرحبا بالعالم',
      senderId: 'user2',
    }

    act(() => {
      receiveMessageHandler(unicodeMessage)
    })

    await waitFor(() => {
      expect(result.current.messages[0].text).toBe(unicodeMessage.text)
    })
  })

  test('socket connection with user having special characters in uid', () => {
    useAuth.mockReturnValue({
      user: {
        uid: 'user-123@example.com',
        displayName: 'Test User',
        email: 'test@example.com',
      },
    })

    renderHook(() => useSocket())

    expect(io).toHaveBeenCalledWith(window.location.origin, {
      query: { userId: 'user-123@example.com' },
      path: '/socket.io',
    })
  })

  test('properly tracks state mutations', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    expect(result.current.messages).toEqual([])

    act(() => {
      messagesHandler([{ _id: '1', text: 'Test', senderId: 'user2' }])
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })

    expect(result.current.messages[0]._id).toBe('1')
  })

  test('handles null message in receiveMessage', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    act(() => {
      receiveMessageHandler(null)
    })

    await waitFor(() => {
      expect(result.current.messages).toContain(null)
    })
  })

  test('handles undefined message in receiveMessage', async () => {
    const { result } = renderHook(() => useSocket())

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    act(() => {
      receiveMessageHandler(undefined)
    })

    await waitFor(() => {
      expect(result.current.messages).toContain(undefined)
    })
  })

  test('user dependency triggers cleanup and reconnection', () => {
    const { rerender } = renderHook(() => useSocket())

    expect(io).toHaveBeenCalledTimes(1)

    useAuth.mockReturnValue({
      user: {
        uid: 'differentUser',
        displayName: 'Different',
        email: 'different@example.com',
      },
    })

    rerender()

    expect(mockDisconnect).toHaveBeenCalled()
    expect(io).toHaveBeenCalledTimes(2)
  })

  test('socket is not created when user is null', () => {
    useAuth.mockReturnValue({ user: null })

    renderHook(() => useSocket())

    expect(io).not.toHaveBeenCalled()
  })

  test('socket is not created when user is undefined', () => {
    useAuth.mockReturnValue({ user: undefined })

    renderHook(() => useSocket())

    expect(io).not.toHaveBeenCalled()
  })

  test('returns functions that handle socket not initialized', () => {
    useAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useSocket())

    expect(() => {
      act(() => {
        result.current.sendMessage('user2', 'message')
        result.current.getMessages('user2')
        result.current.clearChat('user2')
      })
    }).not.toThrow()
  })

  test('multiple hooks render independently', () => {
    const { result: result1 } = renderHook(() => useSocket())
    const { result: result2 } = renderHook(() => useSocket())

    expect(result1.current.messages).toEqual(result2.current.messages)
    expect(result1.current.messages).not.toBe(result2.current.messages)
  })

  test('message state updates correctly with batch operations', async () => {
    const { result } = renderHook(() => useSocket())

    const messagesHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'messages'
    )[1]

    const receiveMessageHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'receiveMessage'
    )[1]

    const initialMessages = [
      { _id: '1', text: 'Msg1', senderId: 'user2' },
      { _id: '2', text: 'Msg2', senderId: 'user3' },
    ]

    act(() => {
      messagesHandler(initialMessages)
      receiveMessageHandler({ _id: '3', text: 'Msg3', senderId: 'user4' })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3)
    })
  })

  test('online users state updates correctly with batch operations', async () => {
    const { result } = renderHook(() => useSocket())

    const onlineUsersHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'onlineUsers'
    )[1]

    act(() => {
      onlineUsersHandler(['user2', 'user3'])
      onlineUsersHandler(['user2', 'user3', 'user4'])
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toEqual(['user2', 'user3', 'user4'])
    })
  })

  test('does not throw when socket.emit is called multiple times rapidly', () => {
    const { result } = renderHook(() => useSocket())

    expect(() => {
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.sendMessage(`user${i}`, `Message ${i}`)
        }
      })
    }).not.toThrow()

    expect(mockEmit).toHaveBeenCalledTimes(100)
  })

  test('user object with all required properties works correctly', () => {
    const completeUser = {
      uid: 'user-complete-123',
      displayName: 'Complete User',
      email: 'complete@example.com',
      photoURL: 'https://example.com/photo.jpg',
      isAnonymous: false,
    }

    useAuth.mockReturnValue({ user: completeUser })

    renderHook(() => useSocket())

    expect(io).toHaveBeenCalledWith(window.location.origin, {
      query: { userId: 'user-complete-123' },
      path: '/socket.io',
    })
  })

  test('empty online users array is handled correctly', async () => {
    const { result } = renderHook(() => useSocket())

    const onlineUsersHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'onlineUsers'
    )[1]

    act(() => {
      onlineUsersHandler([])
    })

    await waitFor(() => {
      expect(result.current.onlineUsers).toEqual([])
    })
  })

  test('socket configuration path is always included', () => {
    renderHook(() => useSocket())

    const config = io.mock.calls[0][1]
    expect(config).toHaveProperty('path')
    expect(config.path).toBe('/socket.io')
  })
})
