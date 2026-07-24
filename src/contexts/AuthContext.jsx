import { useEffect, useState } from 'react'
import { getMeApi, loginApi } from '../api/authApi'
import {
  connectRealtime,
  disconnectRealtime,
} from '../realtime/realtimeClient'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('access_token')))

  const login = async (phone, password) => {
    const res = await loginApi({ phone, password })
    localStorage.setItem('access_token', res.data.access_token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    disconnectRealtime()
    localStorage.removeItem('access_token')
    setUser(null)
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    getMeApi()
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('access_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (user && token) {
      connectRealtime(token)
    } else {
      disconnectRealtime()
    }

    return disconnectRealtime
  }, [user])

  useEffect(() => {
    window.addEventListener('auth:expired', logout)
    return () => window.removeEventListener('auth:expired', logout)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
