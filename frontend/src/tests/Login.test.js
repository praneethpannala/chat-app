import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
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

// Mock react-router navigate
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

// Mock axios
jest.mock('axios')
const axios = require('axios')

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

test('successful login posts user and navigates to /chat', async () => {
  const { signInWithPopup } = require('firebase/auth')

  const fakeUser = {
    uid: 'u123',
    displayName: 'Tester',
    email: 't@example.com',
    photoURL: 'http://example.com/photo.png',
  }

  signInWithPopup.mockResolvedValueOnce({ user: fakeUser })
  axios.post.mockResolvedValueOnce({})

  renderLogin()

  await act(async () => {
    fireEvent.click(screen.getByText('Sign in with Google'))
  })

  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/users/save', {
      uid: fakeUser.uid,
      name: fakeUser.displayName,
      email: fakeUser.email,
      photoURL: fakeUser.photoURL,
    })
    expect(mockNavigate).toHaveBeenCalledWith('/chat')
  })
})

test('login failure logs error and does not navigate', async () => {
  const { signInWithPopup } = require('firebase/auth')
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

  signInWithPopup.mockRejectedValueOnce(new Error('Popup failed'))
  renderLogin()

  await act(async () => {
    fireEvent.click(screen.getByText('Sign in with Google'))
  })

  await waitFor(() => {
    expect(consoleError).toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalledWith('/chat')
  })

  consoleError.mockRestore()
})

test('redirects to /chat when user already authenticated', () => {
  const authModule = require('../AuthContext')
  jest.spyOn(authModule, 'useAuth').mockReturnValue({ user: { uid: 'x' } })

  // Re-require component to ensure hook runs with new mocked auth
  const { default: LoginComponent } = require('../components/Login')
  const { render: render2 } = require('@testing-library/react')

  render2(
    <BrowserRouter>
      <LoginComponent />
    </BrowserRouter>
  )

  expect(mockNavigate).toHaveBeenCalledWith('/chat')
})