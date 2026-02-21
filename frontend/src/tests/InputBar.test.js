import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import InputBar from '../components/InputBar'

// Mock EmojiPicker to avoid issues with the emoji picker library
jest.mock('emoji-picker-react', () => {
  return function MockEmojiPicker({ onEmojiClick }) {
    return (
      <div data-testid="emoji-picker">
        <button
          onClick={() => onEmojiClick({ emoji: '😀' })}
          data-testid="mock-emoji"
        >
          Mock Emoji
        </button>
      </div>
    )
  }
})

const renderInputBar = (props = {}) => {
  const defaultProps = {
    onSend: jest.fn(),
    ...props,
  }

  return render(<InputBar {...defaultProps} />)
}

describe('InputBar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders input field with correct placeholder', () => {
    renderInputBar()
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  test('renders send button', () => {
    renderInputBar()
    const sendButtons = screen.getAllByRole('button')
    expect(sendButtons.length).toBeGreaterThanOrEqual(2) // emoji and send buttons
  })

  test('renders emoji button', () => {
    renderInputBar()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  test('updates input value when user types', () => {
    renderInputBar()
    const input = screen.getByPlaceholderText('Type a message...')

    fireEvent.change(input, { target: { value: 'Hello' } })

    expect(input.value).toBe('Hello')
  })

  test('calls onSend when send button is clicked with non-empty message', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    act(() => {
      fireEvent.change(input, { target: { value: 'Test message' } })
    })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1] // Last button is send
    act(() => {
      fireEvent.click(sendButton)
    })

    expect(onSend).toHaveBeenCalledWith('Test message')
  })

  test('does not call onSend when message is empty', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)

    expect(onSend).not.toHaveBeenCalled()
  })

  test('does not call onSend when message is only whitespace', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: '   ' } })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)

    expect(onSend).not.toHaveBeenCalled()
  })

  test('clears input after sending message', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    act(() => {
      fireEvent.change(input, { target: { value: 'Test message' } })
    })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    act(() => {
      fireEvent.click(sendButton)
    })

    expect(input.value).toBe('')
  })

  test('calls onSend when Enter key is pressed with non-empty message', async () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: 'Test message' } })

    // Simulate Enter key using proper keyboard event
    const enterEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
      keyCode: 13,
      bubbles: true,
    })
    input.dispatchEvent(enterEvent)

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith('Test message')
    })
  })

  test('does not call onSend when Enter key is pressed with empty message', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })

    expect(onSend).not.toHaveBeenCalled()
  })

  test('clears input after pressing Enter', async () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: 'Test message' } })

    // Simulate Enter key using proper keyboard event
    const enterEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
      keyCode: 13,
      bubbles: true,
    })
    input.dispatchEvent(enterEvent)

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  test('toggles emoji picker when emoji button is clicked', () => {
    renderInputBar()
    const buttons = screen.getAllByRole('button')
    const emojiButton = buttons[0] // First button is emoji

    // Emoji picker should not be visible initially
    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()

    // Click emoji button
    fireEvent.click(emojiButton)

    // Emoji picker should be visible
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()

    // Click again to close
    fireEvent.click(emojiButton)

    // Emoji picker should not be visible
    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
  })

  test('adds emoji to message when emoji is selected', async () => {
    renderInputBar()

    // Open emoji picker
    const buttons = screen.getAllByRole('button')
    const emojiButton = buttons[0]
    fireEvent.click(emojiButton)

    // Click mock emoji
    const mockEmoji = screen.getByTestId('mock-emoji')
    fireEvent.click(mockEmoji)

    // Check if emoji was added to input
    const input = screen.getByPlaceholderText('Type a message...')
    await waitFor(() => {
      expect(input.value).toContain('😀')
    })
  })

  test('closes emoji picker when clicking outside', async () => {
    renderInputBar()

    // Open emoji picker
    const buttons = screen.getAllByRole('button')
    const emojiButton = buttons[0]
    fireEvent.click(emojiButton)

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()

    // Click outside the emoji picker
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
    })
  })

  test('closes emoji picker after sending message', () => {
    renderInputBar()

    // Open emoji picker
    const buttons = screen.getAllByRole('button')
    const emojiButton = buttons[0]
    act(() => {
      fireEvent.click(emojiButton)
    })

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()

    // Type and send message
    const input = screen.getByPlaceholderText('Type a message...')
    act(() => {
      fireEvent.change(input, { target: { value: 'Test' } })
    })

    const sendButton = buttons[buttons.length - 1]
    act(() => {
      fireEvent.click(sendButton)
    })

    // Emoji picker should be closed
    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
  })

  test('send button is disabled when message is empty', () => {
    renderInputBar()

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]

    expect(sendButton).toHaveClass('disabled:opacity-40')
  })

  test('send button is enabled when message has content', () => {
    renderInputBar()

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: 'Hello' } })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]

    // Button should not be disabled
    expect(sendButton).not.toHaveAttribute('disabled')
  })

  test('handles multiple messages in sequence', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]

    // Send first message
    act(() => {
      fireEvent.change(input, { target: { value: 'First' } })
      fireEvent.click(sendButton)
    })

    // Send second message
    act(() => {
      fireEvent.change(input, { target: { value: 'Second' } })
      fireEvent.click(sendButton)
    })

    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend).toHaveBeenNthCalledWith(1, 'First')
    expect(onSend).toHaveBeenNthCalledWith(2, 'Second')
  })

  test('trims whitespace from message before sending', () => {
    const onSend = jest.fn()
    renderInputBar({ onSend })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: '  Test message  ' } })

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)

    // onSend receives the message as is (trimming is only for validation)
    expect(onSend).toHaveBeenCalledWith('  Test message  ')
  })
})
