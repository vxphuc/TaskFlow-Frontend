import { io } from 'socket.io-client'

let socket = null
let realtimeStatus = 'disconnected'
const statusListeners = new Set()

const updateRealtimeStatus = (status) => {
  if (realtimeStatus === status) return

  realtimeStatus = status
  statusListeners.forEach((listener) => listener())
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

  if (
    socket?.auth?.token === token
    && (socket.connected || socket.active)
  ) {
    return
  }

  socket?.disconnect()
  updateRealtimeStatus('connecting')
  const nextSocket = io(getRealtimeUrl(), {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 15000,
  })
  socket = nextSocket

  const updateCurrentStatus = (status) => {
    if (socket === nextSocket) updateRealtimeStatus(status)
  }

  nextSocket.on('connect', () => updateCurrentStatus('connected'))
  nextSocket.on('disconnect', (reason) => {
    const willReconnect = ![
      'io client disconnect',
      'io server disconnect',
    ].includes(reason)
    updateCurrentStatus(willReconnect ? 'reconnecting' : 'disconnected')
  })
  nextSocket.on('connect_error', () => {
    updateCurrentStatus(nextSocket.active ? 'reconnecting' : 'disconnected')
  })
  nextSocket.io.on(
    'reconnect_attempt',
    () => updateCurrentStatus('reconnecting'),
  )
  nextSocket.io.on(
    'reconnect_failed',
    () => updateCurrentStatus('disconnected'),
  )

  nextSocket.on('taskflow:update', (payload) => {
    if (socket !== nextSocket) return
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

export const subscribeRealtimeStatus = (listener) => {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}
