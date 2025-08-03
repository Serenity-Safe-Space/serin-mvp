import { Link } from 'react-router-dom'
import './Privacy.css'

function Privacy() {
  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <Link to="/" className="back-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Home
        </Link>
        
        <div className="privacy-header">
          <h1 className="privacy-title">Privacy & Data Policy</h1>
          <div className="privacy-title-underline"></div>
        </div>
        
        <div className="privacy-text">
          <p className="last-updated">Last updated: July 2025</p>
          
          <p>At Serin, we are fully committed to protecting the privacy and personal information of our users. When you create an account on our platform, we may collect certain personal details such as your name, email address, age, and gender. We also gather information on how you use the application, including your check-ins, the interactions you have within the app, and the primary concerns you choose to share with us. This information allows us to continuously improve the application, understand your needs more effectively, and connect you with peers who may provide the most meaningful support. If you prefer to use the chatbot anonymously, no personal information will be required or stored, and these interactions remain disconnected from your identity.</p>
          
          <p>The information collected is used solely for the purpose of providing and improving the Serin experience. It enables us to ensure the application functions correctly, to personalize your journey, to connect you with peers who are most compatible with your situation, and to enhance the services we provide. Your personal data will never be sold, rented, or shared with advertisers or unauthorized third parties. Please note that chatbot interactions are processed using Google's Gemini model to generate responses, but your personal data is never sold or shared beyond this purpose.</p>
          
          <p>All data is securely stored in the cloud, and access to personal information is strictly limited to authorized members of the Serin team, who are bound by confidentiality obligations. We retain personal data for the period required by law in the country where the user resides. Once this period has expired, or upon request from you, your personal data will be deleted unless we are legally obliged to preserve it. As a user, you have the right at any time to request access to your personal information, as well as to request its correction, export, or deletion. Such requests can be made by contacting us, and we will respond in compliance with applicable legal requirements.</p>
          
          <p>We take the security of your information very seriously and implement strict technical and organizational measures, including encryption and access controls, to safeguard your data against unauthorized access, disclosure, alteration, or destruction. If you have any questions regarding this Privacy and Data Policy, or if you wish to exercise your rights in relation to your personal data, you may contact us at contact@serenitysafespace.com</p>
        </div>
      </div>
    </div>
  )
}

export default Privacy