import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ChatPage from './ChatPage'
import Privacy from './Privacy'
import ResetPassword from './ResetPassword'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
