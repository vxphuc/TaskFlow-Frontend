import { Component } from 'react'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'
import { useLocation } from 'react-router-dom'
import styles from './AppErrorBoundary.module.css'

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('TaskFlow render error', error, errorInfo)
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.error
      && previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <span className={styles.icon}><FiAlertTriangle /></span>
          <h1>Không thể tải màn hình này</h1>
          <p>
            Phiên bản giao diện có thể vừa được cập nhật hoặc dữ liệu chưa tải
            hoàn chỉnh. Hãy tải lại để đồng bộ phiên bản mới nhất.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            <FiRefreshCw />
            Tải lại trang
          </button>
        </section>
      </main>
    )
  }
}

export default function AppErrorBoundary({ children }) {
  const location = useLocation()
  const resetKey = `${location.pathname}${location.search}`

  return (
    <ErrorBoundary resetKey={resetKey}>
      {children}
    </ErrorBoundary>
  )
}
