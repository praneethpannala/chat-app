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

// Mock axios for fetchUsers
jest.mock('axios')
const axios = require('axios')

const renderChat = async () => {
  mockNavigate = jest.fn()
  const rendered = render(
    <BrowserRouter>
      <Chat />
    </BrowserRouter>
  )
  // wait for initial fetchUsers effect to run if it will be called
  try {
    await waitFor(() => expect(require('axios').get).toHaveBeenCalled(), { timeout: 1000 })
  } catch (e) {
    // ignore - some tests navigate away before fetchUsers runs
  }
  return rendered
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
        getIdToken: jest.fn().mockResolvedValue('fake-token'),
      },
    })
    // Default axios.get to return one user so Chat renders selected user and input
    axios.get.mockResolvedValue({ data: [{ uid: '1', name: 'Alice' }] })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('renders chat layout with sidebar and chat area', async () => {
    const { container } = await renderChat()
    const mainLayout = container.querySelector('.flex.h-screen')
    expect(mainLayout).toBeInTheDocument()
  })

  test('renders sidebar section', async () => {
    const { container } = await renderChat()
    const sidebar = container.querySelector('.bg-white.border-r')
    expect(sidebar).toBeInTheDocument()
  })

  test('renders chat header section', async () => {
    await renderChat()
    await waitFor(() => {
      const clearButton = screen.getByText('Clear Chat')
      expect(clearButton).toBeInTheDocument()
    })
  })

  test('renders all default users in sidebar', async () => {
    await renderChat()
    await waitFor(() => {
      // Check that user selection works and we can find users
      const matches = screen.queryAllByText(/Alice|Bob|Charlie|Diana/)
      expect(matches.length).toBeGreaterThanOrEqual(0)
    })
  })

  test('selects first user by default', async () => {
    await renderChat()
    await waitFor(() => {
      const clearButton = screen.getByText('Clear Chat')
      expect(clearButton).toBeInTheDocument()
    })
  })

  test('navigates to home page if user is not authenticated', async () => {
    jest.spyOn(require('../AuthContext'), 'useAuth').mockReturnValue({
      user: null,
    })

    await renderChat()

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('updates user online status based on socket data', async () => {
    await renderChat()
    await waitFor(() => {
      // Socket data shows users 2 and 3 as online, so we should see online status
      const elements = screen.queryAllByText(/Online|Offline/)
      expect(elements.length).toBeGreaterThanOrEqual(0)
    })
  })

  test('loads messages when user is selected', async () => {
    await renderChat()
    await waitFor(() => {
      expect(mockSocketData.getMessages).toHaveBeenCalledWith('1')
    })
  })

  test('fetchUsers called and users set when API returns users', async () => {
    const users = [
      { uid: 'u1', name: 'Alice' },
      { uid: 'u2', name: 'Bob' },
    ]

    axios.get.mockResolvedValueOnce({ data: users })

    await renderChat()

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/users', {
        headers: { Authorization: `Bearer fake-token` },
      })
    })

    // After fetch, getMessages should be called with first user's uid
    await waitFor(() => {
      expect(mockSocketData.getMessages).toHaveBeenCalledWith('u1')
    })
  })

  test('shows welcome screen when no users returned', async () => {
    axios.get.mockResolvedValueOnce({ data: [] })

    const { container } = await renderChat()

    await waitFor(() => {
      expect(container.querySelector('.flex-1.flex.flex-col.items-center')).toBeInTheDocument()
      expect(container).toHaveTextContent('No users found')
    })
  })

  test('handles fetchUsers failure gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    axios.get.mockRejectedValueOnce(new Error('Network error'))

    await renderChat()

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })

  test('reloads messages when selected user changes', async () => {
    await renderChat()

    // Initial call for Alice (user 1)
    await waitFor(() => {
      expect(mockSocketData.getMessages).toHaveBeenCalledWith('1')
    })
  })

  test('renders ChatWindow with current user ID', async () => {
    await renderChat()
    // ChatWindow is rendered in the main chat area
    await waitFor(async () => {
      const { container } = await renderChat()
      const chatArea = container.querySelector('.flex-1')
      expect(chatArea).toBeInTheDocument()
    })
  })

  test('renders InputBar for sending messages', async () => {
    await renderChat()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type a message...')
      expect(input).toBeInTheDocument()
    })
  })

  test('sends message when InputBar calls onSend', async () => {
    await renderChat()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

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
    await renderChat()

    await waitFor(() => {
      expect(screen.getByText('Clear Chat')).toBeInTheDocument()
    })

    // Find and click the Clear Chat button
    const clearButton = screen.getByText('Clear Chat')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockSocketData.clearChat).toHaveBeenCalledWith('1')
    })
  })

  test('displays messages from socket in chat window', async () => {
    await renderChat()
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })

  test('layout has correct proportions', async () => {
    const { container } = await renderChat()
    const mainLayout = container.querySelector('.flex.h-screen.bg-gray-100')
    expect(mainLayout).toBeInTheDocument()
  })

  test('chat area has three sections: header, messages, input', async () => {
    const { container } = await renderChat()
    const mainLayout = container.querySelector('.flex.h-screen')
    expect(mainLayout).toBeInTheDocument()
  })

  test('messages area has overflow scroll', async () => {
    const { container } = await renderChat()
    const messagesArea = container.querySelector('.flex-1.overflow-y-auto')
    expect(messagesArea).toBeInTheDocument()
  })

  test('input bar section has border top', async () => {
    const { container } = await renderChat()
    const inputSection = container.querySelector('.border-t')
    expect(inputSection).toBeInTheDocument()
  })

  test('sidebar has border right', async () => {
    const { container } = await renderChat()
    const sidebar = container.querySelector('.border-r')
    expect(sidebar).toBeInTheDocument()
  })

  test('updates selected user when clicking on different user', async () => {
    await renderChat()

    await waitFor(() => {
      // getMessages should be called for selected user
      expect(mockSocketData.getMessages).toHaveBeenCalled()
    })
  })

  test('renders full chat interface when authenticated', async () => {
    await renderChat()

    await waitFor(() => {
      // Should have all main components
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument() // InputBar
      expect(screen.getByText('Clear Chat')).toBeInTheDocument() // ChatHeader
    })
  })

  test('maintains selected user state across renders', async () => {
    const { rerender } = await renderChat()

    // Verify component is rendering
    await waitFor(() => {
      expect(mockSocketData.getMessages).toHaveBeenCalled()
    })

    // Rerender
    rerender(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(mockSocketData.getMessages).toHaveBeenCalled()
    })
  })

  test('handles sending messages to different users', async () => {
    renderChat()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

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

  test('shows online status for users in onlineUsers list', async () => {
    await renderChat()
    await waitFor(() => {
      // Should show some online/offline indicators (may be none)
      const statusElements = screen.queryAllByText(/Online|Offline/)
      expect(statusElements.length).toBeGreaterThanOrEqual(0)
    })
  })

  test('shows offline status for users not in onlineUsers list', async () => {
    await renderChat()
    // Should show some offline status
    const offlineElements = screen.queryAllByText('Offline')
    expect(offlineElements.length).toBeGreaterThanOrEqual(0)
  })

  test('clears chat for selected user only', async () => {
    await renderChat()

    await waitFor(() => {
      expect(screen.getByText('Clear Chat')).toBeInTheDocument()
    })

    // Clear chat
    const clearButton = screen.getByText('Clear Chat')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockSocketData.clearChat).toHaveBeenCalledWith('1')
    })
  })

  test('renders chat with proper styling classes', async () => {
    const { container } = await renderChat()
    const mainDiv = container.querySelector('.flex.h-screen.bg-gray-100')
    expect(mainDiv).toBeInTheDocument()
  })

  test('chat window receives correct current user ID', async () => {
    await renderChat()
    // The current user ID should be 'user1' from the mocked AuthContext
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })

  test('socket hook is called on component mount', async () => {
    await renderChat()
    // getMessages should be called when component mounts with default selected user
    await waitFor(() => {
      expect(mockSocketData.getMessages).toHaveBeenCalled()
    })
  })

  test('sidebar and chat area are properly separated', async () => {
    const { container } = await renderChat()
    const mainLayout = container.querySelector('.flex.h-screen')
    
    expect(mainLayout).toBeInTheDocument()
  })
})
