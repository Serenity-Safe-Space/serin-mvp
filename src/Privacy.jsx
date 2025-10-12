import { Link } from 'react-router-dom'
import { useLanguage } from './contexts/LanguageContext'
import './Privacy.css'

function Privacy() {
  const { t } = useLanguage()
  const paragraphs = t('privacy.paragraphs')

  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <Link to="/" className="back-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('privacy.back')}
        </Link>
        
        <div className="privacy-header">
          <h1 className="privacy-title">{t('privacy.title')}</h1>
          <div className="privacy-title-underline"></div>
        </div>
        
        <div className="privacy-text">
          <p className="last-updated">{t('privacy.lastUpdated')}</p>
          
          {Array.isArray(paragraphs) && paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Privacy
