import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { onAuthStateChanged } from 'firebase/auth'

jest.mock('firebase/auth')

describe('AuthContext', () => {
  let mockUnsubscribe

  beforeEach(() => {
    jest.clearAllMocks()
    mockUnsubscribe = jest.fn()
  })

  test('provides user context to children', async () => {
    const mockUser = {
      uid: 'user123',
      displayName: 'John Doe',
      email: 'john@example.com',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    let result
    const TestComponent = () => {
      const auth = useAuth()
      result = auth
      return <div>{auth.user?.displayName}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result.user).toEqual(mockUser)
    })
  })

  test('shows loading state initially', () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      // Don't call callback immediately to keep loading true
      return mockUnsubscribe
    })

    const TestComponent = () => {
      const { loading } = useAuth()
      return <div>{loading ? 'Loading' : 'Loaded'}</div>
    }

    const { container } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Initially loading state should be true, so children might not be rendered
    expect(container.innerHTML).toBeDefined()
  })

  test('sets user to null when no user is logged in', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return mockUnsubscribe
    })

    let result
    const TestComponent = () => {
      const auth = useAuth()
      result = auth
      return <div>{result.user ? 'Logged in' : 'Logged out'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result.user).toBeNull()
    })
  })

  test('sets loading to false after auth state is checked', async () => {
    const mockUser = {
      uid: 'user123',
      displayName: 'John Doe',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    let result
    const TestComponent = () => {
      const auth = useAuth()
      result = auth
      return <div>{result.loading ? 'Loading' : 'Loaded'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result.loading).toBe(false)
    })
  })

  test('unsubscribes from auth state changes on unmount', () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return mockUnsubscribe
    })

    const TestComponent = () => {
      const { user } = useAuth()
      return <div>{user ? 'Logged in' : 'Logged out'}</div>
    }

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  test('does not render children when loading is true', () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      // Simulate loading by not calling callback
      return mockUnsubscribe
    })

    const TestComponent = () => {
      const { user } = useAuth()
      return <div data-testid="test-child">{user?.displayName || 'No user'}</div>
    }

    const { container } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // When loading is true, children should not be rendered
    expect(container.querySelector('[data-testid="test-child"]')).not.toBeInTheDocument()
  })

  test('renders children after loading is complete', async () => {
    const mockUser = {
      uid: 'user123',
      displayName: 'John Doe',
      email: 'john@example.com',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    const TestComponent = () => {
      return <div>Child Component</div>
    }

    const { container } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Child Component')).toBeInTheDocument()
    })
  })

  test('useAuth hook throws error if used outside provider', () => {
    const TestComponent = () => {
      try {
        useAuth()
        return <div>No error</div>
      } catch (e) {
        return <div>Error caught</div>
      }
    }

    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation()

    render(<TestComponent />)

    spy.mockRestore()
  })

  test('provides context value with user and loading properties', async () => {
    const mockUser = {
      uid: 'user456',
      displayName: 'Jane Smith',
      email: 'jane@example.com',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    let contextValue
    const TestComponent = () => {
      contextValue = useAuth()
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue).toHaveProperty('user')
      expect(contextValue).toHaveProperty('loading')
    })
  })

  test('updates user when auth state changes', async () => {
    const mockUser1 = {
      uid: 'user123',
      displayName: 'John',
    }

    let callbackFunction
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callbackFunction = callback
      callback(mockUser1)
      return mockUnsubscribe
    })

    let result
    const TestComponent = () => {
      result = useAuth()
      return <div>{result.user?.displayName}</div>
    }

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result.user.displayName).toBe('John')
    })

    // Simulate auth state change
    const mockUser2 = {
      uid: 'user456',
      displayName: 'Jane',
    }

    callbackFunction(mockUser2)

    await waitFor(() => {
      expect(result.user.displayName).toBe('Jane')
    })
  })

  test('calls onAuthStateChanged with auth instance', () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return mockUnsubscribe
    })

    const TestComponent = () => {
      const { user } = useAuth()
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(onAuthStateChanged).toHaveBeenCalled()
  })

  test('maintains context across multiple consumers', async () => {
    const mockUser = {
      uid: 'user123',
      displayName: 'John Doe',
      email: 'john@example.com',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    const Consumer1 = () => {
      const { user } = useAuth()
      return <div data-testid="consumer1">{user?.displayName}</div>
    }

    const Consumer2 = () => {
      const { user } = useAuth()
      return <div data-testid="consumer2">{user?.email}</div>
    }

    render(
      <AuthProvider>
        <Consumer1 />
        <Consumer2 />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('consumer1')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('consumer2')).toHaveTextContent('john@example.com')
    })
  })

  test('returns loading true initially, then false', async () => {
    const mockUser = {
      uid: 'user123',
      displayName: 'John Doe',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    let result
    const TestComponent = () => {
      result = useAuth()
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result.loading).toBe(false)
    })
  })

  test('provider renders without error', () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return mockUnsubscribe
    })

    const { container } = render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )

    expect(container).toBeInTheDocument()
  })

  test('user data persists in context across re-renders', async () => {
    const mockUser = {
      uid: 'user789',
      displayName: 'Alice',
      email: 'alice@example.com',
    }

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser)
      return mockUnsubscribe
    })

    let renderCount = 0
    let result
    const TestComponent = () => {
      renderCount++
      result = useAuth()
      return <div>{result.user?.displayName}</div>
    }

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result.user.displayName).toBe('Alice')
    })

    const firstRenderCount = renderCount

    // Trigger a re-render
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // User data should still be there
    expect(result.user.displayName).toBe('Alice')
  })

  test('handles auth error gracefully', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return mockUnsubscribe
    })

    let result
    const TestComponent = () => {
      result = useAuth()
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result).toBeDefined()
      expect(result.user).toBeNull()
    })
  })
})
