export const APP_THEME_COLORS = [
  { value: '#174d29', label: 'Xanh lá' },
  { value: '#0C1C4D', label: 'Xanh navy' },
  { value: '#F6903C', label: 'Cam' },
]

export const APP_THEME_COLOR_STORAGE_KEY = 'taskflow_login_identity_color'
export const DEFAULT_APP_THEME_COLOR = APP_THEME_COLORS[0].value

export const isAppThemeColor = (color) =>
  APP_THEME_COLORS.some(({ value }) => value === color)

export const getStoredAppThemeColor = () => {
  try {
    const storedColor = localStorage.getItem(APP_THEME_COLOR_STORAGE_KEY)
    return isAppThemeColor(storedColor)
      ? storedColor
      : DEFAULT_APP_THEME_COLOR
  } catch {
    return DEFAULT_APP_THEME_COLOR
  }
}

export const getAppThemeContrastColor = (color) =>
  color === '#F6903C' ? '#17211a' : '#fff'

