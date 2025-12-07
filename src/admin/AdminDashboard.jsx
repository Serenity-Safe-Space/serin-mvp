import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchAdminUserFeatureAnalytics } from '../lib/adminAnalyticsService'
import { useAuth } from '../contexts/AuthContext'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { adminRole, roleLoading } = useAuth()
  const [totalUsersState, setTotalUsersState] = useState({ status: 'loading', value: null })
  const [activeUsersState, setActiveUsersState] = useState({ status: 'loading', value: null })
  const [avgDailyUsersState, setAvgDailyUsersState] = useState({ status: 'loading', value: null })
  const [avgSessionDurationState, setAvgSessionDurationState] = useState({ status: 'loading', value: null })

  // Anonymous Stats
  const [viewMode, setViewMode] = useState('loggedin')
  const [anonTotalUsersState, setAnonTotalUsersState] = useState({ status: 'idle', value: null })
  const [anonActiveUsersState, setAnonActiveUsersState] = useState({ status: 'idle', value: null })
  const [anonAvgDailyUsersState, setAnonAvgDailyUsersState] = useState({ status: 'idle', value: null })
  const [anonAvgSessionDurationState, setAnonAvgSessionDurationState] = useState({ status: 'idle', value: null })

  const [userTableState, setUserTableState] = useState({ status: 'idle', rows: [], error: null })
  const [overviewMeta, setOverviewMeta] = useState({ activeSessions: '...', lastSeenDisplay: '...' })

  const roleLabel = useMemo(() => {
    switch (adminRole.role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'viewer':
      default:
        return 'Viewer'
    }
  }, [adminRole.role])

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

  // Fetch Anonymous Stats
  useEffect(() => {
    if (viewMode !== 'anonymous') return

    const fetchAnonStats = async () => {
      // Total Anonymous Users
      try {
        setAnonTotalUsersState(prev => ({ ...prev, status: 'loading' }))
        const { data, error } = await supabase.rpc('admin_anonymous_total_users')
        if (error) throw error
        setAnonTotalUsersState({ status: 'success', value: Number(data) })
      } catch (err) {
        console.warn('Failed to fetch anon total users:', err)
        setAnonTotalUsersState({ status: 'error', value: null })
      }

      // Active Anonymous Users
      try {
        setAnonActiveUsersState(prev => ({ ...prev, status: 'loading' }))
        const { data, error } = await supabase.rpc('admin_anonymous_active_users')
        if (error) throw error
        setAnonActiveUsersState({ status: 'success', value: Number(data) })
      } catch (err) {
        console.warn('Failed to fetch anon active users:', err)
        setAnonActiveUsersState({ status: 'error', value: null })
      }

      // Avg Daily Anonymous Users
      try {
        setAnonAvgDailyUsersState(prev => ({ ...prev, status: 'loading' }))
        const { data, error } = await supabase.rpc('admin_anonymous_avg_daily_users')
        if (error) throw error
        setAnonAvgDailyUsersState({ status: 'success', value: Number(data) })
      } catch (err) {
        console.warn('Failed to fetch anon avg daily users:', err)
        setAnonAvgDailyUsersState({ status: 'error', value: null })
      }

      // Avg Session Duration
      try {
        setAnonAvgSessionDurationState(prev => ({ ...prev, status: 'loading' }))
        const { data, error } = await supabase.rpc('admin_anonymous_avg_session_duration')
        if (error) throw error
        setAnonAvgSessionDurationState({ status: 'success', value: Number(data) })
      } catch (err) {
        console.warn('Failed to fetch anon avg session duration:', err)
        setAnonAvgSessionDurationState({ status: 'error', value: null })
      }
    }

    if (anonTotalUsersState.status === 'idle') {
      fetchAnonStats()
    }
  }, [viewMode, anonTotalUsersState.status])

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
    const buildCard = (title, state, formatter, subtitle) => {
      const { status, value } = state
      let displayValue = null

      if (status === 'success' && typeof value === 'number') {
        displayValue = formatter(value)
      }

      return {
        title,
        subtitle,
        status,
        displayValue,
      }
    }

    const isAnonymous = viewMode === 'anonymous'

    return [
      buildCard(
        isAnonymous ? 'Total Visitors' : 'Total Users',
        isAnonymous ? anonTotalUsersState : totalUsersState,
        (val) => val.toLocaleString(),
        'All Time'
      ),
      buildCard(
        isAnonymous ? 'Active Visitors' : 'Active Users',
        isAnonymous ? anonActiveUsersState : activeUsersState,
        (val) => val.toLocaleString(),
        'Past 7 Days'
      ),
      buildCard(
        'Avg Daily',
        isAnonymous ? anonAvgDailyUsersState : avgDailyUsersState,
        (val) => val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        'Unique / Day (7d Avg)'
      ),
      buildCard(
        'Avg Session',
        isAnonymous ? anonAvgSessionDurationState : avgSessionDurationState,
        (val) => {
          const roundedSeconds = Math.max(0, Math.round(val))
          const minutes = Math.floor(roundedSeconds / 60)
          const seconds = roundedSeconds % 60
          return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
        },
        'Duration (7d Avg)'
      ),
    ]
  }, [
    viewMode,
    totalUsersState, activeUsersState, avgDailyUsersState, avgSessionDurationState,
    anonTotalUsersState, anonActiveUsersState, anonAvgDailyUsersState, anonAvgSessionDurationState
  ])

  const handleNavigateHome = useCallback(() => {
    navigate('/')
  }, [navigate])

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__glow" />
      <div className="admin-dashboard__container">
        <header className="admin-dashboard__header">
          <div className="admin-dashboard__header-left">
            <div className="admin-dashboard__brand">
              <div className="admin-dashboard__logo">
                <span role="img" aria-label="Serin llama">
                  🦙
                </span>
              </div>
              <h1 className="admin-dashboard__title">Serin</h1>
            </div>
            <button type="button" className="admin-dashboard__back-link" onClick={handleNavigateHome}>
              ← Back to Chat
            </button>
          </div>
          {!roleLoading && (
            <span className={`admin-dashboard__role-badge admin-dashboard__role-badge--${adminRole.role}`}>
              {roleLabel}
            </span>
          )}
        </header>

        <section className="admin-dashboard__overview">
          <div className="admin-dashboard__overview-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2>Overview</h2>
              <div className="admin-dashboard__view-toggle">
                <button
                  className={`admin-dashboard__toggle-btn ${viewMode === 'loggedin' ? 'active' : ''}`}
                  onClick={() => setViewMode('loggedin')}
                >
                  Logged In
                </button>
                <button
                  className={`admin-dashboard__toggle-btn ${viewMode === 'anonymous' ? 'active' : ''}`}
                  onClick={() => setViewMode('anonymous')}
                >
                  Anonymous
                </button>
              </div>
            </div>
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
              <div className={`admin-dashboard__card admin-dashboard__card--${card.status}`} key={card.title}>
                <p className="admin-dashboard__card-title">{card.title}</p>
                <div className="admin-dashboard__card-value-wrapper">
                  {card.status === 'loading' && <div className="admin-dashboard__card-skeleton" />}
                  {card.status === 'error' && (
                    <span className="admin-dashboard__card-error">Unable to load</span>
                  )}
                  {card.status === 'success' && (
                    <p className="admin-dashboard__card-value">{card.displayValue}</p>
                  )}
                </div>
                <p className="admin-dashboard__card-subtitle">{card.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-dashboard__feature-analytics">
          <div className="admin-dashboard__section-heading">
            <h2>{viewMode === 'anonymous' ? 'Anonymous Activity' : 'Feature Analytics'}</h2>
          </div>

          {viewMode === 'anonymous' ? (
            <div className="admin-dashboard__table-wrapper">
              <div className="admin-dashboard__table-placeholder">
                Detailed session logs for anonymous users are not currently displayed in this view.
                <br />
                Focus on the overview metrics above for anonymous usage trends.
              </div>
            </div>
          ) : (
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
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard
