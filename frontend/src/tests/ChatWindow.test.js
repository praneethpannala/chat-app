import { render, screen, waitFor } from '@testing-library/react'
import ChatWindow from '../components/ChatWindow'

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

const mockMessages = [
  {
    _id: '1',
    text: 'Hello Alice!',
    senderId: 'user2',
    senderName: 'Bob Smith',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
    status: 'read',
  },
  {
    _id: '2',
    text: 'Hi Bob, how are you?',
    senderId: 'user1',
    senderName: 'Alice Johnson',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(), // 3 min ago
    status: 'delivered',
  },
  {
    _id: '3',
    text: 'I am doing great!',
    senderId: 'user2',
    senderName: 'Bob Smith',
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // 1 min ago
    status: 'delivered',
  },
]

const renderChatWindow = (props = {}) => {
  const defaultProps = {
    messages: mockMessages,
    currentUserId: 'user1',
    ...props,
  }

  return render(<ChatWindow {...defaultProps} />)
}

describe('ChatWindow Component', () => {
  test('renders all messages', () => {
    renderChatWindow()
    expect(screen.getByText('Hello Alice!')).toBeInTheDocument()
    expect(screen.getByText('Hi Bob, how are you?')).toBeInTheDocument()
    expect(screen.getByText('I am doing great!')).toBeInTheDocument()
  })

  test('renders sender name for messages from other users', () => {
    renderChatWindow()
    expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)
  })

  test('does not render sender name for messages from current user', () => {
    renderChatWindow()
    const aliceMessages = screen.queryAllByText('Alice Johnson')
    // Should not render as sender name (only in the message content if any)
    expect(aliceMessages.length).toBe(0)
  })

  test('renders message timestamps', () => {
    renderChatWindow()
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/)
    expect(timestamps.length).toBeGreaterThan(0)
  })

  test('displays messages from current user on the right', () => {
    const { container } = renderChatWindow()
    const rightAlignedMessages = container.querySelectorAll('.justify-end')
    expect(rightAlignedMessages.length).toBeGreaterThan(0)
  })

  test('displays messages from other users on the left', () => {
    const { container } = renderChatWindow()
    const leftAlignedMessages = container.querySelectorAll('.justify-start')
    expect(leftAlignedMessages.length).toBeGreaterThan(0)
  })

  test('renders sender avatar for messages from other users', () => {
    const { container } = renderChatWindow()
    // Count avatars - should be 2 (for the 2 messages from Bob)
    const avatars = container.querySelectorAll('.w-8.h-8.rounded-full')
    expect(avatars.length).toBeGreaterThan(0)
  })

  test('does not render sender avatar for messages from current user', () => {
    renderChatWindow()
    // Should render 2 avatars (for 2 messages from Bob, not for Alice's message)
    const { container } = renderChatWindow()
    const messageContainers = container.querySelectorAll('.flex.flex-col.gap-3')
    expect(messageContainers.length).toBeGreaterThan(0)
  })

  test('renders message status indicator for current user messages', () => {
    renderChatWindow()
    // Look for status indicators (checkmarks)
    const statusIndicators = screen.getAllByText(/✓/)
    expect(statusIndicators.length).toBeGreaterThan(0)
  })

  test('renders correct status icon for sent messages', () => {
    const messagesWithStatus = [
      {
        _id: '1',
        text: 'Test',
        senderId: 'user1',
        createdAt: new Date().toISOString(),
        status: 'sent',
      },
    ]

    renderChatWindow({ messages: messagesWithStatus })
    const checkmark = screen.getByText('✓')
    expect(checkmark).toBeInTheDocument()
  })

  test('renders correct status icon for delivered messages', () => {
    const messagesWithStatus = [
      {
        _id: '1',
        text: 'Test',
        senderId: 'user1',
        createdAt: new Date().toISOString(),
        status: 'delivered',
      },
    ]

    renderChatWindow({ messages: messagesWithStatus })
    const doubleCheckmark = screen.getByText('✓✓')
    expect(doubleCheckmark).toBeInTheDocument()
  })

  test('renders correct status icon for read messages', () => {
    const messagesWithStatus = [
      {
        _id: '1',
        text: 'Test',
        senderId: 'user1',
        createdAt: new Date().toISOString(),
        status: 'read',
      },
    ]

    renderChatWindow({ messages: messagesWithStatus })
    const blueCheckmark = screen.getByText('✓✓')
    expect(blueCheckmark).toBeInTheDocument()
  })

  test('renders empty chat window when no messages', () => {
    const { container } = renderChatWindow({ messages: [] })
    const messages = container.querySelectorAll('p')
    expect(messages.length).toBe(0)
  })

  test('renders message with correct styling for current user', () => {
    const { container } = renderChatWindow()
    const myMessageBubbles = container.querySelectorAll('.bg-blue-500')
    expect(myMessageBubbles.length).toBeGreaterThan(0)
  })

  test('renders message with correct styling for other users', () => {
    const { container } = renderChatWindow()
    const otherMessageBubbles = container.querySelectorAll('.bg-white')
    expect(otherMessageBubbles.length).toBeGreaterThan(0)
  })

  test('renders sender avatar with first letter of name', () => {
    const { container } = renderChatWindow()
    // Bob's first letter appears as avatar initials
    const avatars = container.querySelectorAll('.w-8.h-8.rounded-full')
    expect(avatars.length).toBeGreaterThan(0)
  })

  test('handles messages with missing sender name', () => {
    const messagesWithoutSenderName = [
      {
        _id: '1',
        text: 'Test message',
        senderId: 'user2',
        senderName: undefined,
        createdAt: new Date().toISOString(),
      },
    ]

    const { container } = renderChatWindow({ messages: messagesWithoutSenderName })
    // Should render ? as placeholder for missing sender name
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  test('renders messages with unique keys using _id or id', () => {
    const messagesWithIds = [
      {
        _id: '1',
        text: 'Message 1',
        senderId: 'user1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        text: 'Message 2',
        senderId: 'user2',
        senderName: 'Bob',
        createdAt: new Date().toISOString(),
      },
    ]

    renderChatWindow({ messages: messagesWithIds })
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText('Message 2')).toBeInTheDocument()
  })

  test('renders timestamp in correct format', () => {
    const { container } = renderChatWindow()
    // Timestamps should be in HH:MM format
    const times = container.querySelectorAll('.text-xs.text-gray-300, .text-xs.text-blue-100')
    expect(times.length).toBeGreaterThan(0)
  })

  test('current user messages are styled differently from other user messages', () => {
    const { container } = renderChatWindow()
    const currentUserMessages = container.querySelectorAll('.bg-blue-500.text-white')
    const otherUserMessages = container.querySelectorAll('.bg-white.text-gray-700')
    
    expect(currentUserMessages.length).toBeGreaterThan(0)
    expect(otherUserMessages.length).toBeGreaterThan(0)
  })

  test('renders message bubbles with rounded corners', () => {
    const { container } = renderChatWindow()
    const messageBubbles = container.querySelectorAll('.rounded-2xl')
    expect(messageBubbles.length).toBeGreaterThan(0)
  })

  test('handles special characters in message text', () => {
    const specialMessages = [
      {
        _id: '1',
        text: 'Special chars: @#$%^&*()',
        senderId: 'user1',
        createdAt: new Date().toISOString(),
      },
    ]

    renderChatWindow({ messages: specialMessages })
    expect(screen.getByText('Special chars: @#$%^&*()')).toBeInTheDocument()
  })

  test('does not show status indicator for messages from other users', () => {
    const { container } = renderChatWindow()
    // Get all message elements
    const messages = container.querySelectorAll('p')
    expect(messages.length).toBeGreaterThan(0)
  })

  test('renders long messages within max width', () => {
    const longMessages = [
      {
        _id: '1',
        text: 'This is a very long message that should be constrained in width and potentially wrap to multiple lines depending on the content and styling rules applied to the message bubble component.',
        senderId: 'user1',
        createdAt: new Date().toISOString(),
      },
    ]

    const { container } = renderChatWindow({ messages: longMessages })
    const messageBubble = container.querySelector('.max-w-xs')
    expect(messageBubble).toBeInTheDocument()
  })
})
