import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { PremiumProvider } from './contexts/PremiumContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <PremiumProvider>
          <App />
        </PremiumProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
