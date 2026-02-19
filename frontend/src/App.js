import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Login from './components/Login'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/chat" element={<h1>Chat Page</h1>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App