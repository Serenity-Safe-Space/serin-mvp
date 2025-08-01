import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ChatPage from './ChatPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
