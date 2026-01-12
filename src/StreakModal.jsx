import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { getCurrentStreak, getUserActivity } from './lib/activityService'
import './StreakModal.css'

function StreakModal({ isVisible, onClose }) {
  const { user } = useAuth()
  const [streak, setStreak] = useState(0)
  const [activityDates, setActivityDates] = useState(new Set())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [totalDays, setTotalDays] = useState(0)
  const [pauses, setPauses] = useState(0)

  useEffect(() => {
    if (isVisible && user?.id) {
      loadStreakData()
    }
  }, [isVisible, user])

  const loadStreakData = async () => {
    if (!user?.id) return
    setLoading(true)

    try {
      const [streakResult, activityResult] = await Promise.all([
        getCurrentStreak(user.id),
        getUserActivity(user.id)
      ])

      setStreak(streakResult.count || 0)

      const dates = new Set(
        (activityResult.data || []).map(item => item.activity_date)
      )
      setActivityDates(dates)
      setTotalDays(dates.size)

      // Calculate pauses (gaps in activity)
      const sortedDates = Array.from(dates).sort()
      let pauseCount = 0
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diff = Math.floor((curr - prev) / (1000 * 60 * 60 * 24))
        if (diff > 1) {
          pauseCount += diff - 1
        }
      }
      setPauses(pauseCount)
    } catch (error) {
      console.error('Error loading streak data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatDateString = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isToday = (year, month, day) => {
    const today = new Date()
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const days = []
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    // Day headers
    days.push(
      <div key="headers" className="calendar-headers">
        {dayNames.map(day => (
          <span key={day} className="calendar-header">{day}</span>
        ))}
      </div>
    )

    // Calendar grid
    const cells = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(year, month, day)
      const hasActivity = activityDates.has(dateStr)
      const isTodayDate = isToday(year, month, day)

      cells.push(
        <div
          key={day}
          className={`calendar-cell ${isTodayDate ? 'today' : ''} ${hasActivity ? 'active' : ''}`}
        >
          {hasActivity ? (
            <span className="fire-icon">🔥</span>
          ) : (
            <span className="day-number">{day}</span>
          )}
        </div>
      )
    }

    days.push(
      <div key="grid" className="calendar-grid">
        {cells}
      </div>
    )

    return days
  }

  if (!isVisible) return null

  return (
    <div className="streak-modal-overlay" onClick={onClose}>
      <div className="streak-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="streak-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Llama peek at top */}
        <div className="streak-llama-peek">
          <img src="/serin-llama.png" alt="Serin" className="streak-llama-img" />
        </div>

        {/* Main content */}
        <div className="streak-modal-content">
          {/* Streak display */}
          <div className="streak-header">
            <span className="sparkle">✨</span>
            <h2 className="streak-title">Your Streak</h2>
            <span className="sparkle">✨</span>
          </div>

          <div className="streak-card">
            <span className="streak-number">{loading ? '...' : streak}</span>
            <span className="streak-label">DAY STREAK!</span>
          </div>

          {/* Calendar */}
          <div className="streak-calendar">
            <div className="calendar-nav">
              <button className="nav-btn" onClick={prevMonth}>&lt;</button>
              <span className="calendar-month">{formatMonth(currentMonth)}</span>
              <button className="nav-btn" onClick={nextMonth}>&gt;</button>
            </div>
            {renderCalendar()}
          </div>

          {/* Stats footer */}
          <div className="streak-stats">
            <div className="stat-box">
              <span className="stat-icon">🔥</span>
              <div className="stat-info">
                <span className="stat-number">{loading ? '...' : totalDays}</span>
                <span className="stat-label">Days showed</span>
              </div>
            </div>
            <div className="stat-box">
              <span className="stat-icon">🌙</span>
              <div className="stat-info">
                <span className="stat-number">{loading ? '...' : pauses}</span>
                <span className="stat-label">Pauses</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StreakModal
