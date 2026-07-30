import { useEffect } from 'react'

const APP_TITLE = 'Quản trị công việc'
const FAVICON_PATH = '/logo2.png'
const FLASH_INTERVAL_MS = 1200

function updateFavicon(unreadCount) {
  const favicon = document.querySelector("link[rel='icon']")

  if (!favicon || unreadCount <= 0) {
    if (favicon) favicon.href = FAVICON_PATH
    return () => {}
  }

  let cancelled = false
  const image = new Image()

  image.onload = () => {
    if (cancelled) return

    const size = 64
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = size
    canvas.height = size
    context.drawImage(image, 0, 0, size, size)

    const label = unreadCount > 99 ? '99+' : String(unreadCount)
    context.beginPath()
    context.arc(47, 17, 16, 0, Math.PI * 2)
    context.fillStyle = '#ee4d2d'
    context.fill()
    context.lineWidth = 3
    context.strokeStyle = '#ffffff'
    context.stroke()

    context.fillStyle = '#ffffff'
    context.font = `700 ${label.length > 2 ? 13 : 16}px Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, 47, 18)

    favicon.href = canvas.toDataURL('image/png')
  }

  image.src = FAVICON_PATH

  return () => {
    cancelled = true
  }
}

export function useBrowserNotificationBadge(unreadCount) {
  useEffect(() => {
    const visibleCount = unreadCount > 99 ? '99+' : unreadCount
    const standardTitle = unreadCount > 0
      ? `(${visibleCount}) ${APP_TITLE}`
      : APP_TITLE
    const alertTitle = `(${visibleCount}) Có thông báo mới`
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

    const cleanupFavicon = updateFavicon(unreadCount)
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
      cleanupFavicon()
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
