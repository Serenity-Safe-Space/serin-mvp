import './Privacy.css'

function Privacy() {
  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <div className="privacy-header">
          <h1 className="privacy-title">Privacy & Data</h1>
          <div className="privacy-title-underline"></div>
        </div>
        
        <div className="privacy-text">
          <p>We store your messages to improve our service, but they are not shared with anyone else. Learn more by reading our privacy policy.</p>
        </div>
        
        <button className="privacy-policy-button">
          Privacy Policy
        </button>
      </div>
    </div>
  )
}

export default Privacy