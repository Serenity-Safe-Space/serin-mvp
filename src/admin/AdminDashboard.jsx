import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './AdminDashboard.css'

const users = [
  {
    name: 'Sample User A',
    email: 'placeholder-a@serin.dev',
    summary: '— Filler summary for layout testing —',
    lastSeen: '?? min. ago',
    status: 'Mock',
    avatarColor: '#F29A9A',
  },
  {
    name: 'Sample User B',
    email: 'placeholder-b@serin.dev',
    summary: '— Demo copy, not real data —',
    lastSeen: '?? min. ago',
    status: 'Mock',
    avatarColor: '#F5C26B',
  },
  {
    name: 'Sample User C',
    email: 'placeholder-c@serin.dev',
    summary: '— Replace once analytics wired —',
    lastSeen: '?? min. ago',
    status: 'Mock',
    avatarColor: '#9CC8FF',
  },
  {
    name: 'Sample User D',
    email: 'placeholder-d@serin.dev',
    summary: '— Placeholder row —',
    lastSeen: '?? min. ago',
    status: 'Mock',
    avatarColor: '#8CD9C8',
  },
]

const AdminDashboard = () => {
  const [totalUsersState, setTotalUsersState] = useState({ status: 'loading', value: null })
  const [activeUsersState, setActiveUsersState] = useState({ status: 'loading', value: null })
  const [avgDailyUsersState, setAvgDailyUsersState] = useState({ status: 'loading', value: null })
  const [avgSessionDurationState, setAvgSessionDurationState] = useState({ status: 'loading', value: null })

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

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__glow" />
      <div className="admin-dashboard__container">
        <header className="admin-dashboard__header">
          <div className="admin-dashboard__brand">
            <div className="admin-dashboard__logo">
              <span role="img" aria-label="Serin llama">
                🦙
              </span>
            </div>
            <h1 className="admin-dashboard__title">Serin</h1>
          </div>
        </header>

        <section className="admin-dashboard__overview">
          <div className="admin-dashboard__overview-header">
            <h2>Overview</h2>
            <div className="admin-dashboard__stats-meta">
              <span>Active Sessions</span>
              <span>15</span>
              <span>Last seen</span>
              <span>15 min. ago</span>
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
            <h2>Feature Analytics (Mock Data)</h2>
            <button className="admin-dashboard__pill admin-dashboard__pill--slim">
              Export
            </button>
          </div>

          <div className="admin-dashboard__table-wrapper">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Summary</th>
                  <th>Last Seen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.email}>
                    <td>
                      <div className="admin-dashboard__user">
                        <div
                          className="admin-dashboard__avatar"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="admin-dashboard__user-info">
                          <span className="admin-dashboard__user-name">
                            {user.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="admin-dashboard__email">{user.email}</td>
                    <td>{user.summary}</td>
                    <td>{user.lastSeen}</td>
                    <td>
                      <span className="admin-dashboard__status-badge">
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
