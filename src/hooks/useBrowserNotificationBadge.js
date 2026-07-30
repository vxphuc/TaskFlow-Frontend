import { useEffect } from 'react'

const APP_TITLE = 'Quản trị công việc'
const FAVICON_PATH = '/logo2.png'
const FLASH_INTERVAL_MS = 1200

function updateFavicon(unreadCount) {
  const favicon = document.querySelector("link[rel='icon']")

  if (!favicon || unreadCount <= 0) {
    if (favicon) favicon.href = FAVICON_PATH
    return
  }

  const size = 64
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) return

  canvas.width = size
  canvas.height = size

  const label = unreadCount > 99 ? '99+' : String(unreadCount)
  context.beginPath()
  context.arc(size / 2, size / 2, 30, 0, Math.PI * 2)
  context.fillStyle = '#ee4d2d'
  context.fill()
  context.lineWidth = 3
  context.strokeStyle = '#ffffff'
  context.stroke()

  context.fillStyle = '#ffffff'
  context.font = `800 ${label.length > 2 ? 25 : label.length > 1 ? 32 : 39}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, size / 2, size / 2 + 2)

  favicon.href = canvas.toDataURL('image/png')
}

export function useBrowserNotificationBadge(unreadCount) {
  useEffect(() => {
    const standardTitle = APP_TITLE
    const alertTitle = 'Có thông báo mới'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let showAlertTitle = false

    const setCurrentTitle = () => {
      document.title = (
        unreadCount > 0
        && document.visibilityState !== 'visible'
        && showAlertTitle
      )
        ? alertTitle
        : standardTitle
    }

    updateFavicon(unreadCount)
    setCurrentTitle()

    const intervalId = unreadCount > 0 && !reduceMotion
      ? window.setInterval(() => {
          if (document.visibilityState !== 'visible') {
            showAlertTitle = !showAlertTitle
            setCurrentTitle()
          }
        }, FLASH_INTERVAL_MS)
      : null

    const handleVisibilityChange = () => {
      showAlertTitle = false
      setCurrentTitle()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalId) window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [unreadCount])

  useEffect(() => () => {
    document.title = APP_TITLE
    const favicon = document.querySelector("link[rel='icon']")
    if (favicon) favicon.href = FAVICON_PATH
  }, [])
}
