import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProfilePopup from './ProfilePopup'
import './App.css'

function HomePage() {
  const [isProfilePopupVisible, setIsProfilePopupVisible] = useState(false)
  
  const titles = [
    "Hey, I'm Serin 👋",
    "Here for your feels 💜"
  ]
  
  const randomTitle = titles[Math.floor(Math.random() * titles.length)]

  const handleProfileClick = () => {
    setIsProfilePopupVisible(true)
  }

  const handleClosePopup = () => {
    setIsProfilePopupVisible(false)
  }
  
  return (
    <div className="app">
      <div className="profile-icon" onClick={handleProfileClick}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#E67E22"/>
        </svg>
      </div>
      
      <div className="main-content">
        <div className="character-container">
          <div className="character-circle">
            <img src="/llama.png" alt="Serin the llama" className="llama-image" />
          </div>
        </div>

        <div className="title-section">
          <h1 className="main-title">{randomTitle}</h1>
          <p className="subtitle">Let's make life feel better, together</p>
        </div>

        <div className="buttons-container">
          <Link to="/chat" className="btn btn-white">I'm not doing great</Link>
          <button className="btn btn-yellow">Talk to someone like me</button>
          <button className="btn btn-pink">Something else...</button>
        </div>
      </div>

      <ProfilePopup 
        isVisible={isProfilePopupVisible} 
        onClose={handleClosePopup} 
      />
    </div>
  )
}

export default HomePage