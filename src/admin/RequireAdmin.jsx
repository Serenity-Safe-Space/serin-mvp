import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const RequireAdmin = ({ children }) => {
  const location = useLocation()
  const { user, loading, roleLoading, adminRole } = useAuth()

  if (loading || roleLoading) {
    return (
      <div className="admin-route-loading">
        <p style={{ color: '#F5E9FF', textAlign: 'center', marginTop: '40vh' }}>Loading admin access…</p>
      </div>
    )
  }

  if (!user || !adminRole.isAdmin) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}

export default RequireAdmin
