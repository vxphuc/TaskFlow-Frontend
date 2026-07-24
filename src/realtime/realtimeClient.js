import { io } from 'socket.io-client'

let socket = null
let realtimeStatus = 'disconnected'

const updateRealtimeStatus = (status) => {
  if (realtimeStatus === status) return

  realtimeStatus = status
  window.dispatchEvent(
    new CustomEvent('taskflow:realtime-status', { detail: status }),
  )
}

const getRealtimeUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  return configuredUrl || window.location.origin
}

export const connectRealtime = (token) => {
  if (!token) return

  if (socket?.connected && socket.auth?.token === token) return

  socket?.disconnect()
  updateRealtimeStatus('connecting')
  socket = io(getRealtimeUrl(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  socket.on('connect', () => updateRealtimeStatus('connected'))
  socket.on('disconnect', () => updateRealtimeStatus('disconnected'))
  socket.on('connect_error', () => updateRealtimeStatus('disconnected'))
  socket.io.on('reconnect_attempt', () => updateRealtimeStatus('reconnecting'))

  socket.on('taskflow:update', (payload) => {
    window.dispatchEvent(
      new CustomEvent('taskflow:update', { detail: payload }),
    )
  })
}

export const disconnectRealtime = () => {
  socket?.disconnect()
  socket = null
  updateRealtimeStatus('disconnected')
}

export const getRealtimeStatus = () => realtimeStatus
