import { Alert, DatePicker, Empty, Progress, Segmented, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCornerDownRight,
  FiRefreshCw,
  FiTarget,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import {
  getMyAssignerMonthlyReportApi,
  getMyMonthlyReportApi,
} from '../../api/reportApi'
import { formatDateTime, getStatusLabel } from '../../utils/task'
import styles from './UserReportsPage.module.css'

const views = [
  { label: 'Tôi thực hiện', value: 'assignee' },
  { label: 'Tôi giao việc', value: 'assigner' },
]

export default function UserReportsPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(dayjs())
  const [view, setView] = useState('assignee')
  const [taskKind, setTaskKind] = useState('ALL')
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  const loadReport = useCallback(async () => {
    setError('')
    setReport(null)
    try {
      const request = view === 'assignee'
        ? getMyMonthlyReportApi(month.year(), month.month() + 1)
        : getMyAssignerMonthlyReportApi(month.year(), month.month() + 1)
      const response = await request
      setReport(response.data.report)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải báo cáo hiệu suất.')
    }
  }, [month, view])

  useEffect(() => {
    Promise.resolve().then(loadReport)
  }, [loadReport])

  const summary = useMemo(() => report?.summary || {}, [report])
  const workItemBreakdown = report?.work_item_breakdown || {}
  const filteredTasks = useMemo(
    () => report?.tasks?.filter((task) => {
      if (taskKind === 'MAIN_TASK') return !task.parent_task_id
      if (taskKind === 'SUBTASK') return Boolean(task.parent_task_id)
      return true
    }) || [],
    [report, taskKind],
  )
  const stats = useMemo(() => {
    if (!report) return []
    return [
      {
        label: view === 'assignee' ? 'Task được giao' : 'Task đã giao',
        value: view === 'assignee' ? summary.total_assigned_tasks : summary.total_created_tasks,
        icon: <FiTarget />,
      },
      { label: 'Đã hoàn thành', value: summary.completed_tasks, icon: <FiCheckCircle /> },
      { label: 'Đang quá hạn', value: summary.overdue_tasks, icon: <FiAlertCircle /> },
      {
        label: view === 'assignee' ? 'Số lần bị trả lại' : 'Đang chờ duyệt',
        value: view === 'assignee' ? summary.total_rejections : summary.waiting_review_tasks,
        icon: view === 'assignee' ? <FiRefreshCw /> : <FiClock />,
      },
    ]
  }, [report, summary, view])

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>BÁO CÁO CÔNG VIỆC</span>
          <h1>Hiệu suất theo tháng</h1>
          <p>Đánh giá tiến độ thực hiện và chất lượng giao việc trong cùng một nơi.</p>
        </div>
        <DatePicker
          picker="month"
          allowClear={false}
          value={month}
          onChange={(value) => value && setMonth(value)}
          format="MM/YYYY"
        />
      </header>

      <div className={styles.viewSwitch}>
        <Segmented options={views} value={view} onChange={setView} block />
      </div>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} />}
      {!report ? !error && <Skeleton active paragraph={{ rows: 9 }} /> : (
        <>
          <section className={styles.statGrid}>
            {stats.map((stat) => (
              <article className={styles.statCard} key={stat.label}>
                <span>{stat.icon}</span>
                <div><small>{stat.label}</small><strong>{stat.value || 0}</strong></div>
              </article>
            ))}
          </section>

          <section className={styles.workTypeGrid}>
            {[
              {
                key: 'main_tasks',
                label: 'Task chính',
                icon: <FiClipboard />,
                data: workItemBreakdown.main_tasks,
              },
              {
                key: 'subtasks',
                label: 'Subtask',
                icon: <FiCornerDownRight />,
                data: workItemBreakdown.subtasks,
              },
            ].map((item) => (
              <article key={item.key} className={styles.workTypeCard}>
                <header>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.data?.total_tasks || 0} công việc trong kỳ</small>
                  </div>
                </header>
                <div>
                  <span><small>Hoàn thành</small><strong>{item.data?.completed_tasks || 0}</strong></span>
                  <span><small>Đang xử lý</small><strong>{item.data?.active_tasks || 0}</strong></span>
                  <span><small>Quá hạn</small><strong>{item.data?.overdue_tasks || 0}</strong></span>
                  <span><small>Tỷ lệ</small><strong>{item.data?.completion_rate || 0}%</strong></span>
                </div>
              </article>
            ))}
          </section>

          <div className={styles.metricsGrid}>
            <section className={styles.rates}>
              <div>
                <Progress type="dashboard" size={140} percent={summary.completion_rate || 0} strokeColor="#206a37" trailColor="#e4ebe6" />
                <strong>Tỷ lệ hoàn thành</strong>
              </div>
              <div>
                <Progress type="dashboard" size={140} percent={summary.on_time_rate || 0} strokeColor="#3977a8" trailColor="#e6ebef" />
                <strong>Hoàn thành đúng hạn</strong>
              </div>
            </section>
            <section className={styles.breakdown}>
              <h2>Cơ cấu trạng thái</h2>
              <div className={styles.breakdownGrid}>
                <span><small>Chờ thực hiện</small><strong>{summary.todo_tasks || 0}</strong></span>
                <span><small>Đang thực hiện</small><strong>{summary.in_progress_tasks || 0}</strong></span>
                <span><small>Đã gửi kết quả</small><strong>{summary.submitted_tasks || 0}</strong></span>
                <span><small>Cần làm lại</small><strong>{summary.rejected_tasks || 0}</strong></span>
              </div>
            </section>
          </div>

          {view === 'assigner' && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><h2>Hiệu suất người nhận việc</h2><p>Tổng hợp các nhân sự bạn đã giao task trong tháng.</p></div>
                <FiUsers />
              </div>
              {!report.assignee_breakdown?.length ? <Empty description="Chưa có dữ liệu nhân sự" /> : (
                <div className={styles.peopleList}>
                  <div className={styles.peopleHeader}>
                    <span>Nhân sự</span><span>Task chính</span><span>Subtask</span><span>Hoàn thành</span><span>Quá hạn</span><span>Trả lại</span>
                  </div>
                  {report.assignee_breakdown.map((item) => (
                    <div className={styles.personRow} key={item.user_id}>
                      <strong>{item.full_name || 'Nhân sự'}</strong>
                      <span>{item.main_task_count || 0}</span>
                      <span>{item.subtask_count || 0}</span>
                      <span>{item.completed_tasks}</span>
                      <span>{item.overdue_tasks}</span>
                      <span>{item.total_rejections}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Chi tiết công việc</h2><p>{filteredTasks.length} công việc phù hợp.</p></div>
              <Segmented
                size="small"
                value={taskKind}
                onChange={setTaskKind}
                options={[
                  { value: 'ALL', label: 'Tất cả' },
                  { value: 'MAIN_TASK', label: 'Task chính' },
                  { value: 'SUBTASK', label: 'Subtask' },
                ]}
              />
            </div>
            {!filteredTasks.length ? <Empty description="Không có công việc phù hợp" /> : (
              <div className={styles.taskList}>
                {filteredTasks.map((task) => (
                  <button type="button" key={task.id} onClick={() => navigate(`/app/tasks/${task.id}`)}>
                    <span>
                      <strong>{task.title}</strong>
                      <small>
                        <b className={task.parent_task_id ? styles.subtaskType : styles.mainTaskType}>
                          {task.parent_task_id ? 'Subtask' : 'Task chính'}
                        </b>
                        Hạn {formatDateTime(task.due_date)}
                      </small>
                    </span>
                    <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>{getStatusLabel(task.status)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
