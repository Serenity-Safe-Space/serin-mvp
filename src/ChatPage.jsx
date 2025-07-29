import { Link } from 'react-router-dom'
import './ChatPage.css'

function ChatPage() {
  return (
    <div className="chat-page">
      <div className="chat-header">
        <Link to="/" className="back-button">
          ← Back
        </Link>
      </div>

      <div className="chat-content">
        <div className="quick-actions">
          <div className="action-item">
            <div className="action-circle purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="white"/>
              </svg>
            </div>
            <div className="action-text">
              <div>Too tired to type?</div>
              <div>Just say it out loud</div>
            </div>
          </div>

          <div className="action-item">
            <div className="action-circle teal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.83 0-1.5.67-1.5 1.5S15.17 11 16 11h1.5l1.25 3.75L16 16.5V22h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9.5l-1.32-3.96A1.5 1.5 0 0 0 6.76 10H5.5c-.83 0-1.5.67-1.5 1.5S4.67 13 5.5 13H7l.75 2.25L6 17v5h1.5z" fill="white"/>
              </svg>
            </div>
            <div className="action-text">
              <div>Wanna talk</div>
              <div>to someone like you</div>
            </div>
          </div>
        </div>

        <div className="chat-title-section">
          <h1 className="chat-main-title">Gotchu. Let's talk.</h1>
          <h2 className="chat-subtitle">Mood's all yours – spill it</h2>
        </div>

        <div className="chat-input-section">
          <div className="input-container">
            <input 
              type="text" 
              placeholder="Say anything... I'm listening" 
              className="chat-input"
            />
            <button className="send-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/>
              </svg>
            </button>
          </div>
          
          <div className="privacy-notice">
            Private. Just you & Serin. <a href="#" className="privacy-link">Learn how we use your data</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage