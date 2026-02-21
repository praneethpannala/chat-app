import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useEffect } from 'react'
import loginBackgroundImage from '../images/loginBackgroundImage.jpg'

function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // if already logged in, go straight to chat
  useEffect(() => {
    if (user) navigate('/chat')
  }, [user, navigate])

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/chat')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{
        backgroundImage: `url(${loginBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Card */}
      <div className="bg-white bg-opacity-90 p-10 rounded-2xl shadow-2xl flex flex-col items-center gap-6 w-96">

        {/* App Title */}
        <h1 className="text-4xl font-bold text-blue-600">💬 Zync</h1>
        <p className="text-gray-400 text-sm">Real-time chat, in sync.</p>

        {/* Divider */}
        <div className="w-full border-t border-gray-200"></div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          className="flex items-center gap-3 border border-gray-300 w-full justify-center px-6 py-3 rounded-xl hover:bg-gray-50 transition shadow-sm"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-gray-600 font-medium">Sign in with Google</span>
        </button>

        {/* Footer text */}
        <p className="text-xs text-gray-300 text-center">
          By signing in you agree to our Terms & Privacy Policy
        </p>

      </div>
    </div>
  )
}

export default Login
