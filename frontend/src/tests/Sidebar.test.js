import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Sidebar from '../components/SideBar'
import { signOut } from 'firebase/auth'

jest.mock('firebase/auth')

jest.mock('../firebase/config', () => ({
  auth: {},
}))

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: {
      displayName: 'John Doe',
      email: 'john@example.com',
      photoURL: 'https://example.com/photo.jpg',
    },
  }),
}))

let mockNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockUsers = [
  {
    id: '1',
    name: 'Alice Johnson',
    online: true,
  },
  {
    id: '2',
    name: 'Bob Smith',
    online: false,
  },
  {
    id: '3',
    name: 'Carol White',
    online: true,
  },
]

const renderSidebar = (props = {}) => {
  const defaultProps = {
    users: mockUsers,
    onSelectUser: jest.fn(),
    selectedUser: null,
    ...props,
  }

  return render(
    <BrowserRouter>
      <Sidebar {...defaultProps} />
    </BrowserRouter>
  )
}

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate = jest.fn()
    jest.spyOn(require('../AuthContext'), 'useAuth').mockReturnValue({
      user: {
        displayName: 'John Doe',
        email: 'john@example.com',
        photoURL: 'https://example.com/photo.jpg',
      },
    })
  })

  test('renders app title Zync', () => {
    renderSidebar()
    expect(screen.getByText('Zync')).toBeInTheDocument()
  })

  test('renders search input with correct placeholder', () => {
    renderSidebar()
    const searchInput = screen.getByPlaceholderText('Search users...')
    expect(searchInput).toBeInTheDocument()
  })

  test('renders all users initially', () => {
    renderSidebar()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Carol White')).toBeInTheDocument()
  })

  test('displays online status for users', () => {
    renderSidebar()
    expect(screen.getAllByText('Online')).toHaveLength(2) // Alice and Carol are online
    expect(screen.getByText('Offline')).toBeInTheDocument() // Bob is offline
  })

  test('filters users by search query', async () => {
    renderSidebar()
    const searchInput = screen.getByPlaceholderText('Search users...')

    fireEvent.change(searchInput, { target: { value: 'Alice' } })

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Carol White')).not.toBeInTheDocument()
    })
  })

  test('filters users case-insensitively', async () => {
    renderSidebar()
    const searchInput = screen.getByPlaceholderText('Search users...')

    fireEvent.change(searchInput, { target: { value: 'alice' } })

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
  })

  test('shows "No users found" when search returns no results', async () => {
    renderSidebar()
    const searchInput = screen.getByPlaceholderText('Search users...')

    fireEvent.change(searchInput, { target: { value: 'xyz' } })

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument()
    })
  })

  test('calls onSelectUser when a user is clicked', async () => {
    const onSelectUser = jest.fn()
    renderSidebar({ onSelectUser })

    const aliceUser = screen.getByText('Alice Johnson').closest('div').parentElement
    fireEvent.click(aliceUser)

    await waitFor(() => {
      expect(onSelectUser).toHaveBeenCalledWith(mockUsers[0])
    })
  })

  test('highlights selected user', () => {
    renderSidebar({ selectedUser: mockUsers[0] })

    const userElements = screen.getAllByText(/Online|Offline/)
    const selectedElement = userElements[0].closest('div').parentElement
    expect(selectedElement).toHaveClass('bg-blue-50')
  })

  test('renders current user profile at bottom', () => {
    renderSidebar()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  test('displays user profile photo', () => {
    renderSidebar()
    const profileImg = screen.getByAltText('profile')
    expect(profileImg).toBeInTheDocument()
    expect(profileImg).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  test('calls signOut and navigate when logout button is clicked', async () => {
    signOut.mockResolvedValueOnce()

    renderSidebar()

    // Find logout button by searching for the last button in the bottom section
    const allButtons = screen.getAllByRole('button')
    const logoutButton = allButtons[allButtons.length - 1]

    fireEvent.click(logoutButton)

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  test('renders placeholder image when user has no photoURL', () => {
    jest.spyOn(require('../AuthContext'), 'useAuth').mockReturnValue({
      user: {
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        photoURL: null,
      },
    })

    renderSidebar()
    const profileImg = screen.getByAltText('profile')
    expect(profileImg).toHaveAttribute('src', 'https://via.placeholder.com/40')
  })

  test('renders empty user list when no users provided', () => {
    renderSidebar({ users: [] })
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  test('user avatar shows first letter of name', () => {
    renderSidebar()
    expect(screen.getByText('A')).toBeInTheDocument() // Alice's avatar
    expect(screen.getByText('B')).toBeInTheDocument() // Bob's avatar
    expect(screen.getByText('C')).toBeInTheDocument() // Carol's avatar
  })
})
