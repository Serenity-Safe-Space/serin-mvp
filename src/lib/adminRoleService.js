import { supabase } from './supabase'

const DEFAULT_ROLE = {
  role: 'viewer',
  isAdmin: false,
  isSuperAdmin: false,
}

export const fetchCurrentAdminRole = async () => {
  try {
    const { data, error } = await supabase.rpc('admin_current_role')
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data

    if (!row) {
      return DEFAULT_ROLE
    }

    const {
      role = 'viewer',
      is_admin: isAdmin = false,
      is_super_admin: isSuperAdmin = false,
    } = row

    return {
      role,
      isAdmin: Boolean(isAdmin),
      isSuperAdmin: Boolean(isSuperAdmin),
    }
  } catch (error) {
    console.warn('Failed to fetch admin role:', error)
    return DEFAULT_ROLE
  }
}

export const clearAdminRoleCache = () => DEFAULT_ROLE
