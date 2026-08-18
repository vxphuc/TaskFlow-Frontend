import { APP_THEME_COLORS } from '../../theme/appTheme'
import styles from './ThemeColorPicker.module.css'

export default function ThemeColorPicker({ value, onChange, className = '' }) {
  return (
    <div
      className={`${styles.picker} ${className}`.trim()}
      role="group"
      aria-label="Chọn màu giao diện"
    >
      {APP_THEME_COLORS.map(({ value: color, label }) => (
        <button
          key={color}
          type="button"
          className={`${styles.swatch} ${value === color ? styles.active : ''}`}
          style={{ backgroundColor: color }}
          title={label}
          aria-label={`Chọn màu ${label}`}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

