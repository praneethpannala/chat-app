import { render, screen, fireEvent } from '@testing-library/react'
import ChatHeader from '../components/ChatHeader'

const mockUser = {
  id: '1',
  name: 'Alice Johnson',
  online: true,
}

const renderChatHeader = (props = {}) => {
  const defaultProps = {
    user: mockUser,
    onClearChat: jest.fn(),
    ...props,
  }

  return render(<ChatHeader {...defaultProps} />)
}

describe('ChatHeader Component', () => {
  test('renders user name', () => {
    renderChatHeader()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
  })

  test('renders online status as Online when user is online', () => {
    renderChatHeader()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  test('renders offline status as Offline when user is offline', () => {
    renderChatHeader({ user: { ...mockUser, online: false } })
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  test('renders user avatar with first letter of name', () => {
    renderChatHeader()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  test('displays green status indicator when user is online', () => {
    const { container } = renderChatHeader()
    const statusIndicator = container.querySelector('.bg-green-400')
    expect(statusIndicator).toBeInTheDocument()
  })

  test('displays gray status indicator when user is offline', () => {
    const { container } = renderChatHeader({ user: { ...mockUser, online: false } })
    const statusIndicator = container.querySelector('.bg-gray-300')
    expect(statusIndicator).toBeInTheDocument()
  })

  test('renders Clear Chat button', () => {
    renderChatHeader()
    expect(screen.getByText('Clear Chat')).toBeInTheDocument()
  })

  test('calls onClearChat when Clear Chat button is clicked', () => {
    const onClearChat = jest.fn()
    renderChatHeader({ onClearChat })

    const clearButton = screen.getByText('Clear Chat')
    fireEvent.click(clearButton)

    expect(onClearChat).toHaveBeenCalledTimes(1)
  })

  test('renders online status text in green when user is online', () => {
    const { container } = renderChatHeader()
    const onlineText = screen.getByText('Online')
    expect(onlineText).toHaveClass('text-green-500')
  })

  test('renders offline status text in gray when user is offline', () => {
    const { container } = renderChatHeader({ user: { ...mockUser, online: false } })
    const offlineText = screen.getByText('Offline')
    expect(offlineText).toHaveClass('text-gray-400')
  })

  test('renders trash icon for clear chat button', () => {
    const { container } = renderChatHeader()
    const button = screen.getByText('Clear Chat').parentElement
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  test('renders header with correct layout', () => {
    const { container } = renderChatHeader()
    const header = container.querySelector('.flex.items-center.justify-between')
    expect(header).toBeInTheDocument()
  })

  test('renders user info section with avatar and text', () => {
    const { container } = renderChatHeader()
    const userSection = container.querySelector('.flex.items-center.gap-3')
    expect(userSection).toBeInTheDocument()
    expect(userSection.querySelector('.w-10.h-10')).toBeInTheDocument()
  })

  test('handles undefined user gracefully', () => {
    const { container } = renderChatHeader({ user: undefined })
    // Should render without crashing
    expect(container).toBeInTheDocument()
  })

  test('renders user name with correct styling', () => {
    renderChatHeader()
    const userName = screen.getByText('Alice Johnson')
    expect(userName).toHaveClass('font-semibold')
  })

  test('renders all user information together', () => {
    renderChatHeader()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })
})
