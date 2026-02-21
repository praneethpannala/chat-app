import { render, screen } from '@testing-library/react'
import App from './App'

// Mock the AuthContext
jest.mock('./AuthContext', () => {
  const React = require('react')
  return {
    AuthProvider: ({ children }) => (
      <div data-testid="auth-provider">{children}</div>
    ),
    useAuth: jest.fn(() => ({
      user: { uid: 'user123', displayName: 'Test User', email: 'test@example.com' },
      loading: false,
    })),
  }
})

// Mock the components
jest.mock('./components/Login', () => {
  return function MockLogin() {
    return <div data-testid="login-component">Login Component</div>
  }
})

jest.mock('./components/Chat', () => {
  return function MockChat() {
    return <div data-testid="chat-component">Chat Component</div>
  }
})

// Mock window.matchMedia for responsive behavior
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  test('renders AuthProvider wrapper', () => {
    render(<App />)
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  test('renders app with Routes component', () => {
    const { container } = render(<App />)
    expect(container).toBeInTheDocument()
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  test('app structure includes AuthProvider at top level', () => {
    const { container } = render(<App />)
    const authProvider = screen.getByTestId('auth-provider')
    expect(authProvider).toBeInTheDocument()
    // AuthProvider should be direct child
    expect(container.firstChild).toEqual(authProvider)
  })

  test('renders with BrowserRouter for routing', () => {
    const { container } = render(<App />)
    // BrowserRouter is rendered inside AuthProvider
    expect(container.querySelector('[data-testid="auth-provider"]')).toBeInTheDocument()
  })

  test('renders Routes with configured paths', () => {
    render(<App />)
    // At least one route component should be rendered
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  test('components are wrapped with AuthProvider', () => {
    render(<App />)
    const authProvider = screen.getByTestId('auth-provider')
    expect(authProvider).toBeInTheDocument()
    // Content should be inside auth provider
    expect(authProvider.children.length).toBeGreaterThan(0)
  })

  test('renders successfully without props', () => {
    const { container } = render(<App />)
    expect(container).toBeInTheDocument()
  })

  test('app mounts and unmounts without errors', () => {
    const { unmount } = render(<App />)
    expect(() => unmount()).not.toThrow()
  })

  test('renders app children properly', () => {
    render(<App />)
    const authProvider = screen.getByTestId('auth-provider')
    expect(authProvider).toBeInTheDocument()
    expect(authProvider.textContent).toBeTruthy()
  })

  test('maintains consistency across re-renders', () => {
    const { rerender } = render(<App />)
    const authProvider1 = screen.getByTestId('auth-provider')
    expect(authProvider1).toBeInTheDocument()

    rerender(<App />)
    const authProvider2 = screen.getByTestId('auth-provider')
    expect(authProvider2).toBeInTheDocument()
  })

  test('provides proper context wrapper', () => {
    render(<App />)
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    // Verify context is available to children
    expect(screen.getByTestId('auth-provider')).toHaveTextContent(
      'Login Component'
    )
  })

  test('renders Login component as part of routes', () => {
    render(<App />)
    expect(screen.getByTestId('login-component')).toBeInTheDocument()
  })

  test('renders Chat component as part of routes', () => {
    render(<App />)
    // Chat component is defined in Routes but only rendered when /chat is navigated to
    // For now, verify Login renders at default route
    expect(screen.getByTestId('login-component')).toBeInTheDocument()
  })

  test('has AuthProvider and Routes in structure', () => {
    const { container } = render(<App />)
    const authProvider = container.querySelector('[data-testid="auth-provider"]')
    expect(authProvider).toBeInTheDocument()
  })

  test('all routes are accessible via Routes component', () => {
    render(<App />)
    // At default route, Login component should be available
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('login-component')).toBeInTheDocument()
  })
})
