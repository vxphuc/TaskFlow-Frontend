import { Alert, Button, Progress, Skeleton } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowRight, FiCheckCircle, FiClock, FiInbox, FiSend } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { getMyMonthlyReportApi } from '../../api/reportApi'
import { getMyAssignedTasksApi, getMyCreatedTasksApi } from '../../api/taskApi'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import { formatDateTime, getPriorityLabel, getStatusLabel } from '../../utils/task'
import styles from './UserDashboardPage.module.css'

export default function UserDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    const now = new Date()
    setError('')

    try {
      const [assignedRes, createdRes, reportRes] = await Promise.all([
        getMyAssignedTasksApi(),
        getMyCreatedTasksApi(),
        getMyMonthlyReportApi(now.getFullYear(), now.getMonth() + 1),
      ])
      setData({
        assigned: assignedRes.data.tasks || [],
        created: createdRes.data.tasks || [],
        report: reportRes.data.report || {},
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu tổng quan.')
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadDashboard)
  }, [loadDashboard])

  useRealtimeRefresh(loadDashboard, 'task')

  const stats = useMemo(() => {
    if (!data) return []
    const active = data.assigned.filter((task) =>
      ['TODO', 'IN_PROGRESS', 'REJECTED'].includes(task.status),
    ).length
    const waiting = data.created.filter((task) =>
      ['SUBMITTED', 'REVIEWING'].includes(task.status),
    ).length
    const completed = data.report.summary?.completed_tasks || 0
    const overdue = data.report.summary?.overdue_tasks || 0
    return [
      { label: 'Cần thực hiện', value: active, note: 'Task đang chờ bạn xử lý', icon: <FiInbox /> },
      { label: 'Chờ bạn duyệt', value: waiting, note: 'Kết quả từ người nhận việc', icon: <FiClock /> },
      { label: 'Hoàn thành tháng này', value: completed, note: 'Theo thời điểm được giao', icon: <FiCheckCircle /> },
      { label: 'Đang quá hạn', value: overdue, note: 'Cần ưu tiên xử lý', icon: <FiSend /> },
    ]
  }, [data])

  const focusTasks = data?.assigned
    .filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status))
    .slice(0, 5) || []
  const completionRate = data?.report.summary?.completion_rate || 0

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>HÔM NAY</span>
          <h1>Chào {user.full_name}</h1>
          <p>Tập trung vào công việc cần xử lý và các kết quả đang chờ phản hồi.</p>
        </div>
        <Button type="primary" icon={<FiSend />} onClick={() => navigate('/app/created')}>
          Giao công việc
        </Button>
      </header>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} />}
      {!data ? <Skeleton active paragraph={{ rows: 8 }} /> : (
        <>
          <section className={styles.statGrid}>
            {stats.map((stat) => (
              <article className={styles.statCard} key={stat.label}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div>
              </article>
            ))}
          </section>

          <div className={styles.mainGrid}>
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><h2>Việc cần tập trung</h2><p>Các task đang chờ bạn thực hiện.</p></div>
                <Button type="link" onClick={() => navigate('/app/assigned')}>Xem tất cả <FiArrowRight /></Button>
              </div>
              <div className={styles.taskList}>
                {focusTasks.length === 0 ? (
                  <div className={styles.empty}>Bạn chưa có công việc cần xử lý.</div>
                ) : focusTasks.map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    className={styles.taskRow}
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                  >
                    <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`} />
                    <span className={styles.taskBody}>
                      <strong>{task.title}</strong>
                      <small>{getPriorityLabel(task.priority)} · Hạn {formatDateTime(task.due_date)}</small>
                    </span>
                    <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <FiArrowRight />
                  </button>
                ))}
              </div>
            </section>

            <aside className={styles.performance}>
              <span className={styles.eyebrow}>HIỆU SUẤT CÁ NHÂN</span>
              <h2>Tháng này</h2>
              <Progress
                type="dashboard"
                percent={completionRate}
                strokeColor="#206a37"
                trailColor="#e4ebe6"
                size={156}
              />
              <strong>Tỷ lệ hoàn thành</strong>
              <p>{data.report.summary?.completed_on_time || 0} task hoàn thành đúng hạn.</p>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
