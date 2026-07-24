import { useEffect } from 'react'

const DEFAULT_FALLBACK_MS = 60000

export function useRealtimeRefresh(
  refresh,
  resource,
  fallbackMs = DEFAULT_FALLBACK_MS,
) {
  useEffect(() => {
    const handleRealtimeUpdate = (event) => {
      if (
        document.visibilityState === 'visible'
        && event.detail?.resource === resource
      ) {
        refresh(event.detail)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }, fallbackMs)

    window.addEventListener('taskflow:update', handleRealtimeUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('taskflow:update', handleRealtimeUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fallbackMs, refresh, resource])
}
