import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchAdminUserFeatureAnalytics } from '../lib/adminAnalyticsService'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [totalUsersState, setTotalUsersState] = useState({ status: 'loading', value: null })
  const [activeUsersState, setActiveUsersState] = useState({ status: 'loading', value: null })
  const [avgDailyUsersState, setAvgDailyUsersState] = useState({ status: 'loading', value: null })
  const [avgSessionDurationState, setAvgSessionDurationState] = useState({ status: 'loading', value: null })
  const [userTableState, setUserTableState] = useState({ status: 'idle', rows: [], error: null })
  const [overviewMeta, setOverviewMeta] = useState({ activeSessions: '...', lastSeenDisplay: '...' })

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_total_users')
        if (error) throw error

        const count = Number.parseInt(data, 10)
        setTotalUsersState({
          status: Number.isNaN(count) ? 'error' : 'success',
          value: Number.isNaN(count) ? null : count,
        })
      } catch (error) {
        console.warn('Failed to fetch total users count:', error)
        setTotalUsersState({
          status: 'error',
          value: null,
        })
      }
    }

    fetchTotalUsers()
  }, [])

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_active_users')
        if (error) throw error

        const count = Number.parseInt(data, 10)
        setActiveUsersState({
          status: Number.isNaN(count) ? 'error' : 'success',
          value: Number.isNaN(count) ? null : count,
        })
      } catch (error) {
        console.warn('Failed to fetch active users count:', error)
        setActiveUsersState({
          status: 'error',
          value: null,
        })
      }
    }

    fetchActiveUsers()
  }, [])

  useEffect(() => {
    const fetchAvgDailyUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_avg_daily_users')
        if (error) throw error

        const average = typeof data === 'number' ? data : Number.parseFloat(data)
        setAvgDailyUsersState({
          status: Number.isNaN(average) ? 'error' : 'success',
          value: Number.isNaN(average) ? null : average,
        })
      } catch (error) {
        console.warn('Failed to fetch avg daily users:', error)
        setAvgDailyUsersState({
          status: 'error',
          value: null,
        })
      }
    }

    fetchAvgDailyUsers()
  }, [])

  useEffect(() => {
    const fetchAvgSessionDuration = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_avg_session_duration')
        if (error) throw error

        const seconds = typeof data === 'number' ? data : Number.parseFloat(data)
        setAvgSessionDurationState({
          status: Number.isNaN(seconds) ? 'error' : 'success',
          value: Number.isNaN(seconds) ? null : seconds,
        })
      } catch (error) {
        console.warn('Failed to fetch avg session duration:', error)
        setAvgSessionDurationState({
          status: 'error',
          value: null,
        })
      }
    }

    fetchAvgSessionDuration()
  }, [])

  useEffect(() => {
    let isCancelled = false
    const loadUsers = async () => {
      setUserTableState(prev => ({ ...prev, status: 'loading', error: null }))
      try {
        const rows = await fetchAdminUserFeatureAnalytics()
        if (!isCancelled) {
          setUserTableState({ status: 'success', rows, error: null })
        }
      } catch (error) {
        console.warn('Failed to fetch admin users list:', error)
        if (!isCancelled) {
          setUserTableState({
            status: 'error',
            rows: [],
            error: error?.message || 'Failed to load users',
          })
        }
      }
    }

    loadUsers()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (userTableState.status !== 'success' || userTableState.rows.length === 0) {
      setOverviewMeta({
        activeSessions: '0',
        lastSeenDisplay: 'No activity yet',
      })
      return
    }

    const rows = userTableState.rows
    const activeSessions = rows.filter(row => row.status === 'Active').length

    const sortedByLastSeen = rows
      .map(row => ({
        ...row,
        lastSeenTs: row.lastSeen ? new Date(row.lastSeen).valueOf() : null,
      }))
      .filter(row => typeof row.lastSeenTs === 'number' && !Number.isNaN(row.lastSeenTs))
      .sort((a, b) => b.lastSeenTs - a.lastSeenTs)

    const latest = sortedByLastSeen[0]

    setOverviewMeta({
      activeSessions: activeSessions.toLocaleString(),
      lastSeenDisplay: latest
        ? `${latest.lastSeenRelative}${latest.displayName ? ` (${latest.displayName})` : ''}`
        : 'No activity yet',
    })
  }, [userTableState])

  const overviewCards = useMemo(() => {
    const formatCount = (state, decimals = 0) => {
      if (state.status === 'loading') return '...'
      if (state.status === 'error' || typeof state.value !== 'number') return 'ERR'
      return state.value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    }

    const formatDuration = (state) => {
      if (state.status === 'loading') return '...'
      if (state.status === 'error' || typeof state.value !== 'number') return 'ERR'

      const roundedSeconds = Math.max(0, Math.round(state.value))
      const minutes = Math.floor(roundedSeconds / 60)
      const seconds = roundedSeconds % 60
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    }

    return [
      { title: 'Total Users', value: formatCount(totalUsersState), subtitle: 'All Time' },
      { title: 'Active Users', value: formatCount(activeUsersState), subtitle: 'Past 7 Days' },
      { title: 'Avg Daily', value: formatCount(avgDailyUsersState, 1), subtitle: 'Unique / Day (7d Avg)' },
      { title: 'Avg Session', value: formatDuration(avgSessionDurationState), subtitle: 'Duration (7d Avg)' },
    ]
  }, [totalUsersState, activeUsersState, avgDailyUsersState, avgSessionDurationState])

  const handleNavigateHome = useCallback(() => {
    navigate('/')
  }, [navigate])

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__glow" />
      <div className="admin-dashboard__container">
        <header className="admin-dashboard__header">
          <button type="button" className="admin-dashboard__brand" onClick={handleNavigateHome}>
            <div className="admin-dashboard__logo">
              <span role="img" aria-label="Serin llama">
                🦙
              </span>
            </div>
            <h1 className="admin-dashboard__title">Serin</h1>
          </button>
        </header>

        <section className="admin-dashboard__overview">
          <div className="admin-dashboard__overview-header">
            <h2>Overview</h2>
            <div className="admin-dashboard__stats-meta">
              <div className="admin-dashboard__stat">
                <span className="admin-dashboard__stat-label">Active Sessions</span>
                <span className="admin-dashboard__stat-value">{overviewMeta.activeSessions}</span>
              </div>
              <div className="admin-dashboard__stat">
                <span className="admin-dashboard__stat-label">Last Seen User</span>
                <span className="admin-dashboard__stat-value">{overviewMeta.lastSeenDisplay}</span>
              </div>
            </div>
          </div>
          <div className="admin-dashboard__cards">
            {overviewCards.map(card => (
              <div className="admin-dashboard__card" key={card.title}>
                <p className="admin-dashboard__card-title">{card.title}</p>
                <p className="admin-dashboard__card-value">{card.value}</p>
                <p className="admin-dashboard__card-subtitle">{card.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-dashboard__feature-analytics">
          <div className="admin-dashboard__section-heading">
            <h2>Feature Analytics</h2>
          </div>

          <div className="admin-dashboard__table-wrapper">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Summary</th>
                  <th>Messages Sent</th>
                  <th>Average Mood</th>
                  <th>Last Seen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userTableState.status === 'loading' && (
                  <tr>
                    <td colSpan={7} className="admin-dashboard__table-placeholder">
                      Loading user analytics…
                    </td>
                  </tr>
                )}
                {userTableState.status === 'error' && (
                  <tr>
                    <td colSpan={7} className="admin-dashboard__table-placeholder admin-dashboard__table-placeholder--error">
                      {userTableState.error}
                    </td>
                  </tr>
                )}
                {userTableState.status === 'success' && userTableState.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-dashboard__table-placeholder">
                      No users found yet.
                    </td>
                  </tr>
                )}
                {userTableState.status === 'success' &&
                  userTableState.rows.map(user => (
                    <tr key={user.userId || user.email}>
                      <td>
                        <div className="admin-dashboard__user">
                          <div
                            className="admin-dashboard__avatar"
                            style={{ backgroundColor: user.avatarColor }}
                          >
                            {user.initials}
                          </div>
                          <div className="admin-dashboard__user-info">
                            <span className="admin-dashboard__user-name">
                              {user.fullName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="admin-dashboard__email">{user.email}</td>
                      <td>{user.summary}</td>
                      <td>{user.messagesSent.toLocaleString()}</td>
                      <td>
                        <div className="admin-dashboard__mood">
                          <span className="admin-dashboard__mood-label">{user.moodLabel}</span>
                          {typeof user.averageConfidence === 'number' && (
                            <span className="admin-dashboard__mood-score">
                              {Math.round(user.averageConfidence * 100)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{user.lastSeenRelative}</td>
                      <td>
                        <span
                          className={`admin-dashboard__status-badge admin-dashboard__status-badge--${user.status === 'Active' ? 'active' : 'inactive'}`}
                        >
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard
