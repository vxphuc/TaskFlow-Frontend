import { useCallback, useEffect, useState } from 'react'
import {
  APP_THEME_COLOR_STORAGE_KEY,
  getAppThemeContrastColor,
  getStoredAppThemeColor,
  isAppThemeColor,
} from '../theme/appTheme'

export function useAppThemeColor() {
  const [color, setColor] = useState(getStoredAppThemeColor)

  const selectColor = useCallback((nextColor) => {
    if (!isAppThemeColor(nextColor)) return

    setColor(nextColor)
    try {
      localStorage.setItem(APP_THEME_COLOR_STORAGE_KEY, nextColor)
    } catch {
      // The selected color still applies for this session when storage is unavailable.
    }
  }, [])

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', color)
  }, [color])

  useEffect(() => {
    const syncColorAcrossTabs = (event) => {
      if (
        event.key === APP_THEME_COLOR_STORAGE_KEY
        && isAppThemeColor(event.newValue)
      ) {
        setColor(event.newValue)
      }
    }

    window.addEventListener('storage', syncColorAcrossTabs)
    return () => window.removeEventListener('storage', syncColorAcrossTabs)
  }, [])

  return {
    color,
    contrastColor: getAppThemeContrastColor(color),
    selectColor,
  }
}

