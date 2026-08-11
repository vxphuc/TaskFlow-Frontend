import { Alert, Button, DatePicker, Pagination, Progress, Select, Skeleton, Space } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiInbox,
  FiSend,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router'
import { getMyMonthlyReportApi } from '../../api/reportApi'
import {
  getMyAssignedTasksApi,
  getMyCreatedTasksApi,
  getPersonalReviewQueueApi,
  getPersonalTasksApi,
  getTeamTaskOverviewApi,
} from '../../api/taskApi'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusLabel,
  taskStatuses,
} from '../../utils/task'
import styles from './UserDashboardPage.module.css'

export default function UserDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [teamOverview, setTeamOverview] = useState(null)
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamStatus, setTeamStatus] = useState('ACTIVE')
  const [teamDepartment, setTeamDepartment] = useState()
  const [teamAssignee, setTeamAssignee] = useState()
  const [teamMonth, setTeamMonth] = useState(null)
  const [teamPage, setTeamPage] = useState(1)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    const now = new Date()
    setError('')

    try {
      const [
        assignedRes,
        createdRes,
        personalRes,
        reviewRes,
        reportRes,
      ] = await Promise.all([
        getMyAssignedTasksApi(),
        getMyCreatedTasksApi(),
        getPersonalTasksApi(),
        getPersonalReviewQueueApi(),
        getMyMonthlyReportApi(now.getFullYear(), now.getMonth() + 1),
      ])
      setData({
        assigned: assignedRes.data.tasks || [],
        created: createdRes.data.tasks || [],
        createdSubtasks: createdRes.data.created_subtasks || [],
        personal: personalRes.data.tasks || [],
        review: reviewRes.data.tasks || [],
        report: reportRes.data.report || {},
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu tổng quan.')
    }
  }, [])

  const loadTeamOverview = useCallback(async () => {
    setTeamLoading(true)
    try {
      const response = await getTeamTaskOverviewApi({
        status: teamStatus,
        department_id: teamDepartment,
        assignee_id: teamAssignee,
        year: teamMonth?.year(),
        month: teamMonth ? teamMonth.month() + 1 : undefined,
        page: teamPage,
      })
      setTeamOverview(response.data)
      if (response.data.page && response.data.page !== teamPage) {
        setTeamPage(response.data.page)
      }
    } catch (err) {
      setError(
        err.response?.data?.message
        || 'Không thể tải công việc của đội nhóm.',
      )
    } finally {
      setTeamLoading(false)
    }
  }, [teamAssignee, teamDepartment, teamMonth, teamPage, teamStatus])

  useEffect(() => {
    Promise.resolve().then(loadDashboard)
  }, [loadDashboard])

  useEffect(() => {
    Promise.resolve().then(loadTeamOverview)
  }, [loadTeamOverview])

  const refreshDashboard = useCallback(() => {
    loadDashboard()
    loadTeamOverview()
  }, [loadDashboard, loadTeamOverview])

  useRealtimeRefresh(refreshDashboard, 'task')

  const stats = useMemo(() => {
    if (!data) return []
    const createdWork = [...data.created, ...data.createdSubtasks]
    const now = new Date()
    const active = createdWork.filter((task) =>
      ['TODO', 'IN_PROGRESS', 'REJECTED'].includes(task.status),
    ).length
    const waiting = createdWork.filter((task) =>
      ['SUBMITTED', 'REVIEWING'].includes(task.status),
    ).length
    const completed = createdWork.filter((task) => {
      if (task.status !== 'COMPLETED' || !task.completed_at) return false
      const completedAt = new Date(task.completed_at)
      return completedAt.getFullYear() === now.getFullYear()
        && completedAt.getMonth() === now.getMonth()
    }).length
    const overdue = createdWork.filter((task) => (
      task.due_date
      && new Date(task.due_date) < now
      && !['COMPLETED', 'CANCELLED'].includes(task.status)
    )).length
    return [
      { label: 'Cần thực hiện', value: active, note: 'Task đang chờ người nhận xử lý', icon: <FiInbox />, tone: 'pending', view: 'ACTIVE' },
      { label: 'Chờ bạn duyệt', value: waiting, note: 'Kết quả đang chờ duyệt', icon: <FiClock />, tone: 'review', view: 'WAITING_REVIEW' },
      { label: 'Hoàn thành tháng này', value: completed, note: 'Theo thời điểm hoàn thành', icon: <FiCheckCircle />, tone: 'completed', view: 'COMPLETED_MONTH' },
      { label: 'Đang quá hạn', value: overdue, note: 'Cần ưu tiên theo dõi', icon: <FiSend />, tone: 'overdue', view: 'OVERDUE' },
    ]
  }, [data])

  const focusTasks = data
    ? [...data.assigned, ...data.personal]
    .filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status))
    .slice(0, 5)
    : []
  const hasManagementScope = Boolean(teamOverview?.has_management_scope)
  const visibleTasks = hasManagementScope
    ? teamOverview.tasks || []
    : focusTasks
  const completionRate = data?.report.summary?.completion_rate || 0

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>HÔM NAY</span>
          <h1>Chào {user.full_name}</h1>
          <p>Tập trung vào công việc cần xử lý và các kết quả đang chờ phản hồi.</p>
        </div>
        <Space wrap>
          <Button onClick={() => navigate('/app/personal')}>Việc cá nhân</Button>
          <Button type="primary" icon={<FiSend />} onClick={() => navigate('/app/created')}>
            Giao công việc
          </Button>
        </Space>
      </header>

      {error && <Alert type="error" showIcon title={error} className={styles.alert} />}
      {!data ? <Skeleton active paragraph={{ rows: 8 }} /> : (
        <>
          <section className={styles.statGrid}>
            {stats.map((stat) => (
              <button
                type="button"
                className={`${styles.statCard} ${styles[stat.tone]}`}
                key={stat.label}
                onClick={() => navigate(`/app/created?view=${stat.view}`)}
                aria-label={`${stat.label}: ${stat.value}. Xem danh sách việc tôi giao`}
              >
                <span className={styles.statIcon}>{stat.icon}</span>
                <div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div>
              </button>
            ))}
          </section>

          <div className={styles.mainGrid}>
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>{hasManagementScope ? 'Công việc đội nhóm' : 'Việc cần tập trung'}</h2>
                  <p>
                    {hasManagementScope
                      ? 'Theo dõi công việc của cấp dưới và việc liên phòng do đội nhóm giao.'
                      : 'Các task đang chờ bạn thực hiện.'}
                  </p>
                </div>
                {hasManagementScope ? (
                  <span className={styles.taskCount}>
                    <FiUsers /> {teamOverview.total || 0} công việc
                  </span>
                ) : (
                  <Button type="link" onClick={() => navigate('/app/assigned')}>
                    Xem tất cả <FiArrowRight />
                  </Button>
                )}
              </div>

              {hasManagementScope && (
                <div className={styles.teamFilters}>
                  <Select
                    value={teamStatus}
                    onChange={(value) => {
                      setTeamStatus(value)
                      setTeamPage(1)
                    }}
                    aria-label="Lọc theo trạng thái công việc"
                    options={[
                      { value: 'ACTIVE', label: 'Đang cần xử lý' },
                      { value: 'ALL', label: 'Tất cả trạng thái' },
                      ...taskStatuses,
                    ]}
                  />
                  <Select
                    allowClear
                    value={teamDepartment}
                    placeholder="Tất cả phòng ban"
                    aria-label="Lọc theo phòng ban người thực hiện"
                    onChange={(value) => {
                      setTeamDepartment(value)
                      setTeamAssignee(undefined)
                      setTeamPage(1)
                    }}
                    options={(teamOverview.departments || []).map((department) => ({
                      value: department.id,
                      label: department.name,
                    }))}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={teamAssignee}
                    placeholder="Tất cả nhân viên"
                    aria-label="Lọc theo tên nhân viên"
                    onChange={(value) => {
                      setTeamAssignee(value)
                      setTeamPage(1)
                    }}
                    options={(teamOverview.assignees || [])
                      .filter((employee) => (
                        !teamDepartment
                        || employee.department_id === teamDepartment
                      ))
                      .map((employee) => ({
                        value: employee.id,
                        label: `${employee.full_name} · ${employee.department_name}`,
                      }))}
                  />
                  <DatePicker
                    picker="month"
                    allowClear
                    value={teamMonth}
                    format="MM/YYYY"
                    placeholder="Tất cả các tháng"
                    aria-label="Lọc theo tháng giao việc"
                    onChange={(value) => {
                      setTeamMonth(value)
                      setTeamPage(1)
                    }}
                  />
                </div>
              )}

              <div className={styles.taskList}>
                {teamLoading && hasManagementScope ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : visibleTasks.length === 0 ? (
                  <div className={styles.empty}>
                    {hasManagementScope
                      ? 'Không có công việc phù hợp với bộ lọc.'
                      : 'Bạn chưa có công việc cần xử lý.'}
                  </div>
                ) : visibleTasks.map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    className={styles.taskRow}
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                  >
                    <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`} />
                    <span className={styles.taskBody}>
                      <span className={styles.taskTitle}>
                        {hasManagementScope && (
                          <small className={styles.workType}>
                            {task.work_type === 'SUBTASK' ? 'Subtask' : 'Task'}
                          </small>
                        )}
                        <strong>{task.title}</strong>
                      </span>
                      <small>{getPriorityLabel(task.priority)} · Hạn {formatDateTime(task.due_date)}</small>
                      <small className={styles.taskPeople}>
                        {hasManagementScope ? (
                          <span>
                            <FiUsers />
                            Người thực hiện: {task.assigned_to_name || 'Chưa xác định'}
                            {task.assignee_department_name
                              ? ` · ${task.assignee_department_name}`
                              : ''}
                          </span>
                        ) : task.is_personal ? (
                          <span>
                            <FiCheckCircle />
                            {task.requires_review
                              ? `Người duyệt: ${task.reviewer_name || 'Chưa xác định'}`
                              : 'Việc cá nhân không cần duyệt'}
                          </span>
                        ) : (
                          <span><FiSend /> Người giao: {task.created_by_name || 'Chưa xác định'}</span>
                        )}
                        {hasManagementScope && task.parent_task_title && (
                          <span>Thuộc: {task.parent_task_title}</span>
                        )}
                      </small>
                    </span>
                    <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <FiArrowRight />
                  </button>
                ))}
              </div>
              {hasManagementScope && (teamOverview.total || 0) > (teamOverview.per_page || 6) && (
                <div className={styles.teamPagination}>
                  <Pagination
                    current={teamPage}
                    pageSize={teamOverview.per_page || 6}
                    total={teamOverview.total || 0}
                    showSizeChanger={false}
                    onChange={setTeamPage}
                  />
                </div>
              )}
            </section>

            <aside className={styles.performance}>
              <span className={styles.eyebrow}>HIỆU SUẤT CÁ NHÂN</span>
              <h2>Tháng này</h2>
              <Progress
                type="dashboard"
                percent={completionRate}
                strokeColor="#206a37"
                railColor="#e4ebe6"
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
