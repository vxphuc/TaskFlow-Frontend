import { Alert, Button, DatePicker, Empty, Pagination, Progress, Segmented, Select, Skeleton, message } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCornerDownRight,
  FiDownload,
  FiRefreshCw,
  FiTarget,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router'
import {
  exportMyMonthlyReportApi,
  getMyAssignerMonthlyReportApi,
  getMyMonthlyReportApi,
} from '../../api/reportApi'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import { formatDateTime, getStatusLabel, taskStatuses } from '../../utils/task'
import styles from './UserReportsPage.module.css'

const views = [
  { label: 'Tôi thực hiện', value: 'assignee' },
  { label: 'Tôi giao việc', value: 'assigner' },
]
const ASSIGNEES_PER_PAGE = 6

export default function UserReportsPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(dayjs())
  const [view, setView] = useState('assignee')
  const [taskKind, setTaskKind] = useState('ALL')
  const [taskStatus, setTaskStatus] = useState()
  const [assigneeDepartment, setAssigneeDepartment] = useState()
  const [assigneePage, setAssigneePage] = useState(1)
  const [report, setReport] = useState(null)
  const [exporting, setExporting] = useState(false)
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

  useRealtimeRefresh(loadReport, 'task')

  const exportReport = async () => {
    setExporting(true)
    setError('')
    try {
      const response = await exportMyMonthlyReportApi(
        month.year(),
        month.month() + 1,
        view,
      )
      const disposition = response.headers['content-disposition'] || ''
      const matchedName = disposition.match(/filename="?([^";]+)"?/i)
      const fallbackName = `taskflow_bao_cao_${view}_${month.format('YYYY_MM')}.xlsx`
      const fileName = matchedName?.[1] || fallbackName
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      message.success('Đã xuất báo cáo Excel.')
    } catch (err) {
      let exportMessage = 'Không thể xuất báo cáo Excel.'
      if (err.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await err.response.data.text())
          exportMessage = payload.message || exportMessage
        } catch {
          // Keep the fallback message for non-JSON download errors.
        }
      } else if (err.response?.data?.message) {
        exportMessage = err.response.data.message
      }
      setError(exportMessage)
    } finally {
      setExporting(false)
    }
  }

  const summary = useMemo(() => report?.summary || {}, [report])
  const workItemBreakdown = report?.work_item_breakdown || {}
  const filteredTasks = useMemo(
    () => report?.tasks?.filter((task) => {
      if (taskStatus && task.status !== taskStatus) return false
      if (taskKind === 'MAIN_TASK') return !task.parent_task_id
      if (taskKind === 'SUBTASK') return Boolean(task.parent_task_id)
      return true
    }) || [],
    [report, taskKind, taskStatus],
  )
  const departmentOptions = useMemo(() => {
    const departments = new Map()
    for (const item of report?.assignee_breakdown || []) {
      if (item.department_id) {
        departments.set(
          item.department_id,
          item.department_name || 'Phòng ban chưa xác định',
        )
      }
    }
    return [...departments.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, 'vi'))
  }, [report])
  const filteredAssignees = useMemo(
    () => (report?.assignee_breakdown || []).filter(
      (item) => !assigneeDepartment
        || item.department_id === assigneeDepartment,
    ),
    [assigneeDepartment, report],
  )
  const assigneePages = Math.max(
    1,
    Math.ceil(filteredAssignees.length / ASSIGNEES_PER_PAGE),
  )
  const currentAssigneePage = Math.min(assigneePage, assigneePages)
  const visibleAssignees = filteredAssignees.slice(
    (currentAssigneePage - 1) * ASSIGNEES_PER_PAGE,
    currentAssigneePage * ASSIGNEES_PER_PAGE,
  )
  const stats = useMemo(() => {
    if (!report) return []
    return [
      {
        label: view === 'assignee' ? 'Task được giao' : 'Task đã giao',
        value: view === 'assignee' ? summary.total_assigned_tasks : summary.total_created_tasks,
        icon: <FiTarget />,
        tone: 'overview',
      },
      { label: 'Đã hoàn thành', value: summary.completed_tasks, icon: <FiCheckCircle />, tone: 'completed' },
      { label: 'Đang quá hạn', value: summary.overdue_tasks, icon: <FiAlertCircle />, tone: 'overdue' },
      {
        label: view === 'assignee' ? 'Số lần bị trả lại' : 'Đang chờ duyệt',
        value: view === 'assignee' ? summary.total_rejections : summary.waiting_review_tasks,
        icon: view === 'assignee' ? <FiRefreshCw /> : <FiClock />,
        tone: view === 'assignee' ? 'returned' : 'review',
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
        <div className={styles.headerActions}>
          <DatePicker
            picker="month"
            allowClear={false}
            value={month}
            onChange={(value) => {
              if (!value) return
              setMonth(value)
              setAssigneeDepartment(undefined)
              setAssigneePage(1)
            }}
            format="MM/YYYY"
          />
          <Button
            type="primary"
            icon={<FiDownload />}
            loading={exporting}
            disabled={!report}
            onClick={exportReport}
          >
            Xuất Excel
          </Button>
        </div>
      </header>

      <div className={styles.viewSwitch}>
        <Segmented
          options={views}
          value={view}
          onChange={(value) => {
            setView(value)
            setAssigneeDepartment(undefined)
            setAssigneePage(1)
          }}
          block
        />
      </div>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} />}
      {!report ? !error && <Skeleton active paragraph={{ rows: 9 }} /> : (
        <>
          <section className={styles.statGrid}>
            {stats.map((stat) => (
              <article className={`${styles.statCard} ${styles[stat.tone]}`} key={stat.label}>
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
                  <span data-tone="completed"><small>Hoàn thành</small><strong>{item.data?.completed_tasks || 0}</strong></span>
                  <span data-tone="pending"><small>Đang xử lý</small><strong>{item.data?.active_tasks || 0}</strong></span>
                  <span data-tone="overdue"><small>Quá hạn</small><strong>{item.data?.overdue_tasks || 0}</strong></span>
                  <span data-tone="review"><small>Tỷ lệ</small><strong>{item.data?.completion_rate || 0}%</strong></span>
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
                <span data-tone="pending"><small>Chờ thực hiện</small><strong>{summary.todo_tasks || 0}</strong></span>
                <span data-tone="review"><small>Đang thực hiện</small><strong>{summary.in_progress_tasks || 0}</strong></span>
                <span data-tone="submitted"><small>Đã gửi kết quả</small><strong>{summary.submitted_tasks || 0}</strong></span>
                <span data-tone="overdue"><small>Cần làm lại</small><strong>{summary.rejected_tasks || 0}</strong></span>
              </div>
            </section>
          </div>

          {view === 'assigner' && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><h2>Hiệu suất người nhận việc</h2><p>Tổng hợp các nhân sự bạn đã giao task trong tháng.</p></div>
                <div className={styles.peopleActions}>
                  <Select
                    allowClear
                    value={assigneeDepartment}
                    placeholder="Tất cả phòng ban"
                    options={departmentOptions}
                    onChange={(value) => {
                      setAssigneeDepartment(value)
                      setAssigneePage(1)
                    }}
                    aria-label="Lọc hiệu suất theo phòng ban"
                  />
                  <FiUsers />
                </div>
              </div>
              {!filteredAssignees.length ? <Empty description="Không có nhân sự phù hợp" /> : (
                <>
                  <div className={styles.peopleList}>
                    <div className={styles.peopleHeader}>
                      <span>Nhân sự</span><span>Task chính</span><span>Subtask</span><span>Hoàn thành</span><span>Quá hạn</span><span>Trả lại</span>
                    </div>
                    {visibleAssignees.map((item) => (
                      <div className={styles.personRow} key={item.user_id}>
                        <strong>
                          {item.full_name || 'Nhân sự'}
                          <small>{item.department_name || 'Chưa có phòng ban'}</small>
                        </strong>
                        <span>{item.main_task_count || 0}</span>
                        <span>{item.subtask_count || 0}</span>
                        <span data-tone="completed">{item.completed_tasks}</span>
                        <span data-tone="overdue">{item.overdue_tasks}</span>
                        <span data-tone="returned">{item.total_rejections}</span>
                      </div>
                    ))}
                  </div>
                  {filteredAssignees.length > ASSIGNEES_PER_PAGE && (
                    <div className={styles.pagination}>
                      <Pagination
                        current={currentAssigneePage}
                        pageSize={ASSIGNEES_PER_PAGE}
                        total={filteredAssignees.length}
                        showSizeChanger={false}
                        onChange={setAssigneePage}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Chi tiết công việc</h2><p>{filteredTasks.length} công việc phù hợp.</p></div>
              <div className={styles.detailFilters}>
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
                <Select
                  allowClear
                  value={taskStatus}
                  placeholder="Tất cả trạng thái"
                  options={taskStatuses}
                  onChange={setTaskStatus}
                  aria-label="Lọc chi tiết công việc theo trạng thái"
                />
              </div>
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
                      <small className={styles.taskPeople}>
                        {view === 'assignee' ? (
                          <>Người giao: <b>{task.created_by_name || 'Chưa xác định'}</b></>
                        ) : (
                          <>Người thực hiện: <b>{task.assigned_to_name || 'Chưa xác định'}</b></>
                        )}
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
