import { useEffect, useState } from 'react'
import { getRealtimeStatus } from '../realtime/realtimeClient'

export function useRealtimeStatus() {
  const [status, setStatus] = useState(getRealtimeStatus)

  useEffect(() => {
    const handleStatus = (event) => setStatus(event.detail)

    window.addEventListener('taskflow:realtime-status', handleStatus)
    return () => {
      window.removeEventListener('taskflow:realtime-status', handleStatus)
    }
  }, [])

  return status
}
