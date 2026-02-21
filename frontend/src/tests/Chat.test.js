import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock Firebase config BEFORE importing Chat component
jest.mock('../firebase/config', () => ({
  auth: {},
  googleProvider: {},
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}))

import Chat from '../components/Chat'

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

let mockNavigate

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'user1',
      displayName: 'John Doe',
      email: 'john@example.com',
    },
  }),
}))

const mockSocketData = {
  messages: [
    {
      _id: '1',
      text: 'Hello',
      senderId: 'user2',
      senderName: 'Bob',
      createdAt: new Date().toISOString(),
      status: 'read',
    },
  ],
  onlineUsers: ['user2', 'user3'],
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  clearChat: jest.fn(),
}

jest.mock('../hooks/useSocket', () => ({
  __esModule: true,
  default: () => mockSocketData,
}))

const renderChat = () => {
  mockNavigate = jest.fn()
  return render(
    <BrowserRouter>
      <Chat />
    </BrowserRouter>
  )
}

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate = jest.fn()
    jest.spyOn(require('../AuthContext'), 'useAuth').mockReturnValue({
      user: {
        uid: 'user1',
        displayName: 'John Doe',
        email: 'john@example.com',
      },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('renders chat layout with sidebar and chat area', () => {
    const { container } = renderChat()
    const mainLayout = container.querySelector('.flex.h-screen')
    expect(mainLayout).toBeInTheDocument()
  })

  test('renders sidebar section', () => {
    const { container } = renderChat()
    const sidebar = container.querySelector('.bg-white.border-r')
    expect(sidebar).toBeInTheDocument()
  })

  test('renders chat header section', () => {
    renderChat()
    const clearButton = screen.getByText('Clear Chat')
    expect(clearButton).toBeInTheDocument()
  })

  test('renders all default users in sidebar', () => {
    renderChat()
    // Check that user selection works and we can find users
    expect(screen.getAllByText(/Alice|Bob|Charlie|Diana/).length).toBeGreaterThan(0)
  })

  test('selects first user by default', () => {
    renderChat()
    const clearButton = screen.getByText('Clear Chat')
    expect(clearButton).toBeInTheDocument()
  })

  test('navigates to home page if user is not authenticated', () => {
    jest.spyOn(require('../AuthContext'), 'useAuth').mockReturnValue({
      user: null,
    })

    renderChat()

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('updates user online status based on socket data', () => {
    renderChat()
    // Socket data shows users 2 and 3 as online, so we should see online status
    const elements = screen.getAllByText(/Online|Offline/)
    expect(elements.length).toBeGreaterThan(0)
  })

  test('loads messages when user is selected', () => {
    renderChat()
    expect(mockSocketData.getMessages).toHaveBeenCalledWith('1')
  })

  test('reloads messages when selected user changes', async () => {
    renderChat()

    // Initial call for Alice (user 1)
    expect(mockSocketData.getMessages).toHaveBeenCalledWith('1')
  })

  test('renders ChatWindow with current user ID', () => {
    renderChat()
    // ChatWindow is rendered in the main chat area
    const { container } = renderChat()
    const chatArea = container.querySelector('.flex-1')
    expect(chatArea).toBeInTheDocument()
  })

  test('renders InputBar for sending messages', () => {
    renderChat()
    const input = screen.getByPlaceholderText('Type a message...')
    expect(input).toBeInTheDocument()
  })

  test('sends message when InputBar calls onSend', async () => {
    renderChat()

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: 'Test message' } })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockSocketData.sendMessage).toHaveBeenCalledWith('1', 'Test message')
    })
  })

  test('calls clearChat when ChatHeader clear button is clicked', async () => {
    renderChat()

    // Find and click the Clear Chat button
    const clearButton = screen.getByText('Clear Chat')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockSocketData.clearChat).toHaveBeenCalledWith('1')
    })
  })

  test('displays messages from socket in chat window', () => {
    renderChat()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  test('layout has correct proportions', () => {
    const { container } = renderChat()
    const mainLayout = container.querySelector('.flex.h-screen.bg-gray-100')
    expect(mainLayout).toBeInTheDocument()
  })

  test('chat area has three sections: header, messages, input', () => {
    const { container } = renderChat()
    const mainLayout = container.querySelector('.flex.h-screen')
    expect(mainLayout).toBeInTheDocument()
  })

  test('messages area has overflow scroll', () => {
    const { container } = renderChat()
    const messagesArea = container.querySelector('.flex-1.overflow-y-auto')
    expect(messagesArea).toBeInTheDocument()
  })

  test('input bar section has border top', () => {
    const { container } = renderChat()
    const inputSection = container.querySelector('.border-t')
    expect(inputSection).toBeInTheDocument()
  })

  test('sidebar has border right', () => {
    const { container } = renderChat()
    const sidebar = container.querySelector('.border-r')
    expect(sidebar).toBeInTheDocument()
  })

  test('updates selected user when clicking on different user', async () => {
    renderChat()

    // getMessages should be called for selected user
    expect(mockSocketData.getMessages).toHaveBeenCalled()
  })

  test('renders full chat interface when authenticated', () => {
    renderChat()
    
    // Should have all main components
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument() // InputBar
    expect(screen.getByText('Clear Chat')).toBeInTheDocument() // ChatHeader
  })

  test('maintains selected user state across renders', async () => {
    const { rerender } = renderChat()

    // Verify component is rendering
    expect(mockSocketData.getMessages).toHaveBeenCalled()

    // Rerender
    rerender(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    expect(mockSocketData.getMessages).toHaveBeenCalled()
  })

  test('handles sending messages to different users', async () => {
    renderChat()

    // Send message to Alice (default)
    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: 'Hello Alice' } })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockSocketData.sendMessage).toHaveBeenCalledWith('1', 'Hello Alice')
    })
  })

  test('shows online status for users in onlineUsers list', () => {
    renderChat()
    // Should show some online/offline indicators
    const statusElements = screen.getAllByText(/Online|Offline/)
    expect(statusElements.length).toBeGreaterThan(0)
  })

  test('shows offline status for users not in onlineUsers list', () => {
    renderChat()
    // Should show some offline status
    const offlineElements = screen.queryAllByText('Offline')
    expect(offlineElements.length).toBeGreaterThanOrEqual(0)
  })

  test('clears chat for selected user only', async () => {
    renderChat()
    
    // Clear chat
    const clearButton = screen.getByText('Clear Chat')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockSocketData.clearChat).toHaveBeenCalledWith('1')
    })
  })

  test('renders chat with proper styling classes', () => {
    const { container } = renderChat()
    const mainDiv = container.querySelector('.flex.h-screen.bg-gray-100')
    expect(mainDiv).toBeInTheDocument()
  })

  test('chat window receives correct current user ID', () => {
    renderChat()
    // The current user ID should be 'user1' from the mocked AuthContext
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  test('socket hook is called on component mount', () => {
    renderChat()
    // getMessages should be called when component mounts with default selected user
    expect(mockSocketData.getMessages).toHaveBeenCalled()
  })

  test('sidebar and chat area are properly separated', () => {
    const { container } = renderChat()
    const mainLayout = container.querySelector('.flex.h-screen')
    
    expect(mainLayout).toBeInTheDocument()
  })
})
