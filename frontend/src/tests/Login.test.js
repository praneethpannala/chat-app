import { render, screen, fireEvent, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../components/Login'

jest.mock('../firebase/config', () => ({
  auth: {},
  googleProvider: {},
}))

jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
}))

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

const renderLogin = () => {
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

test('renders app name Zync', () => {
  renderLogin()
  expect(screen.getByText('Zync')).toBeInTheDocument()
})

test('renders sign in button', () => {
  renderLogin()
  expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
})

test('renders tagline', () => {
  renderLogin()
  expect(screen.getByText('Real-time chat, in sync.')).toBeInTheDocument()
})

test('clicking sign in button calls signInWithPopup', async () => {
  const { signInWithPopup } = require('firebase/auth')
  signInWithPopup.mockResolvedValueOnce({})
  renderLogin()
  
  await act(async () => {
    fireEvent.click(screen.getByText('Sign in with Google'))
  })
  
  expect(signInWithPopup).toHaveBeenCalled()
})