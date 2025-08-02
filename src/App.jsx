import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ChatPage from './ChatPage'
import Privacy from './Privacy'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
